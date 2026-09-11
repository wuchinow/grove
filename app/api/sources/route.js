export const runtime = "nodejs";

import { cfg, resolveStudent } from "../../lib/auth";

// Persists the full text extracted from a PDF/DOCX/TXT/URL upload - never a
// slice, even when the student picked one section to study - so they can
// come back and study a different part of the same document later without
// re-uploading it. Guests never reach this route (useGrove only calls it for
// a named student); the grove's source_id/source_start/source_end are set in
// the same /api/grove write that creates the grove.
export async function POST(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing Supabase settings." }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const me = await resolveStudent(c, body.student);
  if (!me) return Response.json({ error: "Not signed in." }, { status: 401 });

  const kind = ["pdf", "docx", "txt", "url"].includes(body.kind) ? body.kind : "file";
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) return Response.json({ error: "Nothing to save." }, { status: 400 });
  const filename = body.filename ? String(body.filename).slice(0, 200) : null;

  const res = await fetch(`${c.rest}/sources`, {
    method: "POST",
    headers: { ...c.db, Prefer: "return=representation" },
    body: JSON.stringify({ student_id: me.student_id, filename, kind, text }),
  });
  if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });
  const rows = await res.json();
  return Response.json({ ok: true, id: rows[0] && rows[0].id });
}
