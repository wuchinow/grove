export const runtime = "nodejs";

import { cfg, requireAdmin } from "../../../lib/auth";

// Whole-app rollup for the dashboard's top row. Everything here is derived
// from the two tables that exist today; per-turn metrics wait for Build 2.
export async function GET() {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing Supabase settings." }, { status: 500 });
  const me = await requireAdmin(c);
  if (!me) return Response.json({ error: "Not found." }, { status: 404 });

  const [sRes, gRes] = await Promise.all([
    fetch(`${c.rest}/students?select=student_id,auth_user_id,created_at,updated_at`, { headers: c.db, cache: "no-store" }),
    fetch(`${c.rest}/groves?select=student_id,concepts,updated_at`, { headers: c.db, cache: "no-store" }),
  ]);
  if (!sRes.ok || !gRes.ok) return Response.json({ error: "Database read failed." }, { status: 502 });
  const students = await sRes.json();
  const groves = await gRes.json();

  const now = Date.now(), day = 86400000;
  const within = (iso, days) => iso && now - Date.parse(iso) < days * day;
  const all = groves.flatMap((g) => (Array.isArray(g.concepts) ? g.concepts : []));
  const buckets = [0, 0, 0, 0, 0];           // mastery 0-19, 20-39, 40-59, 60-79, 80-100
  for (const x of all) buckets[Math.min(4, Math.floor((x.mastery || 0) / 20))] += 1;
  const activeIds = (days) => new Set(groves.filter((g) => within(g.updated_at, days)).map((g) => g.student_id)).size;

  return Response.json({
    // Who is looking. Lets the dashboard say "signed in as X" and mark that
    // row in the table, so it is never ambiguous whose admin session this is.
    me: { student_id: me.student_id, username: me.username, role: me.role },
    students: students.length,
    claimed: students.filter((s) => s.auth_user_id).length,
    newThisWeek: students.filter((s) => within(s.created_at, 7)).length,
    groves: groves.length,
    concepts: all.length,
    sessions: all.reduce((n, x) => n + (x.days || 0), 0),
    activeToday: activeIds(1),
    activeWeek: activeIds(7),
    activeMonth: activeIds(30),
    mastery: { buckets, flourishing: all.filter((x) => x.mastery >= 85).length, needsWork: all.filter((x) => x.mastery < 40).length, untouched: all.filter((x) => !x.reviews).length },
    struggling: all.filter((x) => (x.reviews || 0) > 0 && x.mastery < 40).sort((a, b) => a.mastery - b.mastery).slice(0, 8).map((x) => ({ name: x.name, mastery: x.mastery, reviews: x.reviews })),
  });
}
