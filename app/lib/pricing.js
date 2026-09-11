// ---- Model pricing ----------------------------------------------------------
// $ per million tokens, list price, as of Sept 2026. Update this table if a
// new model gets wired into callAPI (see app/lib/ai.js) - the admin
// dashboard's cost estimate reads from here. This is an estimate: it doesn't
// account for batch discounts, which Grove doesn't use. It does account for
// prompt caching (see estCost below) - callAPI has cached system/message
// breakpoints since Stage 1.
export const PRICING = {
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  "claude-sonnet-5": { input: 2, output: 10 },
};

// Cache reads are priced at 0.1x the model's input rate, cache writes at
// 1.25x - both against the same per-million input price, per Anthropic's
// published cache economics.
export function estCost(model, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens) {
  const p = PRICING[model];
  if (!p) return null; // unknown model - don't silently misprice it
  return ((inputTokens || 0) / 1e6) * p.input
    + ((outputTokens || 0) / 1e6) * p.output
    + ((cacheReadTokens || 0) / 1e6) * p.input * 0.1
    + ((cacheCreationTokens || 0) / 1e6) * p.input * 1.25;
}
