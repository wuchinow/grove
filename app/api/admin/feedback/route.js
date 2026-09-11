export const runtime = "nodejs";

import { cfg, requireAdmin } from "../../../lib/auth";

export async function GET() {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing Supabase settings." }, { status: 500 });
  const me = await requireAdmin(c);
  if (!me) return Response.json({ error: "Not found." }, { status: 404 });

  const r = await fetch(`${c.rest}/feedback?select=id,created_at,student_id,email,message,page,status,notes&order=created_at.desc&limit=200`, { headers: c.db, cache: "no-store" });
  if (!r.ok) return Response.json({ error: "Database read failed." }, { status: 502 });
  return Response.json({ items: await r.json() });
}

// Read the row first - an edit to status must never wipe notes, and vice
// versa, same defensive pattern as /api/student and /api/game.
export async function PUT(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing Supabase settings." }, { status: 500 });
  const me = await requireAdmin(c);
  if (!me) return Response.json({ error: "Not found." }, { status: 404 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  if (!body.id) return Response.json({ error: "Missing id." }, { status: 400 });
  const hasStatus = typeof body.status === "string";
  const hasNotes = typeof body.notes === "string";
  if (!hasStatus && !hasNotes) return Response.json({ error: "Need status or notes to write." }, { status: 400 });

  const cur = await fetch(`${c.rest}/feedback?id=eq.${encodeURIComponent(body.id)}&select=status,notes`, { headers: c.db, cache: "no-store" });
  const rows = cur.ok ? await cur.json() : [];
  const row = rows[0] || {};
  const status = hasStatus ? body.status : row.status;
  const notes = hasNotes ? body.notes : row.notes;

  const res = await fetch(`${c.rest}/feedback?id=eq.${encodeURIComponent(body.id)}`, {
    method: "PATCH",
    headers: { ...c.db, Prefer: "return=minimal" },
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok) return Response.json({ error: "Database write failed." }, { status: 502 });
  return Response.json({ ok: true });
}
