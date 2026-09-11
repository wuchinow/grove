// ---- sound.js ---------------------------------------------------------------
// Short Web Audio confirmation tones. No audio files, no dependency - same
// reasoning as the hand-drawn line icons in Icon.js. A miss and a solid
// answer share the same family and volume; only the contour (falling vs.
// rising) differs, so no sound is ever a verdict (UX-RULES.md).

let ctx = null;

// Autoplay policies block audio before a user gesture. Call this once, on
// the first tap anywhere in the app (see page.js), to unlock it.
export function prime() {
  if (ctx) return;
  const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return;
  try { ctx = new AC(); } catch {}
}

function tone(freq, duration, delay = 0, gain = 0.05) {
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

// Soft descending pair on a miss, brighter rising pair on solid. Same two
// notes' worth of volume and duration either way.
export function playMiss() {
  tone(392, 0.16, 0);
  tone(330, 0.18, 0.1);
}
export function playSolid() {
  tone(392, 0.14, 0);
  tone(494, 0.18, 0.1);
}
// A short ascending three-note phrase for a completed session / freshly
// planted grove arriving.
export function playSessionComplete() {
  tone(440, 0.12, 0);
  tone(554, 0.12, 0.09);
  tone(659, 0.22, 0.18);
}

// ---- preference -------------------------------------------------------------
// Signed-in and legacy students keep this on their Supabase profile
// (profile.soundOn); a guest has no profile, so it lives in localStorage
// instead. Both default to on.
const LS_KEY = "grove_sound_on";

export function readGuestSoundPref() {
  try {
    const v = window.localStorage.getItem(LS_KEY);
    return v === null ? true : v === "1";
  } catch { return true; }
}
function writeGuestSoundPref(on) {
  try { window.localStorage.setItem(LS_KEY, on ? "1" : "0"); } catch {}
}

export function soundEnabled(student, profile) {
  return student ? (profile && profile.soundOn) !== false : readGuestSoundPref();
}

// setProfile is the existing autosave path (see useGrove.js) - reused here
// rather than a new write path, same as avatar and the snake best score.
export function setSoundEnabled(student, profile, setProfile, on) {
  if (student) setProfile({ ...(profile || {}), soundOn: on });
  else writeGuestSoundPref(on);
}
