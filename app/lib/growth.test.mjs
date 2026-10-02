import test from "node:test";
import assert from "node:assert/strict";
import { STAGE_NAMES, STAGE_MAX, stageOf, stageName, nextStageLine } from "./growth.js";
import { growthLabel } from "./ai.js";

// Growth is height only: one completed session per stage, eight states (a
// planted seed mark, then seven tree stages), seven sessions to full size.

test("stageOf is the session count, capped at 7", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map(stageOf), [0, 1, 2, 3, 4, 5, 6, 7, 7]);
  assert.equal(stageOf(40), 7);
});

test("stageOf treats a missing or broken count as just planted", () => {
  for (const bad of [undefined, null, NaN, "", "abc", -1, -0.5]) assert.equal(stageOf(bad), 0, String(bad));
  assert.equal(stageOf("3"), 3);
  assert.equal(stageOf(2.9), 2);
});

test("there are eight states and seven sessions reach the last one", () => {
  assert.equal(STAGE_NAMES.length, 8);
  assert.equal(STAGE_MAX, 7);
});

test("the stage names, 0 to 7", () => {
  assert.deepEqual(STAGE_NAMES, ["Planted", "Sprout", "Seedling", "Sapling", "Young tree", "Growing tree", "Tall tree", "Full grown"]);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map(stageName),
    ["Planted", "Sprout", "Seedling", "Sapling", "Young tree", "Growing tree", "Tall tree", "Full grown", "Full grown"]);
});

test("growthLabel is the stage name and ignores everything but the session count", () => {
  assert.equal(growthLabel(0), "Planted");
  assert.equal(growthLabel(3), "Sapling");
  // A high-mastery tree used to read "Flourishing" whatever its height.
  assert.equal(growthLabel(1, 95), "Sprout");
  // The retired setting used to divide the session count.
  assert.equal(growthLabel(4, 50, 2), "Young tree");
});

test("nextStageLine names the next stage, then full size, then stops asking", () => {
  assert.equal(nextStageLine(0), "Finish one more session to grow into a sprout.");
  assert.equal(nextStageLine(3), "Finish one more session to grow into a young tree.");
  assert.equal(nextStageLine(5), "Finish one more session to grow into a tall tree.");
  assert.equal(nextStageLine(6), "Finish one more session to reach full size.");
  assert.equal(nextStageLine(7), "Full grown. Come back to it whenever you want.");
  assert.equal(nextStageLine(8), "Full grown. Come back to it whenever you want.");
});
