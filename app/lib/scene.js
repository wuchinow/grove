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
// plus the horizontal limits. `obstacles` are rects ({ x, y, w, h, id }) no
// label may cover except its own tree's: the portrait plate passes every
// trunk base. With `beside` (the portrait plate, where nothing pans and the
// meadow is crowded) a label never leaves its tree: it sits just under the
// trunk base, nudged left or right if that's taken, and if none of those is
// free it stays under the foot,
// where panLabels hides it rather than letting it drift across the scene.
// Returns { [id]: { x, y, out } }.
export function placeLabels(items, band, obstacles = [], { beside = false } = {}) {
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
    if (beside) {
      const xs = [0, -0.4, 0.4, -0.7, 0.7].map((k) => clampX(it.footX - it.w / 2 + k * it.w, it.w));
      candidates = xs.map((cx) => ({ x: cx, y: below, w: it.w, h: it.h }));
    } else {
      const ys = [below, above];
      for (let k = 1; k <= 4; k++) ys.push(below + k * step, above - k * step);
      candidates = ys.map((y) => ({ x, y, w: it.w, h: it.h }));
    }
    const blockers = [...placed, ...obstacles.filter((o) => o.id !== it.id)];
    let pick = candidates.find((r) => inBand(r) && !blockers.some((p) => overlaps(p, r)));
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
// Twelve anchors between about 25% and 75% of the plate's height: x and the
// foot's y as fractions of the plate, depth as a scale. They frame the meadow
// rather than stack up it: the near ones at the sides, farther ones in the
// middle and up the hill, none directly in front of another, and the upper
// ones left of the path. The fill order spreads a grove over the whole hill,
// so any grove of three to seven has near, middle and far trees; eight to
// twelve fill the gaps between. x is drawn for a screen showing
// PORTRAIT.refWidth of the plate's width (about a 375-wide phone); a narrower
// screen squeezes the anchors toward the centre, and every tree is then
// clamped fully on screen.
//
// Neighbouring canopies may overlap. What the positions guarantee is that no
// trunk base is covered by a nearer tree's trunk. scene.test.mjs checks it
// for every count, size and screen.
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
  refWidth: 0.778,
  // 8 to 12 trees: each tree past the seventh shrinks them all this much.
  shrinkPerTree: 0.035,
  // Where the plate sits when a squarer screen crops it top and bottom:
  // 0 keeps the top, 1 the bottom. The meadow is a little above the middle.
  cropBias: 0.45,
};

export const PORTRAIT_ANCHORS = [
  { x: 0.22, y: 0.72, depth: 1 },      //  1 near, left
  { x: 0.74, y: 0.5, depth: 0.67 },    //  2 middle, right
  { x: 0.18, y: 0.27, depth: 0.3 },    //  3 far, left
  { x: 0.78, y: 0.68, depth: 0.94 },   //  4 near, right
  { x: 0.6, y: 0.585, depth: 0.8 },    //  5 middle, centre
  { x: 0.44, y: 0.255, depth: 0.27 },  //  6 far, centre
  { x: 0.42, y: 0.435, depth: 0.57 },  //  7 upper middle, left
  { x: 0.32, y: 0.52, depth: 0.7 },    //  8 to 12: the gaps between
  { x: 0.56, y: 0.395, depth: 0.52 },
  { x: 0.34, y: 0.3, depth: 0.34 },
  { x: 0.26, y: 0.37, depth: 0.46 },
  { x: 0.48, y: 0.335, depth: 0.4 },
];

// Up to seven trees are drawn at full scale; eight to twelve shrink gently so
// all twelve anchors read; past twelve the scale falls with the square root of
// the count (portraitSpots may lower it further to fit them all).
export function portraitScale(n) {
  if (n <= 7) return 1;
  const atTwelve = 1 - PORTRAIT.shrinkPerTree * 5;
  if (n <= 12) return 1 - PORTRAIT.shrinkPerTree * (n - 7);
  return atTwelve * Math.sqrt(12 / n);
}

// The path's left edge at a given height, as a fraction of the plate width
// (1 where the meadow is open edge to edge). Generated spots stay left of it.
function pathLeft(y) {
  if (y >= 0.46) return 1;
  if (y >= 0.36) return 0.55 + ((0.45 - Math.min(y, 0.45)) / 0.09) * 0.32;
  if (y >= 0.27) return 0.56 + ((y - 0.27) / 0.09) * 0.31;
  return 0.56 + ((0.27 - y) / 0.06) * 0.18;
}
const depthAt = (y) => Math.min(1, Math.max(0.3, 0.3 + ((y - 0.255) / (0.71 - 0.255)) * 0.7));

// Where n trees stand and at what scale. Up to twelve: the tuned anchors.
// Past twelve there are no more tuned anchors, so the spots come from a
// lattice over the same open ground: rows from near to far, alternating
// between three columns and two so neighbouring rows never share a column,
// each row a little more than a trunk's height above the last, and nothing
// right of the path in the upper meadow. If the lattice can't hold them all,
// the scale steps down until it can.
export function portraitSpots(n) {
  let scale = portraitScale(n);
  if (n <= PORTRAIT_ANCHORS.length) return { scale, spots: PORTRAIT_ANCHORS.slice(0, n) };
  for (;;) {
    const spots = [];
    let y = 0.71;
    for (let row = 0; y >= 0.25 && spots.length < n; row++) {
      const depth = depthAt(y);
      const xs = (row % 2 ? [0.4, 0.6] : [0.5, 0.3, 0.7]).filter((x) => x <= pathLeft(y) - 0.07);
      for (const x of xs) if (spots.length < n) spots.push({ x, y, depth });
      y -= 0.44 * PORTRAIT.fullHeight * depth * scale;
    }
    if (spots.length >= n || scale < 0.2) return { scale, spots };
    scale *= 0.94;
  }
}

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
  const { scale, spots } = portraitSpots(concepts.length);
  const squeeze = Math.min(1, vw / plateW / PORTRAIT.refWidth);
  const trees = concepts.map((c, i) => {
    const a = spots[Math.min(i, spots.length - 1)];
    const stage = stageOf(c.days);
    const species = speciesOf(c);
    const art = SCENE_ART[species][stage];
    const h = plateH * PORTRAIT.fullHeight * a.depth * PORTRAIT.stageCurve[stage] * scale;
    const w = (h * art.w) / art.h;
    // Squeezed toward the centre on a narrow screen, then held fully on it.
    const wanted = vw / 2 + (a.x - 0.5) * plateW * squeeze;
    const footX = Math.min(Math.max(wanted, art.footX * w + 2), vw - (1 - art.footX) * w - 2);
    const footY = a.y * plateH;
    return { id: c.id, stage, species, mirrored: false, depth: a.depth, footX, footY, w, h, left: footX - art.footX * w, top: footY - art.footY * h, art };
  });
  [...trees].sort((p, q) => p.footY - q.footY || p.footX - q.footX).forEach((t, rank) => { t.z = rank + 1; });
  return { tiles: 1, tileW: vw, width: vw, trees, scale };
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

