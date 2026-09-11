export const runtime = "nodejs";

import { cfg, currentStudent } from "../../lib/auth";

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Server is missing ANTHROPIC_API_KEY. Add it in Vercel project settings." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // `kind` ("extract" | "topic" | "tutor" | "tutor-retry") labels the call
  // for the admin usage dashboard and isn't part of the Anthropic API payload.
  const { kind, ...anthropicBody } = body;

  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(anthropicBody),
    });
  } catch {
    return Response.json({ error: "Could not reach the Anthropic API." }, { status: 502 });
  }

  const data = await res.json();

  // Best-effort usage logging for the admin cost dashboard. Never let a
  // logging failure affect the tutor's response.
  logTurn(kind, anthropicBody.model, data, res.ok).catch(() => {});

  return Response.json(data, { status: res.status });
}

async function logTurn(kind, model, data, ok) {
  const c = cfg();
  if (!c) return;
  const usage = data && data.usage;
  let studentId = null;
  try {
    const me = await currentStudent(c);
    if (me) studentId = me.student_id;
  } catch {}
  await fetch(`${c.rest}/turns`, {
    method: "POST",
    headers: { ...c.db, Prefer: "return=minimal" },
    body: JSON.stringify({
      student_id: studentId,
      kind: kind || "tutor",
      model: model || "unknown",
      input_tokens: (usage && usage.input_tokens) || 0,
      output_tokens: (usage && usage.output_tokens) || 0,
      cache_read_input_tokens: (usage && usage.cache_read_input_tokens) || 0,
      cache_creation_input_tokens: (usage && usage.cache_creation_input_tokens) || 0,
      ok: !!ok,
    }),
  });
}
