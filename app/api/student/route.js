export const runtime = "nodejs";

import { cfg, resolveStudent } from "../../lib/auth";
import { fetchPublicSettings } from "../../lib/settings";

// Shared per-person data: profile (grade, interests) and insights. Identity
// comes from the session cookie. A `student` id in the query or body is only
// honoured as a legacy fallback while that row is unclaimed by any account;
// see resolveStudent(). The grove list for a signed-in person now comes from
// GET /api/auth/session, so GET here exists for legacy links only.

export async function GET(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  const me = await resolveStudent(c, new URL(request.url).searchParams.get("student"));
  if (!me) return Response.json({ error: "Not signed in." }, { status: 401 });

  const gRes = await fetch(`${c.rest}/groves?student_id=eq.${encodeURIComponent(me.student_id)}&select=id,name,concepts&order=updated_at.desc`, { headers: c.db, cache: "no-store" });
  if (!gRes.ok) return Response.json({ error: "Database read failed." }, { status: 502 });
  const gRows = await gRes.json();
  const groves = gRows.map((g) => {
    const concepts = Array.isArray(g.concepts) ? g.concepts : [];
    return { id: g.id, name: g.name, treeCount: concepts.length, flourishing: concepts.filter((x) => x.mastery >= 85).length };
  });
  const settings = await fetchPublicSettings(c);
  return Response.json({ student: me.student_id, mode: me.mode, profile: me.profile || {}, insights: Array.isArray(me.insights) ? me.insights : [], groves, settings });
}

export async function PUT(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const me = await resolveStudent(c, body.student);
  if (!me) return Response.json({ error: "Not signed in." }, { status: 401 });
  const student = me.student_id;
  const hasProfile = body.profile && typeof body.profile === "object";
  const hasInsight = body.insight && typeof body.insight === "object" && body.insight.note;
  if (!hasProfile && !hasInsight) return Response.json({ error: "Need profile or insight to write." }, { status: 400 });

  // Read the current row first. Either kind of write, a profile update or an
  // insight append, must never wipe out whichever field the request didn't
  // touch - this used to always send profile:{} on an insight-only write,
  // which would have overwritten grade and interests every time a session
  // completed.
  const cur = await fetch(`${c.rest}/students?student_id=eq.${encodeURIComponent(student)}&select=profile,insights`, { headers: c.db, cache: "no-store" });
  const rows = cur.ok ? await cur.json() : [];
  const row = rows[0] || {};
  const profile = hasProfile ? body.profile : (row.profile || {});
  const insights = Array.isArray(row.insights) ? row.insights : [];
  if (hasInsight) insights.push(body.insight);

  const res = await fetch(`${c.rest}/students?on_conflict=student_id`, {
    method: "POST",
    headers: { ...c.db, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ student_id: student, profile, insights: insights.slice(-30), updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });
  return Response.json({ ok: true });
}
