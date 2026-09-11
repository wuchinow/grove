export const runtime = "nodejs";

import { cfg, requireAdmin } from "../../../lib/auth";

// A tiny gate the admin layout checks once on mount, so none of the four
// dashboard pages need to repeat the "am I admin" 404 dance individually.
export async function GET() {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing Supabase settings." }, { status: 500 });
  const me = await requireAdmin(c);
  if (!me) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ me: { student_id: me.student_id, username: me.username, role: me.role } });
}
