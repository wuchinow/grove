export const runtime = "nodejs";

import { cfg, resolveStudent } from "../../lib/auth";

// Records a finished Snake session: a best-effort turns row (kind "game")
// so admin can see whether it displaces study time, plus a best-score
// update on the student profile when the new score beats the stored one.
// Guests never reach the Play screen (no entry point in the account menu),
// so there's always a student to resolve here.
export async function POST(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing Supabase settings." }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const me = await resolveStudent(c, body.student);
  if (!me) return Response.json({ error: "Not signed in." }, { status: 401 });
  const score = Number.isFinite(body.score) ? Math.max(0, Math.round(body.score)) : 0;

  logGameTurn(c, me.student_id).catch(() => {});

  const best = (me.profile && me.profile.snakeBest) || 0;
  if (score <= best) return Response.json({ ok: true, best });

  // Read-then-write, same as /api/student's PUT: never send a partial
  // profile or drop insights on a write that only meant to touch one field.
  const profile = { ...(me.profile || {}), snakeBest: score };
  const res = await fetch(`${c.rest}/students?on_conflict=student_id`, {
    method: "POST",
    headers: { ...c.db, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ student_id: me.student_id, profile, insights: Array.isArray(me.insights) ? me.insights : [], updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });
  return Response.json({ ok: true, best: score });
}

// input_tokens/output_tokens stay 0 deliberately - /api/admin/stats sums
// those columns for the cost dashboard's token totals, and a game score
// doesn't belong mixed into that metric.
async function logGameTurn(c, studentId) {
  await fetch(`${c.rest}/turns`, {
    method: "POST",
    headers: { ...c.db, Prefer: "return=minimal" },
    body: JSON.stringify({ student_id: studentId, kind: "game", model: "snake", input_tokens: 0, output_tokens: 0, ok: true }),
  });
}
