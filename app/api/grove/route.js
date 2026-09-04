export const runtime = "nodejs";

// Load and save a child's grove. Talks to Supabase's REST API directly with the
// service role key, so the key stays on the server and no client library is needed.
//
// Table (see README): groves(child_id text primary key, concepts jsonb, updated_at timestamptz)

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
  const child = cleanId(new URL(request.url).searchParams.get("child"));
  if (!child) return Response.json({ error: "Missing child." }, { status: 400 });
  const res = await fetch(`${c.base}?child_id=eq.${encodeURIComponent(child)}&select=concepts,profile`, { headers: c.headers, cache: "no-store" });
  if (!res.ok) return Response.json({ error: "Database read failed." }, { status: 502 });
  const rows = await res.json();
  return Response.json({ child, concepts: rows[0] ? rows[0].concepts : [], profile: (rows[0] && rows[0].profile) || {} });
}

export async function PUT(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const child = cleanId(body.child);
  if (!child || !Array.isArray(body.concepts)) return Response.json({ error: "Need child and concepts." }, { status: 400 });
  if (body.concepts.length > 500) return Response.json({ error: "Too many concepts." }, { status: 400 });
  const res = await fetch(c.base, {
    method: "POST",
    headers: { ...c.headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ child_id: child, concepts: body.concepts, profile: body.profile && typeof body.profile === "object" ? body.profile : {}, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });
  return Response.json({ ok: true });
}
