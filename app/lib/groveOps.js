// ---- Grove operations --------------------------------------------------------
// The finish of the Sep 8 / Sep 11 grove-wipe bug class. The client no longer
// sends a whole concepts array for an existing grove; it sends small
// operations, and /api/grove applies them here against the row it just read.
// A stale or empty client can then only send a wrong operation (which touches
// one concept, or nothing at all), never a wrong whole grove.
//
// Pure, no imports: shared by the server route and the client hook, and tested
// directly in groveOps.test.mjs.

export const MAX_CONCEPTS = 500;
export const MAX_OPS = 200;

const clamp = (n) => Math.max(0, Math.min(100, n));

// How one graded turn moves mastery. A miss never raises it; a hint or an
// honest "I don't know" ("unknown") leaves it unchanged.
export function nextMastery(mastery, understanding) {
  let m = Number(mastery) || 0;
  if (understanding === "solid") m = Math.round(m * 0.3 + 92 * 0.7);        // correct: strong gain
  else if (understanding === "partial") m = Math.round(m * 0.5 + 66 * 0.5); // partly right: some gain
  else if (understanding === "struggling") m = m - 6;                        // a miss: never adds, can only dip
  return clamp(m);
}

// Applies ops, in order, to a row's { name, concepts } and returns the result
// without mutating the input. An op that names a concept the row doesn't have,
// or that is malformed, is skipped on its own - one bad op must not hold up
// the ones queued behind it. Only a malformed batch as a whole is an error.
export function applyOps(row, ops) {
  if (!Array.isArray(ops)) return { ok: false, error: "Need a list of operations." };
  if (ops.length > MAX_OPS) return { ok: false, error: "Too many operations." };
  let concepts = Array.isArray(row && row.concepts) ? row.concepts : [];
  let name = row && typeof row.name === "string" ? row.name : "";
  let changed = false;
  let skipped = 0;
  const at = (id) => (typeof id === "string" && id ? concepts.findIndex((c) => c && c.id === id) : -1);
  const put = (i, next) => { concepts = concepts.map((c, j) => (j === i ? next : c)); changed = true; };

  for (const o of ops) {
    const kind = o && typeof o === "object" ? o.op : null;
    if (kind === "mastery") {
      const i = at(o.concept);
      if (i < 0 || typeof o.value !== "number" || !Number.isFinite(o.value)) { skipped++; continue; }
      const value = clamp(Math.round(o.value));
      if (concepts[i].mastery !== value) put(i, { ...concepts[i], mastery: value });
    } else if (kind === "session") {
      // opId makes the one non-idempotent op safe to send twice (a retry
      // after a response that never arrived, or the hide beacon racing a
      // batch in flight): the same session can only count once.
      const i = at(o.concept);
      if (i < 0 || typeof o.opId !== "string" || !o.opId || o.opId.length > 64 || concepts[i].lastOp === o.opId) { skipped++; continue; }
      const c = concepts[i];
      put(i, { ...c, days: (Number(c.days) || 0) + 1, reviews: (Number(c.reviews) || 0) + 1, lastOp: o.opId });
    } else if (kind === "remove") {
      const i = at(o.concept);
      if (i < 0) { skipped++; continue; }
      concepts = concepts.filter((_, j) => j !== i);
      changed = true;
    } else if (kind === "rename") {
      const clean = typeof o.name === "string" ? o.name.trim().slice(0, 60) : "";
      if (!clean) { skipped++; continue; }
      if (clean !== name) { name = clean; changed = true; }
    } else if (kind === "append") {
      if (!Array.isArray(o.concepts)) { skipped++; continue; }
      // Skipping ids the row already has makes a re-sent append a no-op.
      const fresh = [];
      for (const c of o.concepts) {
        if (!c || typeof c !== "object" || typeof c.id !== "string" || !c.id) { skipped++; continue; }
        if (at(c.id) >= 0 || fresh.some((f) => f.id === c.id)) continue;
        fresh.push(c);
      }
      if (concepts.length + fresh.length > MAX_CONCEPTS) return { ok: false, error: "Too many concepts." };
      if (fresh.length) { concepts = [...concepts, ...fresh]; changed = true; }
    } else if (kind === "clear") {
      if (concepts.length) { concepts = []; changed = true; }
    } else {
      skipped++;
    }
  }
  return { ok: true, concepts, name, changed, skipped };
}

// Read the row, apply the ops, write only if the row is still the one that was
// read; if someone else wrote in between, read again and re-apply. The storage
// calls are injected so this loop is testable without a database:
//   read()            -> the row ({ name, concepts, updated_at }) or null
//   write(row, next)  -> true if the write landed, false if the row had changed
// Either may throw for a database failure.
export async function applyWithRetry({ read, write, ops, retries = 3 }) {
  try {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const row = await read();
      if (!row) return { status: "notFound" };
      const next = applyOps(row, ops);
      if (!next.ok) return { status: "invalid", error: next.error };
      const done = { status: "ok", concepts: next.concepts, name: next.name, skipped: next.skipped };
      if (!next.changed) return done;   // nothing to write, so no history row either
      if (await write(row, next)) return done;
    }
    return { status: "conflict" };
  } catch {
    return { status: "dbError" };
  }
}
