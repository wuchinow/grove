export const runtime = "nodejs";

import { cfg, cleanId, authSignUp, authError, studentById, studentByUsername, writeSessionCookie } from "../../../lib/auth";

// Create an account. The username becomes the student_id. If a students row
// with that id already exists and nobody has claimed it (a beta user from the
// ?student= days), the new account adopts it: groves, grade, interests,
// insights all carry over. If the id is already claimed, the name is taken.
export async function POST(request) {
  const c = cfg();
  if (!c || !c.anon) return Response.json({ error: "Server is missing SUPABASE_ANON_KEY." }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const username = cleanId(body.username);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (username.length < 3) return Response.json({ error: "Pick a username with at least 3 letters or numbers." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ error: "That doesn't look like an email address." }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "Use a password with at least 8 characters." }, { status: 400 });

  const byName = await studentByUsername(c, username);
  const byId = await studentById(c, username);
  if ((byName && byName.auth_user_id) || (byId && byId.auth_user_id)) {
    return Response.json({ error: "That username is taken. Try another." }, { status: 409 });
  }

  const r = await authSignUp(c, email, password);
  if (!r.ok || !r.body || !r.body.user) return Response.json({ error: authError(r, "Couldn't create the account.") }, { status: 400 });
  // With email confirmation off, GoTrue returns a session here. If it is on,
  // there is no session yet and the person has to confirm first.
  const session = r.body.access_token ? r.body : null;
  const authUserId = r.body.user.id;

  // Upsert the students row. merge-duplicates keeps an existing row's
  // profile and insights (the adoption case) and only fills in identity.
  const patch = { student_id: username, username, email, auth_user_id: authUserId, updated_at: new Date().toISOString() };
  const w = await fetch(`${c.rest}/students?on_conflict=student_id`, {
    method: "POST",
    headers: { ...c.db, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!w.ok) return Response.json({ error: "Your account was created but the grove couldn't be attached. Send feedback from the Help screen and we'll fix it." }, { status: 502 });

  if (!session) return Response.json({ ok: true, needsConfirmation: true });
  writeSessionCookie(session);
  return Response.json({ ok: true, adopted: !!(byId && !byId.auth_user_id), student: { student_id: username, username, role: (byId && byId.role) || "student" } });
}
