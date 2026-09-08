export const runtime = "nodejs";

import { cfg, requireAdmin } from "../../../lib/auth";

// Every student with a per-person rollup of their groves. Admin only; a
// non-admin gets 404 rather than 403 so the route doesn't advertise itself.
export async function GET() {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing Supabase settings." }, { status: 500 });
  if (!(await requireAdmin(c))) return Response.json({ error: "Not found." }, { status: 404 });

  const [sRes, gRes] = await Promise.all([
    fetch(`${c.rest}/students?select=student_id,username,email,role,auth_user_id,profile,insights,created_at,updated_at&order=updated_at.desc`, { headers: c.db, cache: "no-store" }),
    fetch(`${c.rest}/groves?select=id,student_id,name,concepts,updated_at&order=updated_at.desc`, { headers: c.db, cache: "no-store" }),
  ]);
  if (!sRes.ok || !gRes.ok) return Response.json({ error: "Database read failed." }, { status: 502 });
  const students = await sRes.json();
  const groves = await gRes.json();

  const byStudent = {};
  for (const g of groves) {
    const list = Array.isArray(g.concepts) ? g.concepts : [];
    const b = byStudent[g.student_id] || (byStudent[g.student_id] = { groves: [], concepts: 0, sessions: 0, flourishing: 0, gettingThere: 0, needsWork: 0, lastActive: null });
    b.groves.push({ id: g.id, name: g.name, concepts: list.length, sessions: list.reduce((n, x) => n + (x.days || 0), 0), updated_at: g.updated_at });
    b.concepts += list.length;
    b.sessions += list.reduce((n, x) => n + (x.days || 0), 0);
    b.flourishing += list.filter((x) => x.mastery >= 85).length;
    // 40-84 sits in neither extreme. Counting it explicitly means the three
    // columns add up to the concept total instead of quietly losing rows.
    b.gettingThere += list.filter((x) => x.mastery >= 40 && x.mastery < 85).length;
    b.needsWork += list.filter((x) => x.mastery < 40).length;
    if (!b.lastActive || g.updated_at > b.lastActive) b.lastActive = g.updated_at;
  }

  // Groves whose student_id has no students row at all: orphaned data, worth
  // surfacing so it can be attached to someone.
  const known = new Set(students.map((s) => s.student_id));
  const orphans = Object.keys(byStudent).filter((id) => !known.has(id)).map((id) => ({ student_id: id, ...byStudent[id] }));

  return Response.json({
    students: students.map((s) => ({
      student_id: s.student_id,
      username: s.username,
      email: s.email,
      role: s.role,
      claimed: !!s.auth_user_id,
      grade: (s.profile && s.profile.grade) || "",
      interests: (s.profile && Array.isArray(s.profile.interests)) ? s.profile.interests : [],
      insights: Array.isArray(s.insights) ? s.insights : [],
      created_at: s.created_at,
      updated_at: s.updated_at,
      ...(byStudent[s.student_id] || { groves: [], concepts: 0, sessions: 0, flourishing: 0, gettingThere: 0, needsWork: 0, lastActive: null }),
    })),
    orphans,
  });
}
