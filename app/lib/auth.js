import { cookies } from "next/headers";

// ---- Server-side auth ------------------------------------------------------
// Grove talks to Supabase Auth (GoTrue) over its REST API with plain fetch,
// the same way the data routes talk to PostgREST. No client library, no
// browser-side keys. The session is an httpOnly cookie holding the access and
// refresh tokens; every API route resolves "who is this" through
// resolveStudent() below and never trusts an id sent by the browser.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (already set), plus
// SUPABASE_ANON_KEY (new, server-only) for the auth endpoints.

const COOKIE = "grove_session";
const YEAR = 60 * 60 * 24 * 365;

export function cfg() {
  const url = process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !service) return null;
  const base = url.endsWith("/") ? url.slice(0, -1) : url;
  return {
    rest: base + "/rest/v1",
    auth: base + "/auth/v1",
    anon,
    db: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
  };
}

// Same slug rule the data routes have always used, so a username and a
// student_id are interchangeable strings.
export function cleanId(v) {
  return String(v || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
}

// ---- cookie ---------------------------------------------------------------
export function readSessionCookie() {
  try {
    const raw = cookies().get(COOKIE);
    if (!raw || !raw.value) return null;
    const j = JSON.parse(raw.value);
    return j && j.at && j.rt ? j : null;
  } catch { return null; }
}
export function writeSessionCookie(session) {
  cookies().set(COOKIE, JSON.stringify({ at: session.access_token, rt: session.refresh_token }), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: YEAR,
  });
}
export function clearSessionCookie() {
  cookies().set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

// ---- GoTrue calls ---------------------------------------------------------
async function gotrue(c, path, init) {
  const res = await fetch(`${c.auth}${path}`, {
    ...init,
    headers: { apikey: c.anon, "Content-Type": "application/json", ...(init && init.headers) },
    cache: "no-store",
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, body };
}

export async function authSignUp(c, email, password) {
  return gotrue(c, "/signup", { method: "POST", body: JSON.stringify({ email, password }) });
}
export async function authSignIn(c, email, password) {
  return gotrue(c, "/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
}
export async function authRefresh(c, rt) {
  return gotrue(c, "/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: rt }) });
}
export async function authUser(c, at) {
  return gotrue(c, "/user", { method: "GET", headers: { Authorization: `Bearer ${at}` } });
}
export async function authSignOut(c, at) {
  return gotrue(c, "/logout", { method: "POST", headers: { Authorization: `Bearer ${at}` } });
}
export async function authUpdatePassword(c, at, password) {
  return gotrue(c, "/user", { method: "PUT", headers: { Authorization: `Bearer ${at}` }, body: JSON.stringify({ password }) });
}

// Human-readable reason from a GoTrue error body, for the sign-in card.
export function authError(r, fallback) {
  const b = r && r.body;
  const msg = (b && (b.msg || b.message || b.error_description || b.error)) || "";
  if (/already registered|already exists/i.test(msg)) return "That email already has an account. Try signing in.";
  if (/invalid login credentials/i.test(msg)) return "That username or password isn't right.";
  if (/password/i.test(msg) && /short|least/i.test(msg)) return "Use a password with at least 8 characters.";
  if (/rate limit|too many/i.test(msg)) return "Too many tries. Wait a minute and try again.";
  return msg || fallback;
}

// ---- students table -------------------------------------------------------
export async function studentByAuthId(c, authUserId) {
  const r = await fetch(`${c.rest}/students?auth_user_id=eq.${encodeURIComponent(authUserId)}&select=student_id,username,email,role,profile,insights`, { headers: c.db, cache: "no-store" });
  const rows = r.ok ? await r.json() : [];
  return rows[0] || null;
}
export async function studentById(c, studentId) {
  const r = await fetch(`${c.rest}/students?student_id=eq.${encodeURIComponent(studentId)}&select=student_id,username,email,role,auth_user_id,profile,insights`, { headers: c.db, cache: "no-store" });
  const rows = r.ok ? await r.json() : [];
  return rows[0] || null;
}
export async function studentByUsername(c, username) {
  const r = await fetch(`${c.rest}/students?username=eq.${encodeURIComponent(username)}&select=student_id,username,email,role,auth_user_id`, { headers: c.db, cache: "no-store" });
  const rows = r.ok ? await r.json() : [];
  return rows[0] || null;
}

// ---- who is this request? -------------------------------------------------
// Returns the signed-in student's row (with `mode: "account"`), refreshing the
// token cookie when it has expired, or null when there is no valid session.
export async function currentStudent(c) {
  const s = readSessionCookie();
  if (!s) return null;
  let u = await authUser(c, s.at);
  if (!u.ok) {
    const rf = await authRefresh(c, s.rt);
    if (!rf.ok || !rf.body || !rf.body.access_token) { clearSessionCookie(); return null; }
    writeSessionCookie(rf.body);
    u = await authUser(c, rf.body.access_token);
    if (!u.ok) return null;
  }
  const row = await studentByAuthId(c, u.body.id);
  return row ? { ...row, mode: "account" } : null;
}

// Resolves the student a route should act as. A signed-in session always
// wins. With no session, a legacy `student` id is honoured only while that
// row exists and no account has claimed it, so old ?student= links keep
// working for beta users right up until they create an account.
export async function resolveStudent(c, fallbackId) {
  const me = await currentStudent(c);
  if (me) return me;
  const id = cleanId(fallbackId);
  if (!id) return null;
  const row = await studentById(c, id);
  if (!row || row.auth_user_id) return null;
  return { ...row, mode: "legacy" };
}

export async function requireAdmin(c) {
  const me = await currentStudent(c);
  return me && me.role === "admin" ? me : null;
}
