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
  return { tiles, tileW, crop, width: tiles * tileW, trees };
}

const GAP = 6;
const overlaps = (a, b) => a.x < b.x + b.w + 4 && b.x < a.x + a.w + 4 && a.y < b.y + b.h + 4 && b.y < a.y + a.h + 4;

// Places each label (measured size `w` x `h`) next to its tree, front trees
// first: under the foot if that's free and inside the band, otherwise above
// the canopy, otherwise the nearest free step below or above. `band` is the
// visible strip between the floating header and the bar, in plate pixels,
// plus the plate's horizontal extent. Returns { [id]: { x, y } }.
export function placeLabels(items, band) {
  const placed = [];
  const out = {};
  const clampX = (x, w) => Math.min(Math.max(x, band.minX + 4), band.maxX - w - 4);
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
