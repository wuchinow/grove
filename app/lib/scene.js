// ---- Scene -------------------------------------------------------------------
// Where Home's trees stand on the painted plate, how big each one is drawn,
// and where its label goes. Pure functions over numbers, so the layout is
// unit-tested (scene.test.mjs) and the component only measures and draws.
//
// Two plates. A portrait screen gets the tall plate, which fits the screen
// with no pan and holds every tree at once (the second half of this file). Any
// other screen gets the wide plate, described here.
//
// Everything is in plate pixels: the plate is drawn as tall as the viewport
// (wider than a phone, so the scene pans sideways), and anchors are fractions
// of it. Past seven trees the plate repeats to the right, every other copy
// mirrored, so the seams match; each copy carries the same seven anchors.
// Repeated copies leave out the big framing trunks at the plate's two edges
// (REPEAT), so copies meet at bushes and path, never as a mirrored V of trunk.
import { stageOf } from "./growth.js";
import { SCENE_ART } from "./scene-art.js";
import { PORTRAIT_PATH } from "./scene-path.js";

export const PLATES = {
  wide: { src: "/scenes/peter/meadow.webp", w: 1664, h: 928 },
  portrait: { src: "/scenes/peter/meadow-portrait.webp", w: 1024, h: 1792 },
};
export const plateFor = (vw, vh) => (vw < vh ? "portrait" : "wide");
export const PLATE = PLATES.wide;
export const PLATE_ASPECT = PLATE.w / PLATE.h;
export const REPEAT = { left: 0.12, right: 0.88 };

// A tree's drawn height is plate height x FULL_HEIGHT x anchor depth x the
// stage's share of full size. scripts/cutout-trees.py sizes the art from the
// same numbers; change them together.
export const FULL_HEIGHT = 0.4;
export const STAGE_CURVE = [0.12, 0.17, 0.26, 0.38, 0.52, 0.66, 0.82, 1];

// The planted stage's art is an acorn in a wide, low mound, so sizing it by
// height like the trees makes it read bigger than a sprout. It is sized by
// width instead: at most this share of the sprout's drawn width at the same
// anchor, on both plates.
export const PLANTED_MAX_WIDTH = 0.7;
function plantedSize(species, w, sproutH) {
  const sprout = SCENE_ART[species][1];
  const art = SCENE_ART[species][0];
  const width = Math.min(w, PLANTED_MAX_WIDTH * sproutH * (sprout.w / sprout.h));
  return { w: width, h: (width * art.h) / art.w };
}

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
    let h = plateH * FULL_HEIGHT * a.depth * STAGE_CURVE[stage];
    let w = (h * art.w) / art.h;
    if (stage === 0) ({ w, h } = plantedSize(species, w, plateH * FULL_HEIGHT * a.depth * STAGE_CURVE[1]));
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
// Whether a rect touches a canopy. A canopy marked `round` is the ellipse
// inside its box (a tree's crown doesn't fill the corners of its drawing).
function onCanopy(o, r) {
  if (!o.round) return overlaps(o, r);
  const cx = o.x + o.w / 2;
  const cy = o.y + o.h / 2;
  const px = Math.min(Math.max(cx, r.x), r.x + r.w);
  const py = Math.min(Math.max(cy, r.y), r.y + r.h);
  return ((px - cx) / (o.w / 2 + 3)) ** 2 + ((py - cy) / (o.h / 2 + 3)) ** 2 < 1;
}
// How much higher a tag above its tree may sit if just above is taken.
const ABOVE_STEP = 10;
// How far a leaning tag's near end reaches past its pin.
const LABEL_LEAN = 10;
const overlaps = (a, b) => a.x < b.x + b.w + 4 && b.x < a.x + a.w + 4 && a.y < b.y + b.h + 4 && b.y < a.y + a.h + 4;

// Each label's vertical slot, decided once per layout for the whole scene.
// Places each label (measured size `w` x `h`) next to its tree, front trees
// first: under the foot if that's free and inside the band, otherwise above
// the canopy, otherwise the nearest free step below or above. `band` is the
// visible strip between the floating header and the bar, in plate pixels,
// plus the horizontal limits. `obstacles` are rects ({ x, y, w, h, id }) no
// label may cover except its own tree's: the portrait plate passes every
// trunk base. With `beside` (the portrait plate, where nothing pans and the
// meadow is crowded) a label never leaves its tree: it sits just under the
// trunk base, nudged left or right if that's taken (or, to keep off a
// neighbour's canopy, above its own tree), and if none of those is free it
// stays under the foot,
// where panLabels hides it rather than letting it drift across the scene.
// `canopies` are the rects of grown trees a tag should keep off when it has
// anywhere else to go; `crosses(rect)` says whether a rect lies across the path.
// Returns { [id]: { x, y, out } }.
export function placeLabels(items, band, obstacles = [], { beside = false, canopies = [], crosses = null } = {}) {
  const placed = [];
  const out = {};
  const clampX = (x, w) => Math.min(Math.max(x, band.minX), band.maxX - w);
  const inBand = (r) => r.y >= band.minY && r.y + r.h <= band.maxY;
  for (const it of [...items].sort((a, b) => b.footY - a.footY || a.footX - b.footX)) {
    const x = clampX(it.footX - it.w / 2, it.w);
    const below = it.footY + GAP;
    const above = it.top - it.h - GAP;
    const step = it.h + GAP;
    let candidates;
    let aboveTree = [];
    if (beside) {
      // A tag leans away from the path (`lean`: -1 left, 1 right), so it sits
      // on its tree's side with its near end just past the pin; if that's
      // taken it moves further out, then tries centred and the other side.
      const lean = it.lean || 0;
      const leaned = lean < 0 ? it.footX + LABEL_LEAN - it.w : lean > 0 ? it.footX - LABEL_LEAN : it.footX - it.w / 2;
      const centred = it.footX - it.w / 2;
      // The path side (the mirror of the lean) is offered only where the
      // tag wouldn't lie across the path.
      const pathSide = lean < 0 ? it.footX - LABEL_LEAN : it.footX + LABEL_LEAN - it.w;
      const xs = lean
        ? [leaned, leaned + lean * 0.3 * it.w, centred, leaned + lean * 0.6 * it.w, pathSide, centred - lean * 0.4 * it.w]
        : [0, -0.4, 0.4, -0.7, 0.7].map((k) => centred + k * it.w);
      candidates = xs.map((cx) => ({ x: clampX(cx, it.w), y: below, w: it.w, h: it.h }));
      if (lean && crosses) candidates = candidates.filter((r, n) => n !== 4 || !crosses(r));
      // Above the tree: just above it, then a little higher.
      aboveTree = [above, above - ABOVE_STEP].flatMap((y) => [centred, leaned].map((cx) => ({ x: clampX(cx, it.w), y, w: it.w, h: it.h })));
    } else {
      const ys = [below, above];
      for (let k = 1; k <= 4; k++) ys.push(below + k * step, above - k * step);
      candidates = ys.map((y) => ({ x, y, w: it.w, h: it.h }));
    }
    const blockers = [...placed, ...obstacles.filter((o) => o.id !== it.id)];
    // First choice: a free spot that also keeps off every other grown
    // tree (`canopies`). Failing that, any free spot, as before.
    const others = canopies.filter((o) => o.id !== it.id);
    const free = (r) => inBand(r) && !blockers.some((p) => overlaps(p, r));
    // Last before falling back: above the tree instead of under it.
    const offCanopies = (r) => free(r) && !others.some((o) => onCanopy(o, r));
    let pick = (others.length ? candidates.find(offCanopies) || aboveTree.find(offCanopies) : null) || candidates.find(free);
    if (!pick && beside) {
      pick = candidates[0];
    } else if (!pick) {
      // Nothing fully free: the in-band spot that overlaps least.
      const area = (r) => blockers.reduce((n, p) => n + (overlaps(p, r) ? Math.max(0, Math.min(p.x + p.w, r.x + r.w) - Math.max(p.x, r.x)) * Math.max(0, Math.min(p.y + p.h, r.y + r.h) - Math.max(p.y, r.y)) : 0), 0);
      const inside = candidates.filter(inBand);
      pick = (inside.length ? inside : candidates).reduce((best, r) => (area(r) < area(best) ? r : best));
    }
    placed.push(pick);
    // `out`: no slot fits between the notices and the bar (a tall label on a
    // short screen). panLabels hides it rather than show it under either.
    // `held`: the sideways nudge is part of the slot (portrait); panLabels keeps it.
    out[it.id] = { x: pick.x, y: pick.y, out: !inBand(pick), held: beside };
  }
  return out;
}

// While the scene pans, labels keep the slot placeLabels gave them and only
// move sideways: a label shows while its tree's foot is on screen, clamped
// LABEL_EDGE inside either edge. To keep one from flickering at the edge, a
// hidden label shows only once the foot is LABEL_ENTER inside the window,
// and a shown one hides only once the foot has left it. Where two clamped
// labels would overlap, the tree further back (smaller foot y) loses its
// label; nothing moves vertically. A label that would cover another tree's
// trunk base (`obstacles`) is hidden too. `view` is { sx: scrollLeft, vw: width }
// in plate pixels. Returns every label's clamped position and the set shown.
export const LABEL_EDGE = 8;
export const LABEL_ENTER = 12;

export function panLabels(items, slots, view, shownBefore = new Set(), obstacles = []) {
  const { sx, vw } = view;
  const left = sx + LABEL_EDGE;
  const right = sx + vw - LABEL_EDGE;
  const pos = {};
  const shown = new Set();
  const accepted = [];
  for (const it of [...items].sort((a, b) => b.footY - a.footY || a.footX - b.footX)) {
    const margin = shownBefore.has(it.id) ? 0 : LABEL_ENTER;
    const footIn = it.footX >= sx + margin && it.footX <= sx + vw - margin;
    const wantX = slots[it.id].held ? slots[it.id].x : it.footX - it.w / 2;
    const r = { x: Math.min(Math.max(wantX, left), right - it.w), y: slots[it.id].y, w: it.w, h: it.h };
    pos[it.id] = { x: r.x, y: r.y };
    if (!footIn || slots[it.id].out || accepted.some((p) => overlaps(p, r))) continue;
    // A label never covers another tree's trunk base (portrait plate).
    if (obstacles.some((o) => o.id !== it.id && overlaps(o, r))) continue;
    accepted.push(r);
    shown.add(it.id);
  }
  return { pos, shown };
}

// What the scene does about its scroll position when its layout changes.
// `state` is carried from one call to the next (start from OPENING); `now` is
// { key, hasTrees, focusId }: the grove the scene is showing ("" or a key
// ending in ":" for none, since the component prefixes the plate's name),
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
    if (key && !key.endsWith(":")) userScrolled = false;
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

// ---- The portrait plate --------------------------------------------------------
// A phone held upright shows the tall plate: the same meadow rising uphill. It
// covers the screen (sides cropped on a narrow phone, top and bottom on a
// squarer one), the scene is exactly as wide as the screen, and nothing pans.
//
// One path winds up through the middle of the meadow, and the trees line it:
// each anchor is a side of the path, a distance out from the path's edge at
// that height (`off`, a fraction of the plate's width), and the foot's y as a
// fraction of the plate's height. Depth follows y. The sides alternate as the
// grove fills, and the fill order spreads it over the whole hill, so any grove
// of three to seven has near, middle and far trees on both sides of the path.
// The path itself comes from the plate (scene-path.js, traced by
// scripts/cutout-trees.py).
//
// No trunk base, and so no pin, ever stands on the path: every trunk base is
// kept PORTRAIT.pathClear px (at 375, scaled with the screen) clear of it.
// Canopies may overlap the path and each other. `off` is drawn for a screen
// showing PORTRAIT.refWidth of the plate's width (about a 375-wide phone); a
// narrower screen pulls the anchors in toward the path and draws the trees
// that much smaller, and every tree is then held fully on screen.
// scene.test.mjs checks all of it for every count, size and screen.
export const PORTRAIT = {
  // A near full-grown tree's height as a share of the plate's height.
  fullHeight: 0.24,
  // Each stage's share of full size. Higher at the bottom than the wide
  // plate's STAGE_CURVE, so the youngest trees stay legible on a phone.
  stageCurve: [0.2, 0.26, 0.33, 0.42, 0.54, 0.67, 0.83, 1],
  // The plate is drawn a little darker and less saturated than it was
  // painted, so the oaks stand out from the grass. Tuned by eye; the real fix
  // for young trees blending in is in the art.
  tone: { brightness: 0.84, saturation: 0.72 },
  refWidth: 0.777,
  // Every trunk base keeps this many px clear of the path on a 375-wide
  // screen (scaled with the screen's width).
  pathClear: 14,
  // Depth runs from 1 at the nearest anchor to this at the farthest: a
  // narrow range, so far trees aren't specks.
  farDepth: 0.45,
  // No tree is drawn shorter than this on a 375-wide screen (the floor
  // scales with the screen's width). Each stage's floor is a little higher
  // than the last, so the stages still read in order where the floor applies.
  // The planted mark is sized by width (PLANTED_MAX_WIDTH), so it has a
  // minimum width instead, scaled the same way.
  minHeight: 28,
  minHeightStep: 0.08,
  minPlantedWidth: 20,
  // Sprout, seedling and sapling have thin stems and sparse yellow-green
  // leaves that sink into the grass, so those stages alone get a little more
  // presence: a filter that sets the leaves a shade darker and greener than
  // the calmed plate, a very soft cream halo so the stem separates from the
  // grass, and a larger, stronger ground shadow. Tuned by eye.
  young: {
    stages: [1, 2, 3],
    filter: { contrast: 1.2, brightness: 0.82, saturation: 1.2 },
    halo: { blur: 1.5, color: "250, 252, 240", opacity: 0.6 },
    shadow: { size: 1.4, opacity: 0.8 },
  },
  // 8 to 12 trees: each tree past the seventh shrinks them all this much.
  shrinkPerTree: 0.035,
  // Where the plate sits when a squarer screen crops it top and bottom:
  // 0 keeps the top, 1 the bottom. The meadow is a little above the middle.
  cropBias: 0.45,
};

// The path's left and right edge at a height, as fractions of the plate's
// width. Where the path doubles back and a height crosses it twice, these
// are the outer edges of the whole crossing.
const PATH_YS = [...new Set(PORTRAIT_PATH.map((row) => row[0]))];
const PATH_SPAN = new Map(PATH_YS.map((y) => {
  const at = PORTRAIT_PATH.filter((row) => row[0] === y);
  return [y, { left: Math.min(...at.map((row) => row[1])), right: Math.max(...at.map((row) => row[2])) }];
}));
export function pathEdges(y) {
  if (y <= PATH_YS[0]) return PATH_SPAN.get(PATH_YS[0]);
  for (let i = 1; i < PATH_YS.length; i++) {
    if (y <= PATH_YS[i]) {
      const a = PATH_SPAN.get(PATH_YS[i - 1]);
      const b = PATH_SPAN.get(PATH_YS[i]);
      const k = (y - PATH_YS[i - 1]) / (PATH_YS[i] - PATH_YS[i - 1]);
      return { left: a.left + (b.left - a.left) * k, right: a.right + (b.right - a.right) * k };
    }
  }
  return PATH_SPAN.get(PATH_YS[PATH_YS.length - 1]);
}

// How far a point is from the path, in px. `frame` says where the plate is
// drawn: { plateLeft, plateW, plateH }, with y measured from the plate's top.
export function pathDistance(x, y, frame) {
  let best = Infinity;
  for (const [ry, rl, rr] of PORTRAIT_PATH) {
    const l = frame.plateLeft + rl * frame.plateW;
    const r = frame.plateLeft + rr * frame.plateW;
    const dx = x < l ? l - x : x > r ? x - r : 0;
    const d = Math.hypot(dx, ry * frame.plateH - y);
    if (d < best) best = d;
  }
  return best;
}

// What a 320-wide phone shows of the plate, and how much smaller it draws.
const NARROW = { left: 0.168, right: 0.832, squeeze: 0.853 };
const NEAR_Y = 0.77;
const FAR_Y = 0.25;
const depthAt = (y) => Math.min(1, Math.max(PORTRAIT.farDepth, PORTRAIT.farDepth + ((y - FAR_Y) / (NEAR_Y - FAR_Y)) * (1 - PORTRAIT.farDepth)));
// An anchor with its depth and its x on the plate worked out.
const resolve = (a) => {
  const e = pathEdges(a.y);
  return { ...a, depth: depthAt(a.y), x: a.side < 0 ? e.left - a.off : e.right + a.off };
};

export const PORTRAIT_ANCHORS = [
  { side: -1, off: 0.16, y: 0.77 },   //  1 near, left of the path
  { side: 1, off: 0.14, y: 0.47 },    //  2 middle, right
  { side: -1, off: 0.18, y: 0.3 },    //  3 far, left
  { side: 1, off: 0.13, y: 0.73 },    //  4 near, right
  { side: -1, off: 0.16, y: 0.6 },    //  5 middle, left
  { side: 1, off: 0.12, y: 0.275 },   //  6 far, right
  { side: -1, off: 0.14, y: 0.4 },    //  7 upper middle, left
  { side: 1, off: 0.24, y: 0.52 },    //  8 to 12: the gaps between
  { side: -1, off: 0.34, y: 0.67 },
  { side: 1, off: 0.3, y: 0.43 },
  { side: -1, off: 0.42, y: 0.35 },
  { side: 1, off: 0.16, y: 0.25 },
].map(resolve);

// Up to seven trees are drawn at full scale; eight to twelve shrink gently so
// all twelve anchors read; past twelve the scale falls with the square root of
// the count (portraitSpots may lower it further to fit them all).
export function portraitScale(n) {
  if (n <= 7) return 1;
  const atTwelve = 1 - PORTRAIT.shrinkPerTree * 5;
  if (n <= 12) return 1 - PORTRAIT.shrinkPerTree * (n - 7);
  return atTwelve * Math.sqrt(12 / n);
}

// Where n trees stand and at what scale. Up to twelve: the tuned anchors.
// Past twelve there are no more tuned anchors, so the spots are generated by
// the same rules: rows from near to far, each a little more than a trunk's
// height above the last, with a spot close to the path and one further out on
// each side wherever the meadow has room. The two sides are kept in strict
// alternation, so they never differ by more than one tree, and each side
// fills over the whole hill (near, middle, far, and round again) as the
// tuned anchors do. If the rows can't hold them all, the scale steps down
// until they can.
export function portraitSpots(n) {
  let scale = portraitScale(n);
  if (n <= PORTRAIT_ANCHORS.length) return { scale, spots: PORTRAIT_ANCHORS.slice(0, n) };
  const want = { [-1]: Math.ceil(n / 2), 1: Math.floor(n / 2) };
  for (;;) {
    const found = { [-1]: [], 1: [] };
    let y = 0.77;
    for (let row = 0; y >= FAR_Y; row++) {
      // The path's reach a little above and below this row too: where it
      // bends, the trunk has to clear the bend, not only the row's own edge.
      const near = [-0.02, -0.01, 0, 0.01, 0.02].map((dy) => pathEdges(y + dy));
      const e = { left: Math.min(...near.map((p) => p.left)), right: Math.max(...near.map((p) => p.right)) };
      // A full-grown tree's width here, as a share of the plate's width.
      const w = 0.45 * depthAt(y) * scale;
      // Sized for the narrowest phone, which shows the plate from NARROW.left
      // to NARROW.right and draws everything NARROW.squeeze as large. On each
      // side: a spot as close to the path as a trunk may stand (alternate
      // rows a little further out, so neighbouring rows don't line up), and
      // a second at the edge of the meadow if the two trunks stand well apart.
      const own = pathEdges(y);
      for (const side of [-1, 1]) {
        const edge = side < 0 ? e.left : e.right;
        const limit = side < 0 ? NARROW.left + 0.005 + 0.5 * w * NARROW.squeeze : NARROW.right - 0.005 - 0.5 * w * NARROW.squeeze;
        const closest = edge + side * (0.03 + 0.08 * w * NARROW.squeeze);
        if (side * (limit - closest) < 0) continue;
        const x0 = side < 0 ? Math.max(limit, closest - (row % 2 ? 0.06 : 0)) : Math.min(limit, closest + (row % 2 ? 0.06 : 0));
        const offOf = (x) => Math.abs(x - (side < 0 ? own.left : own.right)) / NARROW.squeeze;
        found[side].push({ ...resolve({ side, off: offOf(x0), y }), k: 0, row });
        if (Math.abs(limit - x0) >= 0.12) found[side].push({ ...resolve({ side, off: offOf(limit), y }), k: 1, row });
      }
      // At least a trunk's height up, and never less than the height floor
      // makes a trunk on a small screen.
      y -= Math.max(0.44 * PORTRAIT.fullHeight * depthAt(y) * scale, 0.03);
    }
    if ((found[-1].length >= want[-1] && found[1].length >= want[1]) || scale < 0.2) {
      // On each side, one spot from every row before any row's second spot.
      const pick = (side) => [...found[side]].sort((p, q) => p.k - q.k || p.row - q.row).slice(0, want[side]);
      const sides = { [-1]: pick(-1), 1: pick(1) };
      const ys = [...sides[-1], ...sides[1]].map((p) => p.y);
      const lo = Math.min(...ys);
      const span = Math.max(...ys) - lo || 1;
      // Each side in thirds of the hill; the left starts near and the right
      // in the middle, so the first few trees already span it.
      const inBands = (list, order) => {
        const bands = [[], [], []];
        for (const p of list) bands[p.y > lo + (span * 2) / 3 ? 0 : p.y > lo + span / 3 ? 1 : 2].push(p);
        const out = [];
        for (let m = 0; out.length < list.length; m++) for (const b of order) if (m < bands[b].length) out.push(bands[b][m]);
        return out;
      };
      const left = inBands(sides[-1], [0, 2, 1]);
      const right = inBands(sides[1], [1, 0, 2]);
      const spots = [];
      for (let m = 0; spots.length < left.length + right.length; m++) {
        if (m < left.length) spots.push(left[m]);
        if (m < right.length) spots.push(right[m]);
      }
      return { scale, spots };
    }
    scale *= 0.94;
  }
}

// Whether a rect (scene px) lies across the path.
export function crossesPath(r, frame) {
  return PORTRAIT_PATH.some(([ry, rl, rr]) => {
    const y = ry * frame.plateH;
    return y >= r.y && y <= r.y + r.h && frame.plateLeft + rl * frame.plateW < r.x + r.w && frame.plateLeft + rr * frame.plateW > r.x;
  });
}

// The part of a grown tree (stage 4 and up) a neighbour's tag should keep off:
// the ellipse inside its drawing, less the grass at its foot.
export const CANOPY_FROM_STAGE = 4;
export const canopyOf = (t) => ({ id: t.id, round: true, x: t.left + t.w * 0.04, y: t.top, w: t.w * 0.92, h: t.h * 0.9 });

// The part of a tree that must stay visible: the foot of its trunk. And the
// part of a nearer tree that could hide it: its trunk, from the foot up to
// where the canopy starts.
const trunkHalf = (t) => Math.max(3, t.w * 0.08);
export const trunkBase = (t) => ({ id: t.id, x: t.footX - trunkHalf(t), y: t.footY - t.h * 0.12, w: trunkHalf(t) * 2, h: t.h * 0.12 });
export const trunkColumn = (t) => ({ id: t.id, x: t.footX - trunkHalf(t), y: t.footY - t.h * 0.4, w: trunkHalf(t) * 2, h: t.h * 0.4 });

// Every pair where a nearer tree's trunk covers a farther tree's trunk base.
export function coveredTrunks(trees) {
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const out = [];
  for (const far of trees) for (const near of trees) {
    if (near.footY > far.footY && hit(trunkBase(far), trunkColumn(near))) out.push([far.id, near.id]);
  }
  return out;
}

// Every tree's place on the portrait plate, in scene pixels (the scene is the
// screen's width; `plateLeft` and `offsetTop` say where the plate sits behind
// it). Unlike the wide plate, planting or removing a tree here can resize and
// re-place the others: the scale follows the count.
export function layoutPortrait(concepts, vw, vh) {
  const P = PLATES.portrait;
  const s = Math.max(vw / P.w, vh / P.h);
  const plateW = P.w * s;
  const plateH = P.h * s;
  const frame = { plateLeft: (vw - plateW) / 2, plateW, plateH };
  const { scale, spots } = portraitSpots(concepts.length);
  // A screen showing less of the plate's width than the anchors were drawn
  // for: the anchors pull in toward the path and the trees shrink to match.
  const squeeze = Math.min(1, vw / plateW / PORTRAIT.refWidth);
  const clear = PORTRAIT.pathClear * (vw / 375);
  const trees = concepts.map((c, i) => {
    const a = spots[Math.min(i, spots.length - 1)];
    const stage = stageOf(c.days);
    const species = speciesOf(c);
    const art = SCENE_ART[species][stage];
    const floorFor = (st) => PORTRAIT.minHeight * (vw / 375) * (1 + PORTRAIT.minHeightStep * st);
    const heightOf = (st) => Math.max(plateH * PORTRAIT.fullHeight * a.depth * PORTRAIT.stageCurve[st] * scale * squeeze, floorFor(st));
    let h = heightOf(stage);
    let w = (h * art.w) / art.h;
    if (stage === 0) {
      // By width: under the sprout's, and never under the minimum.
      const raw = (plateH * PORTRAIT.fullHeight * a.depth * PORTRAIT.stageCurve[0] * scale * squeeze * art.w) / art.h;
      ({ w } = plantedSize(species, raw, heightOf(1)));
      w = Math.max(w, PORTRAIT.minPlantedWidth * (vw / 375));
      h = (w * art.h) / art.w;
    }
    const footY = a.y * plateH;
    // Out from the path's edge on its side, then held fully on screen.
    const e = pathEdges(a.y);
    const edge = frame.plateLeft + (a.side < 0 ? e.left : e.right) * plateW;
    let footX = edge + a.side * a.off * plateW * squeeze;
    footX = Math.min(Math.max(footX, art.footX * w + 2), vw - (1 - art.footX) * w - 2);
    // And never closer to the path than `clear`: the trunk base steps away
    // from it until it is. (The path bends, so this is the distance to the
    // path anywhere, not only at the trunk's own height.)
    const half = Math.max(3, w * 0.08);
    const gap = (x) => Math.min(pathDistance(x - half, footY, frame), pathDistance(x + half, footY, frame), pathDistance(x - half, footY - h * 0.12, frame), pathDistance(x + half, footY - h * 0.12, frame));
    for (let n = 0; n < 200 && gap(footX) < clear; n++) footX += a.side * Math.max(0.5, vw / 750);
    return { id: c.id, stage, species, mirrored: false, side: a.side, depth: a.depth, footX, footY, w, h, left: footX - art.footX * w, top: footY - art.footY * h, art };
  });
  [...trees].sort((p, q) => p.footY - q.footY || p.footX - q.footX).forEach((t, rank) => { t.z = rank + 1; });
  return { tiles: 1, tileW: vw, width: vw, trees, scale, frame };
}

// The scene for a screen: which plate, how big it is drawn and where it sits,
// and every tree on it. One shape for both plates, so the component draws
// either from the same code.
export function sceneLayout(concepts, vw, vh) {
  const kind = plateFor(vw, vh);
  if (kind === "portrait") {
    const P = PLATES.portrait;
    const s = Math.max(vw / P.w, vh / P.h);
    const plate = { w: P.w * s, h: P.h * s };
    const layout = layoutPortrait(concepts, vw, vh);
    return { kind, src: P.src, plate, plateLeft: (vw - plate.w) / 2, offsetTop: Math.min(0, (vh - plate.h) * PORTRAIT.cropBias), pans: false, showStage: false, tone: PORTRAIT.tone, ...layout };
  }
  const plate = plateSize(vw, vh);
  const layout = layoutScene(concepts, plate.w, plate.h);
  // A very wide window draws the plate taller than the screen; keep its
  // bottom, where the meadow is, and lose sky.
  return { kind, src: PLATES.wide.src, plate, plateLeft: -layout.crop.left * plate.w, offsetTop: Math.min(0, vh - plate.h), pans: true, showStage: true, ...layout };
}

// The extra presence a young tree gets on the portrait plate, as CSS: null
// for the planted mark and for the grown stages, which are drawn as painted.
export function youngLook(stage) {
  const y = PORTRAIT.young;
  if (!y.stages.includes(stage)) return null;
  return {
    filter: `contrast(${y.filter.contrast}) brightness(${y.filter.brightness}) saturate(${y.filter.saturation}) drop-shadow(0 0 ${y.halo.blur}px rgba(${y.halo.color}, ${y.halo.opacity}))`,
    shadowSize: y.shadow.size,
    shadowOpacity: y.shadow.opacity,
  };
}
