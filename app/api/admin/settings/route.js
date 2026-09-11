export const runtime = "nodejs";

import { cfg, requireAdmin } from "../../../lib/auth";

// Fixed costs as real line items, decided Sept 11 for monetization prep -
// see the roadmap. Deterministic ids (not random) so the one-time migration
// below is stable and debuggable. Tooling starts empty; David fills it in
// later from Settings. Metered (Anthropic, from `turns`) is never stored
// here - Financials computes that separately, unchanged.
const SEED_INFRASTRUCTURE = [
  { id: "supabase-pro", name: "Supabase Pro org fee", amount: 5.00, group: "Infrastructure", note: "one-fifth of $25" },
  { id: "supabase-compute", name: "Supabase Micro compute", amount: 9.81, group: "Infrastructure", note: "$0.01344/hr, full month" },
  { id: "supabase-credit", name: "Supabase compute credit", amount: -2.00, group: "Infrastructure", note: "one-fifth of $10" },
  { id: "vercel", name: "Vercel Hobby", amount: 0, group: "Infrastructure", note: "" },
  { id: "github", name: "GitHub", amount: 0, group: "Infrastructure", note: "" },
  { id: "google-oauth", name: "Google Cloud OAuth", amount: 0, group: "Infrastructure", note: "" },
  { id: "resend", name: "Resend", amount: 0, group: "Infrastructure", note: "free tier" },
  { id: "domain", name: "Domain", amount: 0, group: "Infrastructure", note: "none yet" },
  { id: "supadata", name: "Supadata", amount: 0, group: "Infrastructure", note: "not until YouTube ships" },
];

export async function GET() {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing Supabase settings." }, { status: 500 });
  const me = await requireAdmin(c);
  if (!me) return Response.json({ error: "Not found." }, { status: 404 });

  const r = await fetch(`${c.rest}/settings?id=eq.1&select=fixed_costs,price_per_month`, { headers: c.db, cache: "no-store" });
  if (!r.ok) return Response.json({ error: "Database read failed." }, { status: 502 });
  const rows = await r.json();
  const row = rows[0] || {};
  const price_per_month = row.price_per_month ?? 4;

  // Migrate on first read: the old shape was a fixed {supabase,vercel,domain}
  // object (or nothing yet). Once it's already a list, leave it alone.
  if (Array.isArray(row.fixed_costs)) return Response.json({ fixed_costs: row.fixed_costs, price_per_month });

  await fetch(`${c.rest}/settings?on_conflict=id`, {
    method: "POST",
    headers: { ...c.db, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: 1, fixed_costs: SEED_INFRASTRUCTURE, price_per_month, updated_at: new Date().toISOString() }),
  });
  return Response.json({ fixed_costs: SEED_INFRASTRUCTURE, price_per_month });
}

function cleanRows(rows) {
  if (!Array.isArray(rows)) return null;
  const cleaned = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") return null;
    const name = String(r.name || "").trim().slice(0, 80);
    const amount = Number(r.amount);
    const group = r.group === "Tooling" ? "Tooling" : "Infrastructure";
    if (!name || !Number.isFinite(amount)) return null;
    cleaned.push({ id: String(r.id || "").slice(0, 60) || `row-${cleaned.length}`, name, amount, group, note: String(r.note || "").slice(0, 200) });
  }
  return cleaned;
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
  const cleanedCosts = body.fixed_costs !== undefined ? cleanRows(body.fixed_costs) : undefined;
  if (body.fixed_costs !== undefined && cleanedCosts === null) return Response.json({ error: "Each cost row needs a name and a valid amount." }, { status: 400 });
  const hasCosts = cleanedCosts !== undefined;
  const hasPrice = typeof body.price_per_month === "number";
  if (!hasCosts && !hasPrice) return Response.json({ error: "Need fixed_costs or price_per_month to write." }, { status: 400 });

  const cur = await fetch(`${c.rest}/settings?id=eq.1&select=fixed_costs,price_per_month`, { headers: c.db, cache: "no-store" });
  const rows = cur.ok ? await cur.json() : [];
  const row = rows[0] || {};
  const fixed_costs = hasCosts ? cleanedCosts : (Array.isArray(row.fixed_costs) ? row.fixed_costs : SEED_INFRASTRUCTURE);
  const price_per_month = hasPrice ? body.price_per_month : (row.price_per_month ?? 4);

  const res = await fetch(`${c.rest}/settings?on_conflict=id`, {
    method: "POST",
    headers: { ...c.db, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: 1, fixed_costs, price_per_month, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });
  return Response.json({ ok: true });
}
