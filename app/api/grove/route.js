export const runtime = "nodejs";

// Load, save, rename, or delete a single grove. Every grove belongs to a
// student (student_id) and has its own name and concepts. The student_id
// filter on write/delete means one person can never touch another's grove
// even with a guessed id, matching the "unlisted link" trust model.

function cfg() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const base = (url.endsWith("/") ? url.slice(0, -1) : url) + "/rest/v1/groves";
  return { base, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" } };
}
function cleanId(v) {
  return String(v || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
}

export async function GET(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing grove id." }, { status: 400 });
  const res = await fetch(`${c.base}?id=eq.${encodeURIComponent(id)}&select=id,name,concepts`, { headers: c.headers, cache: "no-store" });
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
  const student = cleanId(body.student);
  if (!student) return Response.json({ error: "Missing student." }, { status: 400 });
  const name = body.name ? String(body.name).slice(0, 60) : undefined;
  const hasConcepts = Array.isArray(body.concepts);
  if (hasConcepts && body.concepts.length > 500) return Response.json({ error: "Too many concepts." }, { status: 400 });

  if (body.id) {
    // Update an existing grove. Omitting concepts allows a rename-only call.
    const patch = { updated_at: new Date().toISOString() };
    if (name !== undefined) patch.name = name;
    if (hasConcepts) patch.concepts = body.concepts;
    const res = await fetch(`${c.base}?id=eq.${encodeURIComponent(body.id)}&student_id=eq.${encodeURIComponent(student)}`, {
      method: "PATCH",
      headers: { ...c.headers, Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });
    return Response.json({ ok: true, id: body.id });
  }

  // No id: create a new grove for this student.
  if (!hasConcepts) return Response.json({ error: "Need concepts to create a grove." }, { status: 400 });
  const res = await fetch(c.base, {
    method: "POST",
    headers: { ...c.headers, Prefer: "return=representation" },
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
  const student = cleanId(searchParams.get("student"));
  if (!id || !student) return Response.json({ error: "Missing id or student." }, { status: 400 });
  const res = await fetch(`${c.base}?id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(student)}`, {
    method: "DELETE",
    headers: { ...c.headers, Prefer: "return=minimal" },
  });
  if (!res.ok) return Response.json({ error: "Database delete failed." }, { status: 502 });
  return Response.json({ ok: true });
}
