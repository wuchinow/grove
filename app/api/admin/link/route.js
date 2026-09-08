export const runtime = "nodejs";

import { cfg, cleanId, requireAdmin, studentById } from "../../../lib/auth";

// Attach an unclaimed student record (its groves and insights) to an account.
// The backstop for a beta user who signed up under a different name: their
// old rows move under the new student_id and the old record goes away.
export async function POST(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing Supabase settings." }, { status: 500 });
  if (!(await requireAdmin(c))) return Response.json({ error: "Not found." }, { status: 404 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const from = cleanId(body.from), to = cleanId(body.to);
  if (!from || !to || from === to) return Response.json({ error: "Need distinct from and to ids." }, { status: 400 });

  const src = await studentById(c, from);
  const dst = await studentById(c, to);
  if (!dst || !dst.auth_user_id) return Response.json({ error: "Target must be a claimed account." }, { status: 400 });
  if (src && src.auth_user_id) return Response.json({ error: "Source is already claimed by an account." }, { status: 409 });

  const mv = await fetch(`${c.rest}/groves?student_id=eq.${encodeURIComponent(from)}`, {
    method: "PATCH", headers: { ...c.db, Prefer: "return=minimal" },
    body: JSON.stringify({ student_id: to, updated_at: new Date().toISOString() }),
  });
  if (!mv.ok) return Response.json({ error: "Couldn't move groves." }, { status: 502 });

  if (src) {
    const merged = [...(Array.isArray(dst.insights) ? dst.insights : []), ...(Array.isArray(src.insights) ? src.insights : [])].slice(-30);
    const profile = dst.profile && dst.profile.grade ? dst.profile : (src.profile || {});
    await fetch(`${c.rest}/students?student_id=eq.${encodeURIComponent(to)}`, {
      method: "PATCH", headers: { ...c.db, Prefer: "return=minimal" },
      body: JSON.stringify({ profile, insights: merged, updated_at: new Date().toISOString() }),
    });
    await fetch(`${c.rest}/students?student_id=eq.${encodeURIComponent(from)}`, { method: "DELETE", headers: { ...c.db, Prefer: "return=minimal" } });
  }
  return Response.json({ ok: true });
}
