// ---- Model pricing ----------------------------------------------------------
// $ per million tokens, list price, as of Sept 2026. Update this table if a
// new model gets wired into callAPI (see app/lib/ai.js) - the admin
// dashboard's cost estimate reads from here. This is an estimate: it doesn't
// account for prompt caching or batch discounts, neither of which Grove
// currently uses.
export const PRICING = {
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};

export function estCost(model, inputTokens, outputTokens) {
  const p = PRICING[model];
  if (!p) return null; // unknown model - don't silently misprice it
  return ((inputTokens || 0) / 1e6) * p.input + ((outputTokens || 0) / 1e6) * p.output;
}
