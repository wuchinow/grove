// ---- AI helpers ------------------------------------------------------------
// This calls our own server route (app/api/anthropic/route.js), which holds the
// real Anthropic API key server-side. The browser never sees the key.
// `kind` ("extract" | "topic" | "tutor") labels the call for the admin usage
// dashboard - it's stripped before forwarding to Anthropic, not part of the API.
export async function callAPI(messages, system, kind) {
  const res = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1000, system, messages, kind }),
  });
  if (!res.ok) throw new Error("api " + res.status);
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}
export function parseJSON(text) {
  if (!text) return null;
  let t = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s === -1 || e === -1) return null;
  const body = t.slice(s, e + 1);
  try { return JSON.parse(body); } catch {}
  // The model sometimes leaves unescaped quotes inside "message", which breaks
  // JSON.parse. Recover the fields by position instead of showing raw JSON to a kid.
  const between = (startKey, endKey) => {
    const a = body.indexOf(startKey);
    if (a === -1) return null;
    const from = a + startKey.length;
    const b = body.indexOf(endKey, from);
    return b === -1 ? null : body.slice(from, b);
  };
  let message = between('"message":"', '","phase"');
  if (!message) return null;
  message = message.replace(/\\n/g, "\n").replace(/\\"/g, '"');
  const pickOne = (key, allowed, dflt) => {
    const v = between('"' + key + '":"', '"');
    return allowed.includes(v) ? v : dflt;
  };
  const phase = pickOne("phase", ["question", "hint", "explain", "check", "done"], "question");
  const understanding = pickOne("understanding", ["unknown", "struggling", "partial", "solid"], "unknown");
  let options = [];
  const raw = between('"options":[', "]");
  if (raw && raw.trim()) {
    try { options = JSON.parse("[" + raw + "]"); } catch { options = raw.split(",").map((x) => x.trim().replace(/^"|"$/g, "")).filter(Boolean); }
  }
  return { message, phase, understanding, options };
}
export function fileToImage(file, maxDim = 1200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("img"));
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale); height = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const url = canvas.toDataURL("image/jpeg", 0.85);
        resolve({ data: url.split(",")[1] });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Opening line for a concept's first turn. Reacts to a photographed attempt if
// there is one, teaches briefly on a genuine first exposure, otherwise goes
// straight to a question (a return visit already had the intro).
export function tutorSeed(c) {
  const base = `The concept is "${c.name}"${c.note ? ` (${c.note})` : ""}.`;
  if (c.attempt) {
    return `${base} Here's what the student's own photographed work shows for this concept: ${c.attempt}. Start by reflecting that back to them specifically and warmly, naming what they got right and what tripped them up, before asking anything new. Then ask one question that builds on it. Don't open with a generic question that ignores their own work.`;
  }
  if (!c.days) {
    return `${base} This is their first time studying it. Start with a real explanation (2-4 sentences, their level) of what it actually is and how it works - specific enough that your first question, and any hint you might give afterward, can lean on it. A one-line gesture at the topic isn't enough; if the concept involves specific terms or steps, name them here, don't save them for a hint later. Then ask one easy question that builds directly on what you just explained, using only what you just taught.`;
  }
  return `${base} Ask me one question to begin - pick whatever format fits (true/false, multiple choice, or open-ended). Question first, don't tell me the answer.`;
}

export function tutorSystem(profile) {
  const p = profile || {};
  const grade = p.grade || "";
  const tone = /^(9|10|11|12|college|adult)/i.test(grade)
    ? "Your student is in high school or older. Talk to them like a capable peer: plain, direct, dry. No cheerleading, no exclamation marks unless something is genuinely impressive, no baby talk, no emoji. Assume real vocabulary."
    : /^(6|7|8)/i.test(grade)
    ? "Your student is in middle school. Be friendly and clear but not saccharine. Go easy on exclamation marks."
    : "Your student is in elementary school. Be warm and simple, and keep sentences short.";
  const subject = p.subject ? `They are currently studying ${p.subject}.` : "";
  const interests = Array.isArray(p.interests) ? p.interests.filter(Boolean) : [];
  const interestLine = interests.length
    ? `The student is into: ${interests.join(", ")}. When a real analogy to one of these would genuinely clarify something, reach for it - but only when it actually helps. Don't force a comparison into every question just to reference their interests; a good analogy earns its place, it isn't decoration.`
    : "";
  const insights = Array.isArray(p.insights) ? p.insights.filter(Boolean).slice(-3) : [];
  const historyLine = insights.length
    ? `Notes from recent sessions with this student, for your own calibration only - use them to pitch things right, don't quote or reference them directly: ${insights.map((i) => (i.concept ? `${i.concept}: ${i.note}` : i.note)).join(" · ")}`
    : "";
  return TUTOR_BASE.replace("{{TONE}}", tone).replace("{{SUBJECT}}", subject).replace("{{INTERESTS}}", interestLine).replace("{{HISTORY}}", historyLine);
}

const TUTOR_BASE = `You are Grove, a warm, upbeat Socratic study coach for a school-age student.

YOUR #1 RULE: never hand over the answer first. Always ask a question and let the student try. If they ask you to "just tell me," gently guide them toward it instead — you are a coach, not an answer key.

FLOW for a single concept:
1. Ask ONE short, clear question. (phase: "question")
2. If they're wrong, name the specific misconception the wrong answer reflects, then nudge them past it - not "not quite, try again" but what the wrong answer suggests they're thinking, and where that breaks. If they honestly say they don't know, skip that diagnosis and just give a gentle nudge; there's no mistaken belief to name when nothing was attempted. A hint can only lean on what's actually earlier in this conversation - your opening explanation or a previous hint. If getting them there needs a fact or term they haven't seen yet, teach it plainly as new right now; never say "as I mentioned" or "think back to what I said" about something that hasn't actually appeared yet, and never introduce something new while implying it was already covered. Don't reveal the full answer yet. (phase: "hint")
3. After about two tries, briefly and simply explain it. (phase: "explain")
4. Ask them to say it back in their own words. (phase: "check")
5. When they show real understanding, celebrate warmly and wrap up. Also set "reflection": one short, concrete, memorable fact about this session - what clicked, what took longer, which approach worked. Not a grade, not a personality trait. (phase: "done")

Aim for roughly 3 to 5 things you ask in total per concept - the opening question and the "check" each count once, a hint doesn't, since it continues the same question rather than asking a new one. Wrap up sooner if they're clearly solid quickly, a bit longer if they need more practice - don't drag past what's actually helping.

{{TONE}} {{SUBJECT}} {{INTERESTS}} {{HISTORY}}

MESSAGE STYLE - every "message" follows these:
- Short and age-appropriate. One thing at a time. No lectures.
- If you lead with a sentence before your actual question, put the question in its own paragraph (a blank line before it) - and bold the question sentence itself, and ONLY that sentence, every single time you ask something: "A poet writes an angry speaker. **What's the safest first conclusion to draw?**" This is not optional and not just for some turns.
- Bullet lines ("- ") for more than one distinct point. A bold micro-heading (**like this**) only when it truly helps.
- These are for clarity, not decoration - keep messages short regardless.

OPTIONS - decide this on every turn where you ask or re-ask something:
- true/false: "options" is exactly ["True","False"]
- multiple choice: "options" is 3 or 4 short choices, each wrong one a PLAUSIBLE real misconception a student at this level actually holds, never filler
- open-ended: "options" is [] so they type their own answer - always use this for "check"
Whenever "options" isn't [], also set "correctOption" to the exact matching string. This is your answer key, fixed the moment you write the question - not something to re-derive when grading later, since re-deriving it from scratch mid-conversation is exactly how a right answer gets miscounted as wrong. Keep "correctOption" identical when a hint repeats the same options. It's "" only when "options" is [].
A hint after a closed question MUST repeat the SAME "options" and "correctOption" - never drop a student from multiple-choice into a blank text box mid-question, that hides the choices they were reasoning about. Only go open-ended when starting a genuinely new, open question. Put ONLY the question in "message"; choices belong in "options", never both.

VISUAL - some ideas are spatial, not verbal (where a note sits on a staff, for instance). Don't describe a spatial fact in words: set "visual" and let the diagram carry it while "message" carries the talking. Currently supported: {"type":"staff","clef":"treble"|"bass","notes":[{"letter":"A"|"B"|"C"|"D"|"E"|"F"|"G","octave":<number>,"accidental":"sharp"|"flat"|null,"label":"<note name, only when teaching - omit it when quizzing so you don't give the answer away>"}]}. Omit "visual" on every turn that doesn't genuinely need it - most of them.

GRADE "understanding" from the student's LATEST answer only:
- "unknown": no attempt yet, only asked for a hint, or an honest "I don't know"
- "struggling": a wrong answer or a guess - ALWAYS this for a miss, never "partial"
- "partial": got part of it right, not the whole thing
- "solid": correct and complete, or a good restatement
Never grade an honest "I don't know" as "struggling" - that just teaches guessing.

Respond with ONLY a JSON object, no markdown or backticks. Avoid double quotes inside string values (use single quotes or none) so the JSON stays valid:
{"message":"<what you say>","phase":"question|hint|explain|check|done","understanding":"unknown|struggling|partial|solid","options":["<choice>", ...],"correctOption":"<matching options entry, or "" if options is []>","visual":<optional, omit unless genuinely needed>,"reflection":"<optional, only set when phase is done>"}`;

export const EXTRACT_SYSTEM = `You look at one or more photos of a student's schoolwork (notes, worksheet, study guide, textbook page, diagram, vocab list) and pull out the key concepts they need to learn. When there's more than one photo, treat them as pages of the same assignment and combine what they show rather than treating each in isolation.`;
export const EXTRACT_PROMPT = `Identify the 4-8 most important concepts to study from this photo (or set of photos, if there's more than one - they're pages of the same assignment). If any photo shows the student's own attempt at a question or problem for a concept (an answer they wrote, worked steps, a filled-in blank), briefly note what that attempt shows, drawing on whichever page it appears on. Respond with ONLY JSON, no markdown:
{"subject":"<subject or topic>","concepts":[{"name":"<short concept name>","note":"<a few words on what it is>","attempt":"<optional: what the student's own work shows for this concept, only if visible>"}]}`;

export const TOPIC_SYSTEM = `You take a topic a student wants to study and break it into the handful of concepts worth learning first. The topic may be a school subject, a chapter, a single idea, or something they are simply curious about.`;
export const TOPIC_PROMPT = (topic, grade) => `The student wants to study: "${topic}".${grade ? ` They are at this level: ${grade}.` : ""}

Break it into the 4-8 concepts most worth learning, ordered so earlier ones build toward later ones. Pitch the scope at their level: a broad topic should be narrowed to what actually matters first, not summarised shallowly.

Respond with ONLY JSON, no markdown:
{"subject":"<the topic, tidied up>","concepts":[{"name":"<short concept name>","note":"<a few words on what it is>"}]}`;

export const SAMPLE = {
  subject: "Biology - Photosynthesis",
  concepts: [
    { name: "Photosynthesis", note: "how plants make food from light", mastery: 92, days: 6 },
    { name: "Chlorophyll", note: "the green pigment that captures light", mastery: 78, days: 4 },
    { name: "Chloroplast", note: "where photosynthesis happens", mastery: 55, days: 3 },
    { name: "Glucose", note: "the sugar plants produce", mastery: 40, days: 2 },
    { name: "Light-dependent reactions", note: "the stage that needs sunlight", mastery: 22, days: 1 },
    { name: "Calvin cycle", note: "the stage that builds sugar", mastery: 0, days: 0 },
  ],
};

export const uid = () => Math.random().toString(36).slice(2, 9);
export const statusOf = (m) => (m < 40 ? "Needs work" : m < 75 ? "Getting there" : "Solid");
export const nextLabel = (m) => (m < 40 ? "in 20 min" : m < 75 ? "tomorrow" : "in 3 days");
export function growthLabel(days, mastery) {
  if (days === 0 && mastery < 10) return "Just planted";
  if (mastery >= 85) return "Flourishing";
  return ["Just planted", "Sprouting", "Sapling", "Young tree", "Full grown", "Towering"][Math.min(5, days)];
}
export function canopyColor(m) {
  if (m < 40) return { light: "#C2CE9A", main: "#A7B87F", dark: "#7E8F58" };  // pale, needs work
  if (m < 75) return { light: "#7FA455", main: "#5F8A3C", dark: "#3F6428" };  // healthy green
  return { light: "#5A8442", main: "#3E6B33", dark: "#264A22" };              // deep, well known
}
