export const runtime = "nodejs";

import { cfg, currentStudent } from "../../../lib/auth";

// Who am I, plus everything the app needs to boot for that person: profile,
// insights, and the light grove list. Replaces the old GET /api/student for
// signed-in users. Returns { student: null } for a guest, never an error, so
// the client can treat "no session" as a normal state rather than a failure.
export async function GET() {
  const c = cfg();
  if (!c) return Response.json({ error: "Server is missing Supabase settings." }, { status: 500 });
  const me = await currentStudent(c);
  if (!me) return Response.json({ student: null });
  const gRes = await fetch(`${c.rest}/groves?student_id=eq.${encodeURIComponent(me.student_id)}&select=id,name,concepts&order=updated_at.desc`, { headers: c.db, cache: "no-store" });
  const gRows = gRes.ok ? await gRes.json() : [];
  const groves = gRows.map((g) => {
    const concepts = Array.isArray(g.concepts) ? g.concepts : [];
    return { id: g.id, name: g.name, treeCount: concepts.length, flourishing: concepts.filter((x) => x.mastery >= 85).length };
  });
  return Response.json({
    student: { student_id: me.student_id, username: me.username, role: me.role },
    profile: me.profile || {},
    insights: Array.isArray(me.insights) ? me.insights : [],
    groves,
  });
}
