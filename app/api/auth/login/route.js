export const runtime = "nodejs";

import { cfg, cleanId, authSignIn, authError, studentByUsername, studentByAuthId, writeSessionCookie } from "../../../lib/auth";

// Sign in with a username or an email, plus a password. A username is
// resolved to the account's email server-side; the browser never learns
// anyone else's email from a failed guess, since the error is the same either way.
export async function POST(request) {
  const c = cfg();
  if (!c || !c.anon) return Response.json({ error: "Server is missing SUPABASE_ANON_KEY." }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const identifier = String(body.identifier || "").trim();
  const password = String(body.password || "");
  if (!identifier || !password) return Response.json({ error: "Enter your username and password." }, { status: 400 });

  let email = identifier;
  if (!identifier.includes("@")) {
    const row = await studentByUsername(c, cleanId(identifier));
    if (!row || !row.email) return Response.json({ error: "That username or password isn't right." }, { status: 401 });
    email = row.email;
  }
  const r = await authSignIn(c, email.toLowerCase(), password);
  if (!r.ok || !r.body || !r.body.access_token) return Response.json({ error: authError(r, "Couldn't sign in.") }, { status: 401 });
  const me = await studentByAuthId(c, r.body.user.id);
  if (!me) return Response.json({ error: "This account has no grove attached. Ask David to link it." }, { status: 409 });
  writeSessionCookie(r.body);
  return Response.json({ ok: true, student: { student_id: me.student_id, username: me.username, role: me.role } });
}
