export const runtime = "nodejs";

import { cfg, resolveStudent } from "../../lib/auth";

// Load, save, rename, or delete a single grove. Every grove belongs to a
// student (student_id). Identity comes from the session cookie via
// resolveStudent(); the `student` field the client used to send is now only
// a legacy fallback for unclaimed beta rows. Every read and write is filtered
// by the resolved student_id, so one person can never touch another's grove
// even with a guessed grove id.

function base(c) { return `${c.rest}/groves`; }

export async function GET(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing grove id." }, { status: 400 });
  const me = await resolveStudent(c, searchParams.get("student"));
  if (!me) return Response.json({ error: "Not signed in." }, { status: 401 });
  const res = await fetch(`${base(c)}?id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(me.student_id)}&select=id,name,concepts`, { headers: c.db, cache: "no-store" });
  if (!res.ok) return Response.json({ error: "Database read failed." }, { status: 502 });
  const rows = await res.json();
  if (!rows[0]) return Response.json({ error: "Grove not found." }, { status: 404 });
  return Response.json(rows[0]);
}

export async function PUT(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const me = await resolveStudent(c, body.student);
  if (!me) return Response.json({ error: "Not signed in." }, { status: 401 });
  const student = me.student_id;
  const name = body.name ? String(body.name).slice(0, 60) : undefined;
  const hasConcepts = Array.isArray(body.concepts);
  if (hasConcepts && body.concepts.length > 500) return Response.json({ error: "Too many concepts." }, { status: 400 });

  if (body.id) {
    // Adding to an existing grove: merge server-side against the row's own
    // current concepts instead of trusting a client-computed array, which may
    // not reflect a load that hasn't fully settled yet.
    if (Array.isArray(body.append)) {
      const cur = await fetch(`${base(c)}?id=eq.${encodeURIComponent(body.id)}&student_id=eq.${encodeURIComponent(student)}&select=concepts`, { headers: c.db, cache: "no-store" });
      const curRows = cur.ok ? await cur.json() : [];
      if (!curRows[0]) return Response.json({ error: "Grove not found." }, { status: 404 });
      const merged = [...(Array.isArray(curRows[0].concepts) ? curRows[0].concepts : []), ...body.append];
      if (merged.length > 500) return Response.json({ error: "Too many concepts." }, { status: 400 });
      const patch = { concepts: merged, updated_at: new Date().toISOString() };
      if (name !== undefined) patch.name = name;
      const res = await fetch(`${base(c)}?id=eq.${encodeURIComponent(body.id)}&student_id=eq.${encodeURIComponent(student)}`, {
        method: "PATCH",
        headers: { ...c.db, Prefer: "return=minimal" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });
      return Response.json({ ok: true, id: body.id, concepts: merged });
    }

    // Update an existing grove. Omitting concepts allows a rename-only call.
    // A non-empty concepts array is never replaced with an empty one unless
    // the caller explicitly says allowEmpty (only clearGrove()/removeTree()'s
    // own direct calls do) - this is the other half of the fix for the Sep 8
    // and Sep 11 grove-wipe incidents (see useGrove.js): the column is simply
    // left untouched rather than erroring, so e.g. a same-request rename still
    // applies, and the client's save indicator doesn't show a false error for
    // the safety net doing its job.
    const patch = { updated_at: new Date().toISOString() };
    if (name !== undefined) patch.name = name;
    if (hasConcepts) {
      if (body.concepts.length === 0 && !body.allowEmpty) {
        console.error(`[grove-guard] refused empty-concepts overwrite grove=${body.id} student=${student}`);
      } else {
        patch.concepts = body.concepts;
      }
    }
    const res = await fetch(`${base(c)}?id=eq.${encodeURIComponent(body.id)}&student_id=eq.${encodeURIComponent(student)}`, {
      method: "PATCH",
      headers: { ...c.db, Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });
    return Response.json({ ok: true, id: body.id });
  }

  // No id: create a new grove for this student. source_id (and, when a
  // section was picked, source_start/source_end) records which /api/sources
  // row this grove was founded from - null for photos, typed topics, and
  // every later addition to an already-open grove.
  if (!hasConcepts) return Response.json({ error: "Need concepts to create a grove." }, { status: 400 });
  const create = { student_id: student, name: name || "My grove", concepts: body.concepts, updated_at: new Date().toISOString() };
  if (body.source_id) {
    // Never trust a client-supplied source_id at face value - confirm it's
    // actually this student's own source before wiring the grove to it, so
    // one student can't link (and later, potentially, surface) another's.
    const owns = await fetch(`${c.rest}/sources?id=eq.${encodeURIComponent(body.source_id)}&student_id=eq.${encodeURIComponent(student)}&select=id`, { headers: c.db, cache: "no-store" });
    const ownRows = owns.ok ? await owns.json() : [];
    if (ownRows[0]) {
      create.source_id = body.source_id;
      if (Number.isInteger(body.source_start) && Number.isInteger(body.source_end)) {
        create.source_start = body.source_start;
        create.source_end = body.source_end;
      }
    }
  }
  const res = await fetch(base(c), {
    method: "POST",
    headers: { ...c.db, Prefer: "return=representation" },
    body: JSON.stringify(create),
  });
  if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });
  const rows = await res.json();
  return Response.json({ ok: true, id: rows[0] && rows[0].id });
}

// navigator.sendBeacon (the autosave flush-on-hide safety net in useGrove.js)
// can only send POST, never PUT - alias it to the same handler rather than
// duplicating the logic.
export const POST = PUT;

export async function DELETE(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
  const me = await resolveStudent(c, searchParams.get("student"));
  if (!me) return Response.json({ error: "Not signed in." }, { status: 401 });
  const res = await fetch(`${base(c)}?id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(me.student_id)}`, {
    method: "DELETE",
    headers: { ...c.db, Prefer: "return=minimal" },
  });
  if (!res.ok) return Response.json({ error: "Database delete failed." }, { status: 502 });
  return Response.json({ ok: true });
}
