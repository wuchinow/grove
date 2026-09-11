import zlib from "zlib";

// ---- DOCX text extraction ---------------------------------------------------
// A .docx is a ZIP archive; the document body lives at word/document.xml as
// runs of <w:t> inside <w:p> paragraphs. Rather than pull in a ZIP library,
// this walks the ZIP central directory by hand (it's a small, fixed binary
// layout) and inflates the one entry we need with Node's built-in zlib -
// DOCX entries use plain DEFLATE, so no extra dependency is needed.

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

function findEOCD(buf) {
  const maxBack = Math.min(buf.length, 65557); // 22-byte record + max 65535-byte comment
  const start = buf.length - maxBack;
  for (let i = buf.length - 22; i >= start; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  return -1;
}

// Reads the central directory and returns the ZIP entry (compression method,
// compressed size, local-header offset) for one exact filename, or null.
function findEntry(buf, filename) {
  const eocd = findEOCD(buf);
  if (eocd === -1) throw new Error("not a zip");
  const count = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(offset) !== CD_SIG) throw new Error("bad central directory");
    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString("utf8", offset + 46, offset + 46 + nameLen);
    if (name === filename) return { method, compressedSize, localOffset };
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

function readEntryData(buf, entry) {
  const { localOffset, compressedSize, method } = entry;
  if (buf.readUInt32LE(localOffset) !== LOCAL_SIG) throw new Error("bad local header");
  const nameLen = buf.readUInt16LE(localOffset + 26);
  const extraLen = buf.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + nameLen + extraLen;
  const raw = buf.subarray(dataStart, dataStart + compressedSize);
  if (method === 0) return raw;
  if (method === 8) return zlib.inflateRawSync(raw);
  throw new Error("unsupported compression method " + method);
}

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

// Paragraphs, each the concatenation of its own <w:t> runs, joined with a
// blank line so the result matches splitParagraphs' blank-line convention.
function paragraphsFromXml(xml) {
  const paraRe = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
  const textRe = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  const paras = [];
  let pm;
  while ((pm = paraRe.exec(xml))) {
    let text = "";
    let tm;
    textRe.lastIndex = 0;
    while ((tm = textRe.exec(pm[1]))) text += decodeEntities(tm[1]);
    if (text.trim()) paras.push(text.trim());
  }
  return paras;
}

// Returns the document's plain text, or "" if it isn't a readable .docx.
export function extractDocxText(buf) {
  const entry = findEntry(buf, "word/document.xml");
  if (!entry) return "";
  const xml = readEntryData(buf, entry).toString("utf8");
  return paragraphsFromXml(xml).join("\n\n");
}
