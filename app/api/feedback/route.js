export const runtime = "nodejs";

import { cfg, resolveStudent } from "../../lib/auth";

const NOTION_VERSION = "2025-09-03";

// Writes the feedback row, then two independent best-effort mirrors that can
// never block or fail the submit: a Notion page (same table the team already
// reviews feedback in) and a Resend email. Both no-op cleanly if their env
// vars aren't set yet - same "best-effort, fire-and-forget" pattern as
// logTurn in /api/anthropic/route.js.
export async function POST(request) {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing Supabase settings." }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const message = (body.message || "").trim();
  if (!message) return Response.json({ error: "A message is required." }, { status: 400 });
  const email = (body.email || "").trim() || null;
  const page = typeof body.page === "string" ? body.page.slice(0, 100) : null;
  const userAgent = request.headers.get("user-agent") || null;

  // A guest has no session and no legacy id to resolve - that's fine,
  // student_id is nullable on this table.
  let studentId = null;
  try {
    const me = await resolveStudent(c, body.student);
    if (me) studentId = me.student_id;
  } catch {}

  const res = await fetch(`${c.rest}/feedback`, {
    method: "POST",
    headers: { ...c.db, Prefer: "return=minimal" },
    body: JSON.stringify({ student_id: studentId, email, message, page, user_agent: userAgent }),
  });
  if (!res.ok) return Response.json({ error: "Couldn't save your feedback. Try again." }, { status: 502 });

  mirrorToNotion({ studentId, email, message }).catch(() => {});
  emailNotification({ studentId, email, message, page }).catch(() => {});

  return Response.json({ ok: true });
}

// NOTION_FEEDBACK_DB must hold the data source id (not the database id) -
// page creation targets a specific data source in Notion's multi-source
// database model.
async function mirrorToNotion({ studentId, email, message }) {
  const token = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_FEEDBACK_DB;
  if (!token || !dataSourceId) return;
  const properties = {
    Item: { title: [{ text: { content: message.slice(0, 100) } }] },
    Notes: { rich_text: [{ text: { content: message.slice(0, 1900) } }] },
    Date: { date: { start: new Date().toISOString() } },
    Status: { select: { name: "logged" } },
    Type: { select: { name: "observation" } },
  };
  // Source is a fixed select of named beta users today - only ever set to a
  // real student id, never invented for a guest.
  if (studentId) properties.Source = { select: { name: studentId } };
  if (email) properties.Email = { email };
  await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json" },
    body: JSON.stringify({ parent: { data_source_id: dataSourceId }, properties }),
  });
}

async function emailNotification({ studentId, email, message, page }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO;
  if (!key || !to) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Grove <onboarding@resend.dev>",
      to,
      subject: `Grove feedback${studentId ? ` from ${studentId}` : ""}`,
      text: `${message}\n\n${page ? `Page: ${page}\n` : ""}${email ? `Reply to: ${email}\n` : ""}`,
    }),
  });
}
