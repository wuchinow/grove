export const runtime = "nodejs";

// Shared per-person data: profile (grade) and the list of that person's
// groves. A person can have several groves; this route lists them without
// their full contents, which keeps the picker screen light.

function cfg() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const base = (url.endsWith("/") ? url.slice(0, -1) : url) + "/rest/v1";
  return { base, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" } };
}
function cleanId(v) {
  return String(v || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
}

export async function GET(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  const student = cleanId(new URL(request.url).searchParams.get("student"));
  if (!student) return Response.json({ error: "Missing student id." }, { status: 400 });

  const [sRes, gRes] = await Promise.all([
    fetch(`${c.base}/students?student_id=eq.${encodeURIComponent(student)}&select=profile`, { headers: c.headers, cache: "no-store" }),
    fetch(`${c.base}/groves?student_id=eq.${encodeURIComponent(student)}&select=id,name,concepts&order=updated_at.desc`, { headers: c.headers, cache: "no-store" }),
  ]);
  if (!sRes.ok || !gRes.ok) return Response.json({ error: "Database read failed." }, { status: 502 });
  const sRows = await sRes.json();
  const gRows = await gRes.json();
  const groves = gRows.map((g) => {
    const concepts = Array.isArray(g.concepts) ? g.concepts : [];
    return { id: g.id, name: g.name, treeCount: concepts.length, flourishing: concepts.filter((c) => c.mastery >= 85).length };
  });
  return Response.json({ student, profile: (sRows[0] && sRows[0].profile) || {}, groves });
}

export async function PUT(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const student = cleanId(body.student);
  if (!student) return Response.json({ error: "Missing student id." }, { status: 400 });
  const profile = body.profile && typeof body.profile === "object" ? body.profile : {};
  const res = await fetch(`${c.base}/students`, {
    method: "POST",
    headers: { ...c.headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ student_id: student, profile, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });
  return Response.json({ ok: true });
}
