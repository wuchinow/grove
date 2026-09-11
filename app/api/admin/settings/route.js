export const runtime = "nodejs";

import { cfg, requireAdmin } from "../../../lib/auth";

export async function GET() {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing Supabase settings." }, { status: 500 });
  const me = await requireAdmin(c);
  if (!me) return Response.json({ error: "Not found." }, { status: 404 });

  const r = await fetch(`${c.rest}/settings?id=eq.1&select=fixed_costs,price_per_month`, { headers: c.db, cache: "no-store" });
  if (!r.ok) return Response.json({ error: "Database read failed." }, { status: 502 });
  const rows = await r.json();
  const row = rows[0] || { fixed_costs: { supabase: 13, vercel: 0, domain: 0 }, price_per_month: 4 };
  return Response.json(row);
}

// Read-then-merge, same defensive pattern as every other write route here -
// an edit to price must never wipe fixed_costs, and vice versa.
export async function PUT(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing Supabase settings." }, { status: 500 });
  const me = await requireAdmin(c);
  if (!me) return Response.json({ error: "Not found." }, { status: 404 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const hasCosts = body.fixed_costs && typeof body.fixed_costs === "object";
  const hasPrice = typeof body.price_per_month === "number";
  if (!hasCosts && !hasPrice) return Response.json({ error: "Need fixed_costs or price_per_month to write." }, { status: 400 });

  const cur = await fetch(`${c.rest}/settings?id=eq.1&select=fixed_costs,price_per_month`, { headers: c.db, cache: "no-store" });
  const rows = cur.ok ? await cur.json() : [];
  const row = rows[0] || {};
  const fixed_costs = hasCosts ? body.fixed_costs : (row.fixed_costs || { supabase: 13, vercel: 0, domain: 0 });
  const price_per_month = hasPrice ? body.price_per_month : (row.price_per_month ?? 4);

  const res = await fetch(`${c.rest}/settings?on_conflict=id`, {
    method: "POST",
    headers: { ...c.db, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: 1, fixed_costs, price_per_month, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });
  return Response.json({ ok: true });
}
