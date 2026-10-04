import test from "node:test";
import assert from "node:assert/strict";
import { MODELS, DEFAULT_SETTINGS, withDefaults } from "./settings.js";
import { PRICING, estCost } from "./pricing.js";

// A Tuning model with no pricing row would log turns the dashboard prices at
// zero, and a default outside MODELS could never be re-selected from Tuning.

test("every Tuning model has a pricing row", () => {
  for (const m of MODELS) assert.ok(PRICING[m.id], m.id);
});

test("the default model is Sonnet 5.5 and is a Tuning choice", () => {
  assert.equal(DEFAULT_SETTINGS.model, "claude-sonnet-5-5");
  assert.ok(MODELS.some((m) => m.id === DEFAULT_SETTINGS.model));
});

test("withDefaults keeps a known model and falls back for an unknown one", () => {
  assert.equal(withDefaults({ model: "claude-sonnet-5" }).model, "claude-sonnet-5");
  assert.equal(withDefaults({ model: "claude-sonnet-9" }).model, "claude-sonnet-5-5");
  assert.equal(withDefaults(null).model, "claude-sonnet-5-5");
});

test("a Sonnet 5.5 turn is priced", () => {
  // 1000 in, 200 out, 5000 cache read, 800 cache write at $2 / $10 per million
  assert.equal(estCost("claude-sonnet-5-5", 1000, 200, 5000, 800).toFixed(6), "0.007000");
  assert.equal(estCost("claude-sonnet-9", 1000, 200), null);
});
