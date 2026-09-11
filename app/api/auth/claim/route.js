export const runtime = "nodejs";

import { cfg, cleanId, currentStudent, readSessionCookie, authUser, studentById, studentByUsername } from "../../../lib/auth";

// Pick a username after signing in with Google. Same adoption rule as password
// sign-up: an unclaimed beta row with that name is taken over, groves and all;
// a claimed one is refused as taken.
export async function POST(request) {
  const c = cfg();
  if (!c || !c.anon) return Response.json({ error: "Server is missing SUPABASE_ANON_KEY." }, { status: 500 });

  // Must already hold a valid session from the OAuth callback.
  const s = readSessionCookie();
  if (!s) return Response.json({ error: "Not signed in." }, { status: 401 });
  const u = await authUser(c, s.at);
  if (!u.ok || !u.body || !u.body.id) return Response.json({ error: "Not signed in." }, { status: 401 });

  // Already has a username? Nothing to claim.
  if (await currentStudent(c)) return Response.json({ error: "This account already has a username." }, { status: 409 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const username = cleanId(body.username);
  if (username.length < 3) return Response.json({ error: "Pick a username with at least 3 letters or numbers." }, { status: 400 });

  const byName = await studentByUsername(c, username);
  const byId = await studentById(c, username);
  if ((byName && byName.auth_user_id) || (byId && byId.auth_user_id)) {
    return Response.json({ error: "That username is taken. Try another." }, { status: 409 });
  }

  // Same never-set rule as the OAuth callback: seed the Google avatar only
  // when there's an adopted row and it has no avatar key at all, so an
  // uploaded photo always wins and a removed one is never re-seeded. Reads
  // byId's own profile/insights (already fetched above) rather than relying
  // on the upsert to preserve columns it doesn't mention.
  const meta = u.body.user_metadata || {};
  const googleAvatar = meta.picture || meta.avatar_url;
  const existingProfile = (byId && byId.profile) || {};
  const profile = googleAvatar && !("avatar" in existingProfile) ? { ...existingProfile, avatar: googleAvatar } : existingProfile;

  const w = await fetch(`${c.rest}/students?on_conflict=student_id`, {
    method: "POST",
    headers: { ...c.db, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      student_id: username,
      username,
      email: u.body.email || null,
      auth_user_id: u.body.id,
      profile,
      insights: Array.isArray(byId && byId.insights) ? byId.insights : [],
      updated_at: new Date().toISOString(),
    }),
  });
  if (!w.ok) return Response.json({ error: "Couldn't save that username. Try again." }, { status: 502 });
  return Response.json({ ok: true, adopted: !!(byId && !byId.auth_user_id), student: { student_id: username, username, role: (byId && byId.role) || "student" } });
}
