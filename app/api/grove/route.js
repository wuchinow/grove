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
    // Update an existing grove. Omitting concepts allows a rename-only call.
    const patch = { updated_at: new Date().toISOString() };
    if (name !== undefined) patch.name = name;
    if (hasConcepts) patch.concepts = body.concepts;
    const res = await fetch(`${base(c)}?id=eq.${encodeURIComponent(body.id)}&student_id=eq.${encodeURIComponent(student)}`, {
      method: "PATCH",
      headers: { ...c.db, Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });
    return Response.json({ ok: true, id: body.id });
  }

  // No id: create a new grove for this student.
  if (!hasConcepts) return Response.json({ error: "Need concepts to create a grove." }, { status: 400 });
  const res = await fetch(base(c), {
    method: "POST",
    headers: { ...c.db, Prefer: "return=representation" },
    body: JSON.stringify({ student_id: student, name: name || "My grove", concepts: body.concepts, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });
  const rows = await res.json();
  return Response.json({ ok: true, id: rows[0] && rows[0].id });
}

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
