export const runtime = "nodejs";

import { cfg, readSessionCookie, authSignOut, clearSessionCookie } from "../../../lib/auth";

export async function POST() {
  const c = cfg();
  const s = readSessionCookie();
  if (c && c.anon && s) { try { await authSignOut(c, s.at); } catch {} }
  clearSessionCookie();
  return Response.json({ ok: true });
}
