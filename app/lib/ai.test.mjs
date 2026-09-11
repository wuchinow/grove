import test from "node:test";
import assert from "node:assert/strict";
import { parseJSON } from "./ai.js";

// Regression test for the tutor bubble rendering raw JSON: parseJSON's
// recovery path (used when the model's JSON fails strict JSON.parse) must
// still extract "message" when the raw text has whitespace variance around
// commas/colons, or a literal unescaped newline inside "message" - not just
// bail to null (which used to make the caller display the raw JSON string).

test("parseJSON recovers the exact failing payload from the bug report", () => {
  const raw = '{"message":"Right. Water wedges between the cellulose fibers and lets them slide past each other, so the reed bends without snapping.\n\nNow, in your own words, why does soaking make grip weaker even though it makes the material more bendable?", "phase":"check", "understanding":"solid", "options":[], "correctOption":""}';
  const j = parseJSON(raw);
  assert.ok(j, "parseJSON should not return null");
  assert.match(j.message, /^Right\. Water wedges/);
  assert.match(j.message, /material more bendable\?$/);
  assert.equal(j.phase, "check");
  assert.equal(j.understanding, "solid");
  assert.deepEqual(j.options, []);
});

test("parseJSON handles compact JSON with no whitespace (fast path)", () => {
  const raw = '{"message":"What is 2 plus 2?","phase":"question","understanding":"unknown","options":["3","4","5"],"correctOption":"4"}';
  const j = parseJSON(raw);
  assert.ok(j);
  assert.equal(j.message, "What is 2 plus 2?");
  assert.equal(j.phase, "question");
  assert.equal(j.understanding, "unknown");
  assert.deepEqual(j.options, ["3", "4", "5"]);
});

test("parseJSON recovers with spaces after colons and commas plus a literal newline", () => {
  const raw = '{"message": "First line.\n\nSecond line?", "phase": "hint", "understanding": "partial", "options": [], "correctOption": ""}';
  assert.throws(() => JSON.parse(raw));
  const j = parseJSON(raw);
  assert.ok(j, "parseJSON should recover instead of returning null");
  assert.equal(j.message, "First line.\n\nSecond line?");
  assert.equal(j.phase, "hint");
  assert.equal(j.understanding, "partial");
});

test("parseJSON handles a literal newline inside \"message\" (the actual JSON.parse-breaking case)", () => {
  const raw = '{"message":"First paragraph.\n\nSecond paragraph, a **question**?","phase":"question","understanding":"unknown","options":[],"correctOption":""}';
  // Sanity: this is exactly the shape that breaks strict JSON.parse.
  assert.throws(() => JSON.parse(raw));
  const j = parseJSON(raw);
  assert.ok(j, "parseJSON should recover instead of returning null");
  assert.equal(j.message, "First paragraph.\n\nSecond paragraph, a **question**?");
  assert.equal(j.phase, "question");
});
