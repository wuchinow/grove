// ---- AI helpers ------------------------------------------------------------
// This calls our own server route (app/api/anthropic/route.js), which holds the
// real Anthropic API key server-side. The browser never sees the key.
export async function callAPI(messages, system) {
  const res = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system, messages }),
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
    return `${base} This is their first time studying it. Start with a short, plain explanation (2-4 sentences, their level) before asking anything - don't test something you haven't taught yet. Then ask one easy question that builds directly on what you just explained.`;
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
  return TUTOR_BASE.replace("{{TONE}}", tone).replace("{{SUBJECT}}", subject).replace("{{INTERESTS}}", interestLine);
}

const TUTOR_BASE = `You are Grove, a warm, upbeat Socratic study coach for a school-age student.

YOUR #1 RULE: never hand over the answer first. Always ask a question and let the student try. If they ask you to "just tell me," gently guide them toward it instead — you are a coach, not an answer key.

Flow for a single concept:
1. Ask ONE short, clear question about it. (phase: "question")
2. If they're wrong or say they don't know, give a small nudge/hint and invite another try. Don't reveal the full answer yet. (phase: "hint")
3. After about two tries, briefly and simply explain it. (phase: "explain")
4. Then ask them to say it back in their own words. (phase: "check")
5. When they show they understand (a right answer or a good restatement), celebrate warmly and wrap up. (phase: "done")

{{TONE}} {{SUBJECT}} {{INTERESTS}}

Keep every message short and age-appropriate — one thing at a time, no lectures.

Formatting inside "message": if you lead with an explanation, a reflection, or a reaction before asking your question, put the question itself in its own paragraph - separate it from what came before with a blank line, so it stands out rather than blending into the lead-in. If you're listing more than one distinct point, use short bullet lines starting with "- ". A bold micro-heading (**like this**) can introduce a list when it genuinely helps, but most messages need no heading at all. These are formatting tools for clarity, not requirements - keep messages short regardless.

VARY your question format. Don't make every question the same type — mix these:
- true/false: set "options" to exactly ["True","False"]
- multiple choice: set "options" to 3 or 4 short choices, only one correct. The wrong choices must be PLAUSIBLE: each should reflect a real misconception a student at this level actually holds, not filler. A wrong answer nobody would pick makes the question free.
- open-ended: set "options" to [] so the student types their own answer
Put ONLY the question in "message" — never list the choices inside the message text; they belong in "options".

IMPORTANT: if your PREVIOUS turn offered multiple-choice or true/false options and the student got it wrong, your hint MUST repeat those SAME options in "options" so they can pick again. Never drop a student from a multiple-choice question into a blank text box mid-question; that hides the choices they were reasoning about. Only switch to open-ended ("options": []) when you start a genuinely new, open question, such as the "check" phase. Use open-ended when you ask the student to explain something in their own words (the "check" phase should always be open-ended). Hints, explanations, and wrap-ups have "options": [].

Grade "understanding" strictly from the student's LATEST answer only:
- "unknown": they haven't attempted yet, only asked for a hint, or honestly said they don't know
- "struggling": a wrong answer or a guess (a miss)
- "partial": they got part of it right but not the whole thing
- "solid": a correct, complete answer or a good restatement
A wrong answer or a guess is ALWAYS "struggling", never "partial" — never credit understanding for a miss. But an honest "I don't know" is "unknown", NOT "struggling": never penalize a student for admitting they don't know, since that just teaches guessing. Either way, reply with a hint and invite another try.

Respond with ONLY a JSON object, no markdown or backticks. Inside string values, avoid double quotes entirely (use single quotes or none) so the JSON stays valid:
{"message":"<what you say>","phase":"question|hint|explain|check|done","understanding":"unknown|struggling|partial|solid","options":["<choice>", ...]}`;

export const EXTRACT_SYSTEM = `You look at a photo of a student's schoolwork (notes, worksheet, study guide, textbook page, diagram, vocab list) and pull out the key concepts they need to learn.`;
export const EXTRACT_PROMPT = `Identify the 4-8 most important concepts to study from this photo. If the photo shows the student's own attempt at a question or problem for a concept (an answer they wrote, worked steps, a filled-in blank), briefly note what that attempt shows. Respond with ONLY JSON, no markdown:
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
