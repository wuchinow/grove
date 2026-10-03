// ---- Scene -------------------------------------------------------------------
// Where Home's trees stand on the painted plate, how big each one is drawn,
// and where its label goes. Pure functions over numbers, so the layout is
// unit-tested (scene.test.mjs) and the component only measures and draws.
//
// Everything is in plate pixels: the plate is drawn as tall as the viewport
// (wider than a phone, so the scene pans sideways), and anchors are fractions
// of it. Past seven trees the plate repeats to the right, every other copy
// mirrored, so the seams match; each copy carries the same seven anchors.
// Repeated copies leave out the big framing trunks at the plate's two edges
// (REPEAT), so copies meet at bushes and path, never as a mirrored V of trunk.
import { stageOf } from "./growth.js";
import { SCENE_ART } from "./scene-art.js";

export const PLATE = { src: "/scenes/peter/meadow.webp", w: 1664, h: 928 };
export const PLATE_ASPECT = PLATE.w / PLATE.h;
export const REPEAT = { left: 0.12, right: 0.88 };

// A tree's drawn height is plate height x FULL_HEIGHT x anchor depth x the
// stage's share of full size. scripts/cutout-trees.py sizes the art from the
// same numbers; change them together.
export const FULL_HEIGHT = 0.4;
export const STAGE_CURVE = [0.12, 0.17, 0.26, 0.38, 0.52, 0.66, 0.82, 1];

// The seven anchors on this plate, in fill order: x and the foot's y as
// fractions of the plate, depth as a scale (far rows are smaller). The first
// three sit near the middle, so a new grove's trees are in the view that
// opens centred; no far anchor stands straight behind a near one.
export const ANCHORS = [
  { x: 0.5, y: 0.585, depth: 0.8 },   // middle row, centre
  { x: 0.38, y: 0.475, depth: 0.62 }, // far row, left of centre
  { x: 0.62, y: 0.475, depth: 0.62 }, // far row, right of centre
  { x: 0.3, y: 0.71, depth: 0.96 },   // near row, left
  { x: 0.7, y: 0.71, depth: 0.96 },   // near row, right
  { x: 0.17, y: 0.585, depth: 0.8 },  // middle row, left
  { x: 0.83, y: 0.6, depth: 0.8 },    // middle row, right
];

// The anchors' average horizontal gap, as a fraction of the plate width. The
// scene ends this far past its right-most tree.
export const ANCHOR_SPACING = (Math.max(...ANCHORS.map((a) => a.x)) - Math.min(...ANCHORS.map((a) => a.x))) / (ANCHORS.length - 1);

// One species for every tree for now; the art is laid out per species so a
// second one only needs its files and a rule here.
export const speciesOf = () => "oak";
export const treeArt = (species, stage) => `/scenes/${species}/stage-${stage}.webp`;

// The plate's drawn size: as tall as the viewport, or taller when a very wide
// window would otherwise leave a gap at the sides.
export function plateSize(vw, vh) {
  const h = Math.max(vh, vw / PLATE_ASPECT);
  return { w: Math.round(h * PLATE_ASPECT), h: Math.round(h) };
}

// Every tree's place, in plate pixels. A tree takes the anchor of its
// position in `concepts`, so growing never moves it (removing one does: every
// tree after it moves up an anchor). `z` orders drawing back to front.
// The scene ends one anchor spacing past its right-most tree, so it doesn't
// pan on into empty plate; never narrower than one full copy, and never past
// the last copy's painted edge.
export function layoutScene(concepts, plateW, plateH) {
  const per = ANCHORS.length;
  const tiles = Math.max(1, Math.ceil(concepts.length / per));
  // One copy shows the whole plate; repeated copies show its REPEAT window.
  const crop = tiles > 1 ? REPEAT : { left: 0, right: 1 };
  const tileW = (crop.right - crop.left) * plateW;
  const trees = concepts.map((c, i) => {
    const tile = Math.floor(i / per);
    const a = ANCHORS[i % per];
    const mirrored = tile % 2 === 1;
    const stage = stageOf(c.days);
    const species = speciesOf(c);
    const art = SCENE_ART[species][stage];
    const h = plateH * FULL_HEIGHT * a.depth * STAGE_CURVE[stage];
    const w = (h * art.w) / art.h;
    const footX = tile * tileW + (mirrored ? crop.right - a.x : a.x - crop.left) * plateW;
    const footY = a.y * plateH;
    return { id: c.id, stage, species, mirrored, depth: a.depth, footX, footY, w, h, left: footX - art.footX * w, top: footY - art.footY * h, art };
  });
  [...trees].sort((p, q) => p.footY - q.footY || p.footX - q.footX).forEach((t, rank) => { t.z = rank + 1; });
  const rightmost = trees.reduce((m, t) => Math.max(m, t.footX), 0);
  const width = Math.min(tiles * tileW, Math.max(tileW, rightmost + ANCHOR_SPACING * plateW));
  return { tiles, tileW, crop, width, trees };
}

const GAP = 6;
const overlaps = (a, b) => a.x < b.x + b.w + 4 && b.x < a.x + a.w + 4 && a.y < b.y + b.h + 4 && b.y < a.y + a.h + 4;

// Each label's vertical slot, decided once per layout for the whole scene.
// Places each label (measured size `w` x `h`) next to its tree, front trees
// first: under the foot if that's free and inside the band, otherwise above
// the canopy, otherwise the nearest free step below or above. `band` is the
// visible strip between the floating header and the bar, in plate pixels,
// plus the horizontal limits. Returns { [id]: { x, y } }.
export function placeLabels(items, band) {
  const placed = [];
  const out = {};
  const clampX = (x, w) => Math.min(Math.max(x, band.minX), band.maxX - w);
  const inBand = (r) => r.y >= band.minY && r.y + r.h <= band.maxY;
  for (const it of [...items].sort((a, b) => b.footY - a.footY || a.footX - b.footX)) {
    const x = clampX(it.footX - it.w / 2, it.w);
    const below = it.footY + GAP;
    const above = it.top - it.h - GAP;
    const step = it.h + GAP;
    const ys = [below, above];
    for (let k = 1; k <= 4; k++) ys.push(below + k * step, above - k * step);
    const candidates = ys.map((y) => ({ x, y, w: it.w, h: it.h }));
    let pick = candidates.find((r) => inBand(r) && !placed.some((p) => overlaps(p, r)));
    if (!pick) {
      // Nothing fully free: the in-band spot that overlaps least.
      const area = (r) => placed.reduce((n, p) => n + (overlaps(p, r) ? Math.max(0, Math.min(p.x + p.w, r.x + r.w) - Math.max(p.x, r.x)) * Math.max(0, Math.min(p.y + p.h, r.y + r.h) - Math.max(p.y, r.y)) : 0), 0);
      const inside = candidates.filter(inBand);
      pick = (inside.length ? inside : candidates).reduce((best, r) => (area(r) < area(best) ? r : best));
    }
    placed.push(pick);
    out[it.id] = { x: pick.x, y: pick.y };
  }
  return out;
}

// While the scene pans, labels keep the slot placeLabels gave them and only
// move sideways: a label shows while its tree's foot is on screen, clamped
// LABEL_EDGE inside either edge. To keep one from flickering at the edge, a
// hidden label shows only once the foot is LABEL_ENTER inside the window,
// and a shown one hides only once the foot has left it. Where two clamped
// labels would overlap, the tree further back (smaller foot y) loses its
// label; nothing moves vertically. `view` is { sx: scrollLeft, vw: width }
// in plate pixels. Returns every label's clamped position and the set shown.
export const LABEL_EDGE = 8;
export const LABEL_ENTER = 12;

export function panLabels(items, slots, view, shownBefore = new Set()) {
  const { sx, vw } = view;
  const left = sx + LABEL_EDGE;
  const right = sx + vw - LABEL_EDGE;
  const pos = {};
  const shown = new Set();
  const accepted = [];
  for (const it of [...items].sort((a, b) => b.footY - a.footY || a.footX - b.footX)) {
    const margin = shownBefore.has(it.id) ? 0 : LABEL_ENTER;
    const footIn = it.footX >= sx + margin && it.footX <= sx + vw - margin;
    const r = { x: Math.min(Math.max(it.footX - it.w / 2, left), right - it.w), y: slots[it.id].y, w: it.w, h: it.h };
    pos[it.id] = { x: r.x, y: r.y };
    if (!footIn || accepted.some((p) => overlaps(p, r))) continue;
    accepted.push(r);
    shown.add(it.id);
  }
  return { pos, shown };
}

// What the scene does about its scroll position when its layout changes.
// `state` is carried from one call to the next (start from OPENING); `now` is
// { key, hasTrees, focusId }: the grove the scene is showing ("" for none),
// whether it has trees, and a just-planted or just-grown tree if there is one.
// Returns { centre, panTo, state }.
//   - A grove's trees appearing for the first time: centre (the component picks
//     the first tree on a phone, the plate on a wide screen), then pan to the
//     focus tree. Centring is skipped once the student has scrolled the scene
//     themselves; the pan to a just-planted or just-grown tree still happens.
//   - Anything changing inside the same grove (planting, removing, a session,
//     emptying it and planting again): nothing.
//   - Going from one grove to another forgets the manual scroll, since it's a
//     different place. A grove arriving where there was none (a late load, or
//     opening the sample) keeps it.
//   - An empty scene is centred on the plate once, at first layout.
export const OPENING = { key: null, centred: false, placed: false, userScrolled: false };

export function openingMove(state, now) {
  let { key, centred, placed, userScrolled } = state;
  if (now.key !== key) {
    if (key) userScrolled = false;
    key = now.key;
    centred = false;
  }
  let centre = false;
  let panTo = null;
  if (now.hasTrees && !centred) {
    centred = true;
    centre = !userScrolled;
    panTo = now.focusId || null;
  } else if (!now.hasTrees && !placed) {
    centre = !userScrolled;
  }
  placed = true;
  return { centre, panTo, state: { key, centred, placed, userScrolled } };
}
