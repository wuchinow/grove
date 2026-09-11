export const runtime = "nodejs";

import { cfg, authExchangeCode, readVerifierCookie, clearVerifierCookie, writeSessionCookie, studentByAuthId } from "../../../lib/auth";

// Step two: Google sent the browser back here. Trade the code for a session,
// then decide where the person lands.
//
// Supabase links a Google identity to an existing account automatically when
// the email matches and is verified, so someone who signed up with a password
// and later taps Google arrives at the same auth user, and therefore the same
// student_id and the same groves.
//
// A genuinely new Google user has an auth account but no students row yet,
// because a Google profile carries an email and no username, and username IS
// the student_id here. Those people go to /?claim=1, where the app asks them
// to pick one. Everyone else goes straight home.
export async function GET(request) {
  const c = cfg();
  const home = new URL("/", request.url);
  if (!c || !c.anon) { home.searchParams.set("autherror", "config"); return Response.redirect(home.toString(), 302); }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") || searchParams.get("error");
  const verifier = readVerifierCookie();
  clearVerifierCookie();

  if (oauthError || !code || !verifier) {
    home.searchParams.set("autherror", oauthError ? "denied" : "expired");
    return Response.redirect(home.toString(), 302);
  }

  const r = await authExchangeCode(c, code, verifier);
  if (!r.ok || !r.body || !r.body.access_token) {
    home.searchParams.set("autherror", "exchange");
    return Response.redirect(home.toString(), 302);
  }
  writeSessionCookie(r.body);

  const me = await studentByAuthId(c, r.body.user.id);
  if (!me) { home.searchParams.set("claim", "1"); return Response.redirect(home.toString(), 302); }

  // Seed the Google avatar the first time only: an uploaded photo always
  // wins, and a removed photo (profile.avatar === "") must never be
  // re-seeded, so this only fires when the key is missing entirely.
  const meta = r.body.user.user_metadata || {};
  const googleAvatar = meta.picture || meta.avatar_url;
  if (googleAvatar && !("avatar" in (me.profile || {}))) {
    try {
      await fetch(`${c.rest}/students?on_conflict=student_id`, {
        method: "POST",
        headers: { ...c.db, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          student_id: me.student_id,
          profile: { ...(me.profile || {}), avatar: googleAvatar },
          insights: Array.isArray(me.insights) ? me.insights : [],
          updated_at: new Date().toISOString(),
        }),
      });
    } catch {}
  }

  return Response.redirect(home.toString(), 302);
}
