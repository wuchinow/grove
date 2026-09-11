export const runtime = "nodejs";

import { cfg, currentStudent } from "../../lib/auth";
import { extractDocxText } from "../../lib/docx";

// Turns every non-photo source into plain text, server-side, before any
// model call ever sees it. Three kinds:
//   pdf  - text-layer extraction via unpdf; falls back to {fallback:true}
//          for a scanned/image-only PDF, which the client then treats
//          exactly like a photo (no sources row, sent to the model directly).
//   docx - hand-rolled ZIP/XML walk, see ../../lib/docx.js.
//   url  - server-side fetch + dependency-free tag stripping.
// TXT never reaches this route (file.text() client-side is enough).
//
// This is a non-AI step, but it's still a real "turn" for the cost/usage
// dashboard to count - logged with 0 tokens and a local model tag so
// /lib/pricing.js's unknown-model guard prices it at $0 without special-casing.
export async function POST(request) {
  const c = cfg();
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const kind = body.kind;

  if (kind === "pdf") return handlePdf(c, body);
  if (kind === "docx") return handleDocx(c, body);
  if (kind === "url") return handleUrl(c, body);
  return Response.json({ error: "Unknown source kind." }, { status: 400 });
}

async function logExtractTurn(c, model, ok) {
  if (!c) return;
  let studentId = null;
  try {
    const me = await currentStudent(c);
    if (me) studentId = me.student_id;
  } catch {}
  try {
    await fetch(`${c.rest}/turns`, {
      method: "POST",
      headers: { ...c.db, Prefer: "return=minimal" },
      body: JSON.stringify({ student_id: studentId, kind: "extract", model, input_tokens: 0, output_tokens: 0, ok: !!ok }),
    });
  } catch {}
}

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB, generous for a study document

async function handlePdf(c, body) {
  const buf = decodeBase64(body.data);
  if (!buf || buf.length > MAX_FILE_BYTES) return Response.json({ error: "That PDF is too large. Try a smaller file." }, { status: 413 });
  let text = "";
  try {
    const { extractText } = await import("unpdf");
    const result = await extractText(new Uint8Array(buf), { mergePages: true });
    text = (typeof result.text === "string" ? result.text : "").trim();
  } catch {}
  // No usable text layer (a scanned PDF): fall back to sending the PDF
  // itself to the model as a native document block, exactly like a photo.
  if (text.length < 40) {
    logExtractTurn(c, "pdf-local", false).catch(() => {});
    return Response.json({ fallback: true });
  }
  logExtractTurn(c, "pdf-local", true).catch(() => {});
  return Response.json({ text });
}

async function handleDocx(c, body) {
  const buf = decodeBase64(body.data);
  if (!buf || buf.length > MAX_FILE_BYTES) return Response.json({ error: "That document is too large. Try a smaller file." }, { status: 413 });
  let text = "";
  try { text = extractDocxText(buf); } catch {}
  logExtractTurn(c, "docx-local", !!text.trim()).catch(() => {});
  if (!text.trim()) return Response.json({ error: "I couldn't read that document. Try saving it as a plain text file." }, { status: 422 });
  return Response.json({ text });
}

function decodeBase64(data) {
  if (typeof data !== "string" || !data) return null;
  try { return Buffer.from(data, "base64"); } catch { return null; }
}

// ---- URL fetch, dependency-free --------------------------------------------

// Basic SSRF hardening: only ever fetch a public http(s) URL, never anything
// that could reach this server's own network (loopback, link-local, private
// ranges, the cloud metadata address). Not exhaustive DNS-rebinding
// protection, just a floor against the obvious cases for a study-link fetch.
function isPrivateHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h === "169.254.169.254") return true;
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0) return true;
  }
  if (h.startsWith("[") || h.includes(":")) return true; // no IPv6 literals, keeps the check simple and conservative
  return false;
}

async function handleUrl(c, body) {
  let url;
  try { url = new URL(String(body.url || "").trim()); } catch { return Response.json({ error: "That doesn't look like a valid URL." }, { status: 400 }); }
  if (url.protocol !== "http:" && url.protocol !== "https:") return Response.json({ error: "Only http and https links are supported." }, { status: 400 });
  if (isPrivateHost(url.hostname)) return Response.json({ error: "That link isn't reachable." }, { status: 400 });

  let html;
  try {
    const res = await fetch(url.toString(), { redirect: "follow", signal: AbortSignal.timeout(15000) });
    if (!res.ok) { logExtractTurn(c, "url-local", false).catch(() => {}); return Response.json({ error: "Couldn't reach that page. Check the link and try again." }, { status: 502 }); }
    html = await res.text();
  } catch {
    logExtractTurn(c, "url-local", false).catch(() => {});
    return Response.json({ error: "Couldn't reach that page. Check the link and try again." }, { status: 502 });
  }

  const text = stripHtml(html);
  if (!isReadable(text)) {
    logExtractTurn(c, "url-local", false).catch(() => {});
    return Response.json({ error: "That page didn't have readable text to pull from. Try pasting the text directly, or a different link." }, { status: 422 });
  }
  logExtractTurn(c, "url-local", true).catch(() => {});
  return Response.json({ text });
}

const NAMED_ENTITIES = {
  nbsp: " ", copy: "©", reg: "®", trade: "™",
  mdash: "—", ndash: "–", hellip: "…",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
};
function decodeEntities(s) {
  return s
    .replace(/&(nbsp|copy|reg|trade|mdash|ndash|hellip|lsquo|rsquo|ldquo|rdquo);/g, (_, name) => NAMED_ENTITIES[name])
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

function stripHtml(html) {
  let t = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|section|article|h[1-6]|li|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  t = decodeEntities(t);
  return t.replace(/[ \t]+/g, " ").replace(/ *\n *\n+/g, "\n\n").replace(/\n[ \t]+/g, "\n").trim();
}

// Unreadable = too short, or too little of it looks like real prose (a
// paywall/cookie-wall/JS-only page collapses to mostly nav chrome and
// boilerplate once tags are stripped). Checked on the extracted text, in
// code - never left to the model to judge.
function isReadable(text) {
  if (text.length < 200) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 40) return false;
  const realWords = words.filter((w) => /[a-zA-Z]{2,}/.test(w));
  return realWords.length / words.length > 0.6;
}
