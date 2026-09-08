export const runtime = "nodejs";

import { cfg, newVerifier, challengeFor, writeVerifierCookie, callbackUrl } from "../../../lib/auth";

// Step one of Google sign-in: mint a PKCE verifier, keep it in an httpOnly
// cookie, and hand GoTrue the challenge. GoTrue bounces the browser to Google
// and Google bounces it back to /api/auth/callback with a one-time code.
export async function GET(request) {
  const c = cfg();
  if (!c || !c.anon) return Response.json({ error: "Server is missing SUPABASE_ANON_KEY." }, { status: 500 });

  const verifier = newVerifier();
  writeVerifierCookie(verifier);

  const url = new URL(`${c.auth}/authorize`);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", callbackUrl(request));
  url.searchParams.set("code_challenge", challengeFor(verifier));
  url.searchParams.set("code_challenge_method", "s256");

  return Response.redirect(url.toString(), 302);
}
