export const runtime = "nodejs";

import { cfg, requireAdmin } from "../../../lib/auth";
import { estCost } from "../../../lib/pricing";

// Whole-app rollup for the dashboard's top row, plus a 30-day usage/cost
// window from the turns table (Build 2).
export async function GET() {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing Supabase settings." }, { status: 500 });
  const me = await requireAdmin(c);
  if (!me) return Response.json({ error: "Not found." }, { status: 404 });

  const now = Date.now(), day = 86400000;
  const cutoff = new Date(now - 30 * day).toISOString();

  const [sRes, gRes, tRes] = await Promise.all([
    fetch(`${c.rest}/students?select=student_id,auth_user_id,created_at,updated_at`, { headers: c.db, cache: "no-store" }),
    fetch(`${c.rest}/groves?select=student_id,concepts,updated_at`, { headers: c.db, cache: "no-store" }),
    fetch(`${c.rest}/turns?created_at=gte.${encodeURIComponent(cutoff)}&select=created_at,kind,model,input_tokens,output_tokens,ok`, { headers: c.db, cache: "no-store" }),
  ]);
  if (!sRes.ok || !gRes.ok) return Response.json({ error: "Database read failed." }, { status: 502 });
  const students = await sRes.json();
  const groves = await gRes.json();
  const turns = tRes.ok ? await tRes.json() : []; // tolerate a deploy where the turns table isn't live yet

  const within = (iso, days) => iso && now - Date.parse(iso) < days * day;
  const all = groves.flatMap((g) => (Array.isArray(g.concepts) ? g.concepts : []));
  const buckets = [0, 0, 0, 0, 0];           // mastery 0-19, 20-39, 40-59, 60-79, 80-100
  for (const x of all) buckets[Math.min(4, Math.floor((x.mastery || 0) / 20))] += 1;
  const activeIds = (days) => new Set(groves.filter((g) => within(g.updated_at, days)).map((g) => g.student_id)).size;

  // Usage/cost, last 30 days. Cost is an estimate from list pricing (see
  // /lib/pricing.js) - actual billing may run a little lower with caching,
  // which Grove doesn't currently use.
  const costOf = (t) => estCost(t.model, t.input_tokens, t.output_tokens) || 0;
  const sumWithin = (days) => {
    const rows = turns.filter((t) => within(t.created_at, days));
    return {
      calls: rows.length,
      inputTokens: rows.reduce((n, t) => n + (t.input_tokens || 0), 0),
      outputTokens: rows.reduce((n, t) => n + (t.output_tokens || 0), 0),
      cost: rows.reduce((n, t) => n + costOf(t), 0),
    };
  };
  const byKind = {};
  for (const t of turns) {
    const k = t.kind || "tutor";
    if (!byKind[k]) byKind[k] = { calls: 0, cost: 0 };
    byKind[k].calls += 1;
    byKind[k].cost += costOf(t);
  }

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
    mastery: { buckets, flourishing: all.filter((x) => x.mastery >= 85).length, gettingThere: all.filter((x) => x.mastery >= 40 && x.mastery < 85).length, needsWork: all.filter((x) => x.mastery < 40).length, untouched: all.filter((x) => !x.reviews).length },
    struggling: all.filter((x) => (x.reviews || 0) > 0 && x.mastery < 40).sort((a, b) => a.mastery - b.mastery).slice(0, 8).map((x) => ({ name: x.name, mastery: x.mastery, reviews: x.reviews })),
    usage: {
      today: sumWithin(1),
      week: sumWithin(7),
      month: sumWithin(30),
      byKind,
      failedCalls: turns.filter((t) => !t.ok).length,
    },
  });
}
