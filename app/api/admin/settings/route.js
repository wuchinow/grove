export const runtime = "nodejs";

import { cfg, requireAdmin } from "../../../lib/auth";
import { withDefaults, MODELS } from "../../../lib/settings";

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

  const r = await fetch(`${c.rest}/settings?id=eq.1&select=fixed_costs,price_per_month,model,effort,starting_trees,mastery_threshold,interest_analogies,sample_grove`, { headers: c.db, cache: "no-store" });
  if (!r.ok) return Response.json({ error: "Database read failed." }, { status: 502 });
  const rows = await r.json();
  const row = rows[0] || {};
  const price_per_month = row.price_per_month ?? 4;
  const tuning = withDefaults(row);

  const logRes = await fetch(`${c.rest}/settings_log?select=setting,old_value,new_value,changed_by,created_at&order=created_at.desc&limit=50`, { headers: c.db, cache: "no-store" });
  const changeLog = logRes.ok ? await logRes.json() : [];

  // Migrate on first read: the old shape was a fixed {supabase,vercel,domain}
  // object (or nothing yet). Once it's already a list, leave it alone.
  if (Array.isArray(row.fixed_costs)) return Response.json({ fixed_costs: row.fixed_costs, price_per_month, tuning, changeLog });

  await fetch(`${c.rest}/settings?on_conflict=id`, {
    method: "POST",
    headers: { ...c.db, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: 1, fixed_costs: SEED_INFRASTRUCTURE, price_per_month, updated_at: new Date().toISOString() }),
  });
  return Response.json({ fixed_costs: SEED_INFRASTRUCTURE, price_per_month, tuning, changeLog });
}

// Server-side validation mirroring app/lib/settings.js's clamping, but
// returning null per-field on anything unrecognized instead of silently
// substituting a default - a bad PUT should be rejected, not quietly
// coerced into a value the admin didn't ask for.
function cleanTuning(t) {
  if (!t || typeof t !== "object") return null;
  const out = {};
  if (t.model !== undefined) {
    if (!MODELS.some((m) => m.id === t.model)) return null;
    out.model = t.model;
  }
  if (t.effort !== undefined) {
    if (!["low", "medium", "high"].includes(t.effort)) return null;
    out.effort = t.effort;
  }
  if (t.starting_trees !== undefined) {
    const v = Math.round(Number(t.starting_trees));
    if (!Number.isFinite(v) || v < 3 || v > 12) return null;
    out.starting_trees = v;
  }
  if (t.mastery_threshold !== undefined) {
    const v = Math.round(Number(t.mastery_threshold));
    if (!Number.isFinite(v) || v < 1 || v > 5) return null;
    out.mastery_threshold = v;
  }
  if (t.interest_analogies !== undefined) out.interest_analogies = !!t.interest_analogies;
  if (t.sample_grove !== undefined) out.sample_grove = !!t.sample_grove;
  return out;
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
  const cleanedTuning = body.tuning !== undefined ? cleanTuning(body.tuning) : undefined;
  if (body.tuning !== undefined && cleanedTuning === null) return Response.json({ error: "Invalid tuning value." }, { status: 400 });
  const hasCosts = cleanedCosts !== undefined;
  const hasPrice = typeof body.price_per_month === "number";
  const hasTuning = cleanedTuning !== undefined && Object.keys(cleanedTuning).length > 0;
  if (!hasCosts && !hasPrice && !hasTuning) return Response.json({ error: "Need fixed_costs, price_per_month, or tuning to write." }, { status: 400 });

  const cur = await fetch(`${c.rest}/settings?id=eq.1&select=fixed_costs,price_per_month,model,effort,starting_trees,mastery_threshold,interest_analogies,sample_grove`, { headers: c.db, cache: "no-store" });
  const rows = cur.ok ? await cur.json() : [];
  const row = rows[0] || {};
  const fixed_costs = hasCosts ? cleanedCosts : (Array.isArray(row.fixed_costs) ? row.fixed_costs : SEED_INFRASTRUCTURE);
  const price_per_month = hasPrice ? body.price_per_month : (row.price_per_month ?? 4);
  const currentTuning = withDefaults(row);
  const nextTuning = { ...currentTuning, ...(hasTuning ? cleanedTuning : {}) };

  const res = await fetch(`${c.rest}/settings?on_conflict=id`, {
    method: "POST",
    headers: { ...c.db, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: 1, fixed_costs, price_per_month, ...nextTuning, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });

  // Log only the tuning fields that actually changed - a Save with no diff
  // (or one that only touched fixed_costs/price) shouldn't add log noise.
  if (hasTuning) {
    const entries = Object.keys(cleanedTuning)
      .filter((k) => String(currentTuning[k]) !== String(cleanedTuning[k]))
      .map((k) => ({ setting: k, old_value: String(currentTuning[k]), new_value: String(cleanedTuning[k]), changed_by: me.student_id }));
    if (entries.length) {
      await fetch(`${c.rest}/settings_log`, {
        method: "POST",
        headers: { ...c.db, Prefer: "return=minimal" },
        body: JSON.stringify(entries),
      }).catch(() => {});
    }
  }

  return Response.json({ ok: true });
}
