// ---- Tuning settings --------------------------------------------------------
// Shared defaults/validation for the admin Tuning section (Stage 1, Sept 12).
// Columns on the settings singleton row are nullable with no DB default, so
// an empty or partially-set row still behaves exactly like DEFAULT_SETTINGS.
// Imported from both server routes and client components - no Node/browser
// -only APIs here.

// The only models the Tuning section can select. Ids must match a key in
// app/lib/pricing.js PRICING exactly - a mismatch would silently break cost
// estimation and/or fail every Anthropic call once the model is resolved
// server-side (see /api/anthropic/route.js). This is the one place the id
// strings live: the Settings page renders its pills from this list, and the
// PUT route below validates against it.
export const MODELS = [
  { id: "claude-sonnet-5", label: "Sonnet 5" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
];

export const DEFAULT_SETTINGS = {
  model: "claude-sonnet-5",          // must be a MODELS id
  effort: "low",                      // matches the tutor's effort before this setting existed
  starting_trees: 7,
  mastery_threshold: 1,               // sessions per stage; 1 matches behavior before this setting existed
  interest_analogies: true,
  sample_grove: true,
};

export function clampStartingTrees(n) {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(12, Math.max(3, v)) : DEFAULT_SETTINGS.starting_trees;
}

export function clampMasteryThreshold(n) {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(5, Math.max(1, v)) : DEFAULT_SETTINGS.mastery_threshold;
}

export function withDefaults(row) {
  const r = row || {};
  return {
    model: MODELS.some((m) => m.id === r.model) ? r.model : DEFAULT_SETTINGS.model,
    effort: ["low", "medium", "high"].includes(r.effort) ? r.effort : DEFAULT_SETTINGS.effort,
    starting_trees: r.starting_trees != null ? clampStartingTrees(r.starting_trees) : DEFAULT_SETTINGS.starting_trees,
    mastery_threshold: r.mastery_threshold != null ? clampMasteryThreshold(r.mastery_threshold) : DEFAULT_SETTINGS.mastery_threshold,
    interest_analogies: r.interest_analogies != null ? !!r.interest_analogies : DEFAULT_SETTINGS.interest_analogies,
    sample_grove: r.sample_grove != null ? !!r.sample_grove : DEFAULT_SETTINGS.sample_grove,
  };
}

// The subset of settings the client ever needs (boot payload, see
// /api/auth/session and /api/student). model/effort are resolved
// server-side only, in /api/anthropic, and never sent to the client.
export function publicSettings(row) {
  const s = withDefaults(row);
  return {
    starting_trees: s.starting_trees,
    mastery_threshold: s.mastery_threshold,
    interest_analogies: s.interest_analogies,
    sample_grove: s.sample_grove,
  };
}

// Shared by both boot routes (/api/auth/session for signed-in/guest,
// /api/student for legacy ?student= links) so there's one place that reads
// the settings row for the client payload. `c` is the cfg() object from
// app/lib/auth.js ({rest, db, ...}); this runs on every boot for every
// visitor, which is fine at beta scale - a short in-memory cache is the
// first thing to add if it ever shows up in timing.
export async function fetchPublicSettings(c) {
  const r = await fetch(`${c.rest}/settings?id=eq.1&select=starting_trees,mastery_threshold,interest_analogies,sample_grove`, { headers: c.db, cache: "no-store" });
  const rows = r.ok ? await r.json() : [];
  return publicSettings(rows[0]);
}
