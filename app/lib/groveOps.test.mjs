import test from "node:test";
import assert from "node:assert/strict";
import { applyOps, applyWithRetry, nextMastery, MAX_CONCEPTS, MAX_OPS } from "./groveOps.js";

// Regression tests for the grove-wipe bug class (Sep 8, Sep 11): a client
// holding a stale or empty copy of a grove must only ever be able to change
// the concept it names, never replace the grove.

const tree = (id, over = {}) => ({ id, name: `Concept ${id}`, note: "", attempt: "", mastery: 0, days: 0, reviews: 0, ...over });
const grove = (n, name = "Biology") => ({ name, concepts: Array.from({ length: n }, (_, i) => tree(`c${i + 1}`, { mastery: 10 * (i + 1) })) });

test("a stale client that knew one tree removes it from an eight-tree row: seven remain", () => {
  const row = grove(8);
  const out = applyOps(row, [{ op: "remove", concept: "c1" }]);
  assert.equal(out.ok, true);
  assert.equal(out.concepts.length, 7);
  assert.deepEqual(out.concepts, row.concepts.slice(1));
});

test("a mastery op leaves the other nine concepts exactly as they were", () => {
  const row = grove(10);
  const out = applyOps(row, [{ op: "mastery", concept: "c4", value: 64 }]);
  assert.equal(out.concepts.length, 10);
  assert.equal(out.concepts[3].mastery, 64);
  assert.deepEqual(out.concepts.filter((c) => c.id !== "c4"), row.concepts.filter((c) => c.id !== "c4"));
});

test("an op for a concept the row doesn't have changes nothing", () => {
  const row = grove(3);
  const out = applyOps(row, [{ op: "mastery", concept: "gone", value: 90 }, { op: "session", concept: "gone", opId: "a" }, { op: "remove", concept: "gone" }]);
  assert.equal(out.ok, true);
  assert.equal(out.changed, false);
  assert.equal(out.skipped, 3);
  assert.deepEqual(out.concepts, row.concepts);
});

test("mastery is rounded and clamped to 0-100", () => {
  const row = grove(3);
  const out = applyOps(row, [{ op: "mastery", concept: "c1", value: 150 }, { op: "mastery", concept: "c2", value: -5 }, { op: "mastery", concept: "c3", value: 63.6 }]);
  assert.deepEqual(out.concepts.map((c) => c.mastery), [100, 0, 64]);
});

test("a mastery value that isn't a finite number is skipped", () => {
  const row = grove(1);
  for (const value of ["80", NaN, Infinity, null, undefined]) {
    const out = applyOps(row, [{ op: "mastery", concept: "c1", value }]);
    assert.equal(out.changed, false, `value ${String(value)}`);
    assert.equal(out.concepts[0].mastery, 10);
  }
});

test("a session op increments days and reviews once", () => {
  const out = applyOps(grove(2), [{ op: "session", concept: "c2", opId: "s1" }]);
  assert.equal(out.concepts[1].days, 1);
  assert.equal(out.concepts[1].reviews, 1);
  assert.equal(out.concepts[0].days, 0);
});

test("a repeated session opId is skipped, a new one counts", () => {
  const first = applyOps(grove(1), [{ op: "session", concept: "c1", opId: "s1" }]);
  const again = applyOps({ name: first.name, concepts: first.concepts }, [{ op: "session", concept: "c1", opId: "s1" }]);
  assert.equal(again.changed, false);
  assert.equal(again.concepts[0].days, 1);
  const sameBatch = applyOps(grove(1), [{ op: "session", concept: "c1", opId: "s1" }, { op: "session", concept: "c1", opId: "s1" }]);
  assert.equal(sameBatch.concepts[0].days, 1);
  const next = applyOps({ name: first.name, concepts: first.concepts }, [{ op: "session", concept: "c1", opId: "s2" }]);
  assert.equal(next.concepts[0].days, 2);
  assert.equal(next.concepts[0].reviews, 2);
});

test("a session op with no opId is skipped", () => {
  const out = applyOps(grove(1), [{ op: "session", concept: "c1" }, { op: "session", concept: "c1", opId: "" }]);
  assert.equal(out.changed, false);
  assert.equal(out.skipped, 2);
});

test("a session op treats missing days and reviews as zero", () => {
  const out = applyOps({ name: "Old", concepts: [{ id: "c1", name: "Old concept", mastery: 40 }] }, [{ op: "session", concept: "c1", opId: "s1" }]);
  assert.equal(out.concepts[0].days, 1);
  assert.equal(out.concepts[0].reviews, 1);
});

test("removing every tree one at a time reaches an empty grove", () => {
  const out = applyOps(grove(2), [{ op: "remove", concept: "c1" }, { op: "remove", concept: "c2" }]);
  assert.equal(out.ok, true);
  assert.deepEqual(out.concepts, []);
});

test("clear empties the grove and keeps its name", () => {
  const out = applyOps(grove(5), [{ op: "clear" }]);
  assert.deepEqual(out.concepts, []);
  assert.equal(out.name, "Biology");
  assert.equal(applyOps({ name: "Empty", concepts: [] }, [{ op: "clear" }]).changed, false);
});

test("rename trims, caps at 60 characters, and never touches concepts", () => {
  const row = grove(3);
  const out = applyOps(row, [{ op: "rename", name: `  ${"x".repeat(80)}  ` }]);
  assert.equal(out.name, "x".repeat(60));
  assert.deepEqual(out.concepts, row.concepts);
  const blank = applyOps(row, [{ op: "rename", name: "   " }]);
  assert.equal(blank.name, "Biology");
  assert.equal(blank.changed, false);
});

test("append adds to the row's own concepts, whatever the client believed", () => {
  const row = grove(8);
  const out = applyOps(row, [{ op: "append", concepts: [tree("n1"), tree("n2")] }]);
  assert.equal(out.concepts.length, 10);
  assert.deepEqual(out.concepts.slice(0, 8), row.concepts);
});

test("a re-sent append doesn't duplicate", () => {
  const first = applyOps(grove(2), [{ op: "append", concepts: [tree("n1")] }]);
  const again = applyOps({ name: first.name, concepts: first.concepts }, [{ op: "append", concepts: [tree("n1"), tree("n1")] }]);
  assert.equal(again.changed, false);
  assert.equal(again.concepts.length, 3);
});

test("append skips entries with no id and refuses to pass the concept cap", () => {
  const out = applyOps(grove(1), [{ op: "append", concepts: [null, "x", { name: "no id" }, tree("n1")] }]);
  assert.equal(out.concepts.length, 2);
  const full = { name: "Full", concepts: Array.from({ length: MAX_CONCEPTS }, (_, i) => tree(`f${i}`)) };
  const over = applyOps(full, [{ op: "append", concepts: [tree("one-more")] }]);
  assert.equal(over.ok, false);
});

test("ops apply in order", () => {
  const out = applyOps(grove(1), [{ op: "append", concepts: [tree("n1")] }, { op: "mastery", concept: "n1", value: 64 }, { op: "session", concept: "n1", opId: "s1" }, { op: "remove", concept: "c1" }]);
  assert.deepEqual(out.concepts, [tree("n1", { mastery: 64, days: 1, reviews: 1, lastOp: "s1" })]);
});

test("a malformed op is skipped without blocking the ones after it", () => {
  const out = applyOps(grove(2), [null, "clear", { op: "explode" }, {}, { op: "mastery", concept: "c2", value: 77 }]);
  assert.equal(out.ok, true);
  assert.equal(out.skipped, 4);
  assert.equal(out.concepts[1].mastery, 77);
});

test("a batch that isn't a list, or is too long, is refused whole", () => {
  assert.equal(applyOps(grove(1), { op: "clear" }).ok, false);
  assert.equal(applyOps(grove(1), undefined).ok, false);
  assert.equal(applyOps(grove(1), Array.from({ length: MAX_OPS + 1 }, () => ({ op: "clear" }))).ok, false);
});

test("applyOps never mutates the row it was given", () => {
  const row = grove(3);
  const before = JSON.parse(JSON.stringify(row));
  applyOps(row, [{ op: "mastery", concept: "c1", value: 99 }, { op: "session", concept: "c2", opId: "s1" }, { op: "remove", concept: "c3" }, { op: "rename", name: "New" }, { op: "append", concepts: [tree("n1")] }, { op: "clear" }]);
  assert.deepEqual(row, before);
});

test("a row with no concepts array is treated as empty", () => {
  const out = applyOps({ name: "Odd", concepts: null }, [{ op: "append", concepts: [tree("n1")] }]);
  assert.equal(out.concepts.length, 1);
});

test("nextMastery: solid and partial pull toward 92 and 66", () => {
  assert.equal(nextMastery(0, "solid"), 64);
  assert.equal(nextMastery(64, "solid"), 84);
  assert.equal(nextMastery(0, "partial"), 33);
});

test("nextMastery: a miss never raises mastery and never goes below zero", () => {
  for (const m of [0, 3, 6, 50, 100]) assert.ok(nextMastery(m, "struggling") <= m, `from ${m}`);
  assert.equal(nextMastery(50, "struggling"), 44);
  assert.equal(nextMastery(3, "struggling"), 0);
});

test("nextMastery: a hint or an honest I-don't-know is neutral", () => {
  for (const m of [0, 41, 100]) assert.equal(nextMastery(m, "unknown"), m);
  assert.equal(nextMastery(41, undefined), 41);
});

// ---- applyWithRetry: the conditional write ----------------------------------

// A fake table with one row and a version stamp, standing in for
// `PATCH ...&updated_at=eq.<the value read>`.
function fakeStore(row) {
  const store = { row: row ? { ...row, updated_at: 1 } : null, reads: 0, writes: 0, beforeWrite: null };
  store.read = async () => { store.reads++; return store.row ? { ...store.row } : null; };
  store.write = async (read, next) => {
    if (store.beforeWrite) { const hook = store.beforeWrite; store.beforeWrite = null; hook(); }
    if (store.row.updated_at !== read.updated_at) return false;
    store.writes++;
    store.row = { name: next.name, concepts: next.concepts, updated_at: read.updated_at + 1 };
    return true;
  };
  return store;
}

test("applyWithRetry writes once when nothing else touched the row", async () => {
  const store = fakeStore(grove(3));
  const out = await applyWithRetry({ read: store.read, write: store.write, ops: [{ op: "mastery", concept: "c1", value: 64 }] });
  assert.equal(out.status, "ok");
  assert.equal(store.reads, 1);
  assert.equal(store.writes, 1);
  assert.equal(store.row.concepts[0].mastery, 64);
});

test("applyWithRetry re-reads after a lost race and keeps the other writer's change", async () => {
  const store = fakeStore(grove(3));
  // Another device appends two trees between this request's read and write.
  store.beforeWrite = () => { store.row = { ...store.row, concepts: [...store.row.concepts, tree("n1"), tree("n2")], updated_at: store.row.updated_at + 1 }; };
  const out = await applyWithRetry({ read: store.read, write: store.write, ops: [{ op: "session", concept: "c2", opId: "s1" }] });
  assert.equal(out.status, "ok");
  assert.equal(store.reads, 2);
  assert.equal(store.row.concepts.length, 5, "the other device's trees survive");
  assert.equal(store.row.concepts[1].days, 1);
  assert.equal(out.concepts.length, 5);
});

test("applyWithRetry gives up as a conflict after the first try and three retries", async () => {
  const store = fakeStore(grove(1));
  let attempts = 0;
  const out = await applyWithRetry({ read: store.read, write: async () => { attempts++; return false; }, ops: [{ op: "clear" }] });
  assert.equal(out.status, "conflict");
  assert.equal(attempts, 4);
  assert.equal(store.row.concepts.length, 1);
});

test("applyWithRetry doesn't write when the ops change nothing", async () => {
  const store = fakeStore(grove(2));
  const out = await applyWithRetry({ read: store.read, write: store.write, ops: [{ op: "remove", concept: "gone" }] });
  assert.equal(out.status, "ok");
  assert.equal(store.writes, 0);
});

test("applyWithRetry reports a missing row, a bad batch, and a database failure", async () => {
  const none = fakeStore(null);
  assert.equal((await applyWithRetry({ read: none.read, write: none.write, ops: [{ op: "clear" }] })).status, "notFound");
  const store = fakeStore(grove(1));
  assert.equal((await applyWithRetry({ read: store.read, write: store.write, ops: "clear" })).status, "invalid");
  assert.equal((await applyWithRetry({ read: async () => { throw new Error("db"); }, write: store.write, ops: [{ op: "clear" }] })).status, "dbError");
  assert.equal(store.writes, 0);
});
