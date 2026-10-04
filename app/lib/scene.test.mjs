import test from "node:test";
import assert from "node:assert/strict";
import {
  ANCHORS, ANCHOR_SPACING, FULL_HEIGHT, LABEL_EDGE, LABEL_ENTER, OPENING, PLANTED_MAX_WIDTH, PLATES, PLATE_ASPECT, PORTRAIT, PORTRAIT_ANCHORS, REPEAT, STAGE_CURVE,
  CANOPY_FROM_STAGE, canopyOf, coveredTrunks, crossesPath, layoutPortrait, layoutScene, openingMove, panLabels, pathDistance, pathEdges, placeLabels, plateFor, plateSize, portraitScale, portraitSpots, sceneLayout, speciesOf, treeArt, trunkBase, youngLook,
} from "./scene.js";
import { SCENE_ART } from "./scene-art.js";
import { PORTRAIT_PATH } from "./scene-path.js";

const trees = (n, days = () => 3) => Array.from({ length: n }, (_, i) => ({ id: `c${i}`, name: `Concept ${i}`, days: days(i), mastery: 0 }));

test("the plate is as tall as the viewport, wider when the window is very wide", () => {
  assert.deepEqual(plateSize(375, 844), { w: Math.round(844 * PLATE_ASPECT), h: 844 });
  const wide = plateSize(2400, 800);
  assert.equal(wide.w >= 2400, true);
  assert.equal(wide.h > 800, true);
});

test("trees take anchors in planting order, one plate copy per seven", () => {
  const { tiles, width, trees: placed } = layoutScene(trees(3), 1000, 500);
  assert.equal(tiles, 1);
  assert.equal(width, 1000);
  placed.forEach((t, i) => {
    assert.equal(t.footX, ANCHORS[i].x * 1000);
    assert.equal(t.footY, ANCHORS[i].y * 500);
  });
  assert.equal(layoutScene([], 1000, 500).tiles, 1);
  assert.equal(layoutScene(trees(7), 1000, 500).tiles, 1);
  assert.equal(layoutScene(trees(8), 1000, 500).tiles, 2);
  assert.equal(layoutScene(trees(12), 1000, 500).tiles, 2);
  assert.equal(layoutScene(trees(15), 1000, 500).tiles, 3);
});

test("every other plate copy is mirrored, and so are its anchors", () => {
  const { trees: placed, tileW, width } = layoutScene(trees(15), 1000, 500);
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
  close(tileW, (REPEAT.right - REPEAT.left) * 1000);
  close(width, 2 * tileW + (ANCHORS[0].x - REPEAT.left + ANCHOR_SPACING) * 1000);
  close(placed[0].footX, (ANCHORS[0].x - REPEAT.left) * 1000);
  assert.equal(placed[7].mirrored, true);
  close(placed[7].footX, tileW + (REPEAT.right - ANCHORS[0].x) * 1000);
  assert.equal(placed[14].mirrored, false);
  close(placed[14].footX, 2 * tileW + (ANCHORS[0].x - REPEAT.left) * 1000);
});

test("a single plate is shown whole", () => {
  const { tileW, width, trees: placed } = layoutScene(trees(7), 1000, 500);
  assert.equal(tileW, 1000);
  assert.equal(width, 1000);
  assert.equal(placed[0].footX, ANCHORS[0].x * 1000);
});

test("height follows depth and stage; the foot sits on the anchor", () => {
  const { trees: placed } = layoutScene(trees(8, (i) => i), 1000, 600);
  placed.forEach((t, i) => {
    const a = ANCHORS[i % ANCHORS.length];
    const stage = Math.min(i, 7);
    assert.equal(t.stage, stage);
    // The planted mark (stage 0) is sized by width; see its own test.
    if (stage > 0) assert.ok(Math.abs(t.h - 600 * FULL_HEIGHT * a.depth * STAGE_CURVE[stage]) < 1e-9);
    assert.ok(Math.abs(t.left + t.art.footX * t.w - t.footX) < 1e-9);
    assert.ok(Math.abs(t.top + t.art.footY * t.h - t.footY) < 1e-9);
  });
  // Sessions past seven stay full size.
  assert.equal(layoutScene(trees(1, () => 40), 1000, 600).trees[0].stage, 7);
});

test("trees draw back to front", () => {
  const { trees: placed } = layoutScene(trees(7), 1000, 600);
  const byZ = [...placed].sort((a, b) => a.z - b.z);
  for (let i = 1; i < byZ.length; i++) assert.ok(byZ[i].footY >= byZ[i - 1].footY);
});

test("removing a tree moves every later tree up an anchor", () => {
  const before = layoutScene(trees(4), 1000, 600).trees;
  const after = layoutScene(trees(4).filter((c) => c.id !== "c1"), 1000, 600).trees;
  assert.equal(after.find((t) => t.id === "c0").footX, before.find((t) => t.id === "c0").footX);
  assert.equal(after.find((t) => t.id === "c2").footX, before.find((t) => t.id === "c1").footX);
});

test("one species for now, and its art exists for all eight stages", () => {
  assert.equal(speciesOf({}), "oak");
  assert.equal(treeArt("oak", 3), "/scenes/oak/stage-3.webp");
  assert.equal(SCENE_ART.oak.length, 8);
});

const noOverlap = (rects) => {
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    assert.ok(!(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h), `labels ${i} and ${j} overlap`);
  }
};

test("a label goes under its tree when there's room", () => {
  const pos = placeLabels([{ id: "a", footX: 500, footY: 300, top: 150, w: 120, h: 40 }], { minX: 0, maxX: 1000, minY: 0, maxY: 800 });
  assert.deepEqual(pos.a, { x: 440, y: 306, out: false, held: false });
});

test("a crowded label moves above its canopy, and none overlap", () => {
  const items = [
    { id: "front", footX: 500, footY: 400, top: 200, w: 140, h: 40 },
    { id: "back", footX: 520, footY: 380, top: 250, w: 140, h: 40 },
  ];
  const pos = placeLabels(items, { minX: 0, maxX: 1000, minY: 0, maxY: 800 });
  assert.equal(pos.front.y, 406);
  assert.equal(pos.back.y, 250 - 40 - 6);
  noOverlap(items.map((it) => ({ ...pos[it.id], w: it.w, h: it.h })));
});

test("a label with no slot between the notices and the bar is hidden, not shown under them", () => {
  // A short screen: the band is shorter than the label is tall.
  const items = [{ id: "tall", footX: 300, footY: 200, top: 80, w: 120, h: 70 }];
  const slots = placeLabels(items, { minX: 0, maxX: 800, minY: 150, maxY: 210 });
  assert.equal(slots.tall.out, true);
  assert.equal(panLabels(items, slots, { sx: 0, vw: 800 }).shown.has("tall"), false);
  // With room, the same label shows.
  const roomy = placeLabels(items, { minX: 0, maxX: 800, minY: 0, maxY: 400 });
  assert.equal(roomy.tall.out, false);
  assert.equal(panLabels(items, roomy, { sx: 0, vw: 800 }).shown.has("tall"), true);
});

test("labels stay inside the band and the plate", () => {
  const band = { minX: 0, maxX: 1000, minY: 100, maxY: 450 };
  const pos = placeLabels([{ id: "edge", footX: 10, footY: 430, top: 300, w: 120, h: 40 }], band);
  assert.ok(pos.edge.x >= 0 && pos.edge.y >= 100 && pos.edge.y + 40 <= 450);
});

test("a full ten-tree scene lays out without overlapping labels", () => {
  for (const [vw, vh] of [[320, 844], [375, 812], [430, 932], [1280, 800]]) {
    const { w, h } = plateSize(vw, vh);
    const { width, trees: placed } = layoutScene(trees(10, (i) => i % 8), w, h);
    const items = placed.map((t) => ({ id: t.id, footX: t.footX, footY: t.footY, top: t.top, w: 150, h: 44 }));
    const pos = placeLabels(items, { minX: 0, maxX: width, minY: 140, maxY: h - 140 });
    noOverlap(items.map((it) => ({ ...pos[it.id], w: it.w, h: it.h })));
  }
});

// A ten-tree scene at a phone size, its slots decided once, as GroveScene does.
function phoneScene(vw, vh) {
  const { w, h } = plateSize(vw, vh);
  const { width, trees: placed } = layoutScene(trees(10, (i) => i % 8), w, h);
  const items = placed.map((t) => ({ id: t.id, footX: t.footX, footY: t.footY, top: t.top, w: 150, h: 44 }));
  const slots = placeLabels(items, { minX: 0, maxX: width, minY: 140, maxY: h - 140 });
  return { width, items, slots };
}

// Pans across the whole scene a few pixels at a time, carrying the shown set
// from one frame to the next as the component does.
function sweep(vw, vh, onFrame) {
  const { width, items, slots } = phoneScene(vw, vh);
  let shown = new Set();
  for (let sx = 0; sx <= width - vw; sx += 7) {
    const res = panLabels(items, slots, { sx, vw }, shown);
    onFrame(res, { sx, items, slots, before: shown });
    shown = res.shown;
  }
}

test("panning never moves a label out of its vertical slot", () => {
  for (const [vw, vh] of [[375, 844], [320, 844]]) {
    sweep(vw, vh, ({ pos }, { slots }) => {
      for (const id of Object.keys(pos)) assert.equal(pos[id].y, slots[id].y);
    });
  }
});

test("shown labels sit inside the window, 8px clear, and never overlap", () => {
  for (const [vw, vh] of [[375, 844], [320, 844]]) {
    sweep(vw, vh, ({ pos, shown }, { sx, items }) => {
      const rects = items.filter((it) => shown.has(it.id)).map((it) => ({ ...pos[it.id], w: it.w, h: it.h }));
      for (const r of rects) assert.ok(r.x >= sx + LABEL_EDGE - 1e-9 && r.x + r.w <= sx + vw - LABEL_EDGE + 1e-9);
      noOverlap(rects);
      // A shown label's tree always has its foot in the window.
      for (const it of items) if (shown.has(it.id)) assert.ok(it.footX >= sx && it.footX <= sx + vw);
    });
  }
});

test("a hidden label shows only once its foot is 12px inside", () => {
  const items = [{ id: "a", footX: 100, footY: 300, top: 200, w: 120, h: 40 }];
  const slots = { a: { x: 40, y: 306 } };
  // The foot is 5px inside the right edge: not yet.
  assert.equal(panLabels(items, slots, { sx: -295, vw: 400 }).shown.has("a"), false);
  // Exactly LABEL_ENTER inside: shows.
  assert.equal(panLabels(items, slots, { sx: 100 + LABEL_ENTER - 400, vw: 400 }).shown.has("a"), true);
  // Same from the left edge.
  assert.equal(panLabels(items, slots, { sx: 95, vw: 400 }).shown.has("a"), false);
  assert.equal(panLabels(items, slots, { sx: 100 - LABEL_ENTER, vw: 400 }).shown.has("a"), true);
});

test("a shown label hides only once its foot leaves the window", () => {
  const items = [{ id: "a", footX: 100, footY: 300, top: 200, w: 120, h: 40 }];
  const slots = { a: { x: 40, y: 306 } };
  const was = new Set(["a"]);
  // 5px and 0px from the edge: still shown, and clamped inside.
  const near = panLabels(items, slots, { sx: 95, vw: 400 }, was);
  assert.equal(near.shown.has("a"), true);
  assert.equal(near.pos.a.x, 95 + LABEL_EDGE);
  assert.equal(panLabels(items, slots, { sx: 100, vw: 400 }, was).shown.has("a"), true);
  // One pixel past: hidden.
  assert.equal(panLabels(items, slots, { sx: 101, vw: 400 }, was).shown.has("a"), false);
});

test("where clamped labels collide, the tree further back loses its label", () => {
  const items = [
    { id: "front", footX: 20, footY: 400, top: 200, w: 140, h: 40 },
    { id: "back", footX: 60, footY: 300, top: 150, w: 140, h: 40 },
  ];
  // Both slots on the same line, so clamping pushes them together.
  const slots = { front: { x: 0, y: 350 }, back: { x: 0, y: 350 } };
  const res = panLabels(items, slots, { sx: 0, vw: 400 }, new Set(["front", "back"]));
  assert.equal(res.shown.has("front"), true);
  assert.equal(res.shown.has("back"), false);
  assert.equal(res.pos.back.y, 350);
});

test("the scene ends one anchor spacing past its right-most tree", () => {
  const W = 1000;
  const copy = (REPEAT.right - REPEAT.left) * W;
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
  close(ANCHOR_SPACING, 0.11);
  // 3 and 7 trees: one whole plate; the last anchor plus a spacing fits inside it.
  close(layoutScene(trees(3), W, 500).width, W);
  close(layoutScene(trees(7), W, 500).width, W);
  // 10 trees: the mirrored copy's first three anchors, the right-most at
  // REPEAT.right - 0.38, then one spacing.
  const ten = layoutScene(trees(10), W, 500);
  close(ten.width, copy + (REPEAT.right - 0.38) * W + ANCHOR_SPACING * W);
  assert.ok(ten.width < 2 * copy);
  // 14 trees: the right-most foot plus a spacing would run past the second
  // copy's edge, so the scene stops at the end of both copies.
  const fourteen = layoutScene(trees(14), W, 500);
  close(fourteen.width, 2 * copy);
  for (const n of [3, 7, 10, 14]) {
    const { width, tileW, trees: placed } = layoutScene(trees(n), W, 500);
    assert.ok(width >= tileW, `${n} trees: narrower than one copy`);
    assert.ok(placed.every((t) => t.footX <= width), `${n} trees: a tree past the end`);
  }
});

// Runs a sequence of layout changes through openingMove, as the scene does.
// A step can be { scrolled: true }: the student swiped the scene themselves.
function opening(steps, start = OPENING) {
  let state = start;
  const moves = [];
  for (const step of steps) {
    if (step.scrolled) { state = { ...state, userScrolled: true }; continue; }
    const res = openingMove(state, { focusId: null, ...step });
    state = res.state;
    moves.push({ centre: res.centre, panTo: res.panTo });
  }
  return moves;
}
const NOTHING = { centre: false, panTo: null };
const CENTRE = { centre: true, panTo: null };

test("a grove's trees centre the scene the first time they appear", () => {
  // Home mounted before its grove loaded: empty plate, then the trees.
  assert.deepEqual(opening([{ key: "", hasTrees: false }, { key: "g1", hasTrees: true }]), [CENTRE, CENTRE]);
  // Home mounted with the grove already loaded.
  assert.deepEqual(opening([{ key: "g1", hasTrees: true }]), [CENTRE]);
});

test("switching to a different grove centres again, even after a manual scroll", () => {
  assert.deepEqual(
    opening([{ key: "g1", hasTrees: true }, { scrolled: true }, { key: "g2", hasTrees: false }, { key: "g2", hasTrees: true }]),
    [CENTRE, NOTHING, CENTRE],
  );
});

test("nothing inside the same grove re-centres it", () => {
  const sameGrove = { key: "g1", hasTrees: true };
  // Planting, a session finishing, a rename, removing a tree: each is a layout
  // change with the same grove key.
  assert.deepEqual(opening([sameGrove, sameGrove, sameGrove, sameGrove]), [CENTRE, NOTHING, NOTHING, NOTHING]);
  // Removing the last tree, then planting again.
  assert.deepEqual(opening([sameGrove, { key: "g1", hasTrees: false }, sameGrove]), [CENTRE, NOTHING, NOTHING]);
  // The same holds after the student has scrolled.
  assert.deepEqual(opening([sameGrove, { scrolled: true }, { key: "g1", hasTrees: false }, sameGrove]), [CENTRE, NOTHING, NOTHING]);
});

test("a late load after a manual swipe leaves the scene where the student put it", () => {
  assert.deepEqual(opening([{ key: "", hasTrees: false }, { scrolled: true }, { key: "g1", hasTrees: true }]), [CENTRE, NOTHING]);
  // The sample grove opening over an empty plate the student has swiped.
  assert.deepEqual(opening([{ key: "", hasTrees: false }, { scrolled: true }, { key: "sample", hasTrees: true }]), [CENTRE, NOTHING]);
  // An empty scene isn't re-centred either once it has been placed.
  assert.deepEqual(opening([{ key: "", hasTrees: false }, { scrolled: true }, { key: "", hasTrees: false }]), [CENTRE, NOTHING]);
});

test("the pan to a just-planted or just-grown tree takes priority", () => {
  // Plant in an open grove: Home comes back as a fresh scene with the new tree.
  assert.deepEqual(opening([{ key: "g1", hasTrees: true, focusId: "new" }]), [{ centre: true, panTo: "new" }]);
  // Return from a session: a fresh scene with the tree that grew.
  assert.deepEqual(opening([{ key: "g1", hasTrees: true, focusId: "grew" }]), [{ centre: true, panTo: "grew" }]);
  // Even after a manual swipe, a late load still pans to it, without centring first.
  assert.deepEqual(
    opening([{ key: "", hasTrees: false }, { scrolled: true }, { key: "g1", hasTrees: true, focusId: "grew" }]),
    [CENTRE, { centre: false, panTo: "grew" }],
  );
  // But only when the trees first appear, not on later changes in the same grove.
  assert.deepEqual(opening([{ key: "g1", hasTrees: true }, { key: "g1", hasTrees: true, focusId: "grew" }]), [CENTRE, NOTHING]);
});

// ---- The portrait plate ----
const PHONES = [[320, 844], [375, 844], [430, 932], [320, 568], [280, 653], [768, 1024]];
const SIZES = { "all full grown": () => 7, "all just planted": () => 0, mixed: (i) => i % 8, "mixed, big ones far": (i) => 7 - (i % 8) };

test("a portrait screen gets the portrait plate, anything else the wide one", () => {
  assert.equal(plateFor(375, 844), "portrait");
  assert.equal(plateFor(844, 390), "wide");
  assert.equal(plateFor(1280, 800), "wide");
  assert.equal(plateFor(800, 800), "wide");
  const p = sceneLayout(trees(3), 375, 844);
  assert.equal(p.kind, "portrait");
  assert.equal(p.src, PLATES.portrait.src);
  assert.equal(p.pans, false);
  assert.equal(p.width, 375);
  const w = sceneLayout(trees(3), 844, 390);
  assert.equal(w.kind, "wide");
  assert.equal(w.src, PLATES.wide.src);
  assert.equal(w.pans, true);
  // The wide layout is the one layoutScene has always given.
  const size = plateSize(844, 390);
  assert.deepEqual(w.trees.map((t) => [t.footX, t.footY]), layoutScene(trees(3), size.w, size.h).trees.map((t) => [t.footX, t.footY]));
});

test("the portrait plate covers the screen with nothing to pan", () => {
  for (const [vw, vh] of PHONES) {
    const s = sceneLayout(trees(5), vw, vh);
    assert.equal(s.width, vw);
    assert.ok(s.plate.w >= vw - 1e-9 && s.plate.h >= vh - 1e-9, `${vw}x${vh}: the plate doesn't cover the screen`);
    assert.ok(s.plateLeft <= 0 && s.plateLeft + s.plate.w >= vw - 1e-9);
    assert.ok(s.offsetTop <= 0 && s.offsetTop + s.plate.h >= vh - 1e-9);
  }
});

test("every portrait tree is fully on screen, for 1 to 30 trees of any size", () => {
  for (const [vw, vh] of PHONES) for (let n = 1; n <= 30; n++) for (const [name, days] of Object.entries(SIZES)) {
    const s = sceneLayout(trees(n, days), vw, vh);
    for (const t of s.trees) {
      const top = t.top + s.offsetTop;
      assert.ok(t.left >= 0 && t.left + t.w <= vw + 1e-9, `${vw}x${vh}, ${n} trees, ${name}: ${t.id} runs off the side`);
      assert.ok(top >= 0 && top + t.h <= vh, `${vw}x${vh}, ${n} trees, ${name}: ${t.id} runs off the top or bottom`);
    }
  }
});

test("no portrait trunk base is covered by a nearer tree's trunk", () => {
  for (const [vw, vh] of PHONES) for (let n = 1; n <= 30; n++) for (const [name, days] of Object.entries(SIZES)) {
    const covered = coveredTrunks(layoutPortrait(trees(n, days), vw, vh).trees);
    assert.deepEqual(covered, [], `${vw}x${vh}, ${n} trees, ${name}`);
  }
});

test("portrait anchors line both sides of the path and spread over the hill", () => {
  assert.equal(PORTRAIT_ANCHORS.length, 12);
  for (const a of PORTRAIT_ANCHORS) assert.ok(a.y >= 0.25 && a.y <= 0.78, `anchor at ${a.y}`);
  // The near anchors sit low, now that the bar is one row.
  assert.ok(Math.max(...PORTRAIT_ANCHORS.map((a) => a.y)) >= 0.74);
  // Sides alternate as the grove fills, six on each side.
  PORTRAIT_ANCHORS.forEach((a, i) => assert.equal(a.side, i % 2 ? 1 : -1, `anchor ${i + 1} is on the wrong side`));
  // Each stands on its own side of the path, out from the path's edge.
  for (const a of PORTRAIT_ANCHORS) {
    const e = pathEdges(a.y);
    assert.ok(a.side < 0 ? a.x < e.left : a.x > e.right, `anchor at y ${a.y} is not on its side of the path`);
    assert.ok(a.x > 0.12 && a.x < 0.88);
  }
  const band = (a) => (a.y >= 0.6 ? "near" : a.y >= 0.4 ? "middle" : "far");
  for (let n = 3; n <= 7; n++) {
    assert.deepEqual([...new Set(PORTRAIT_ANCHORS.slice(0, n).map(band))].sort(), ["far", "middle", "near"], `${n} trees`);
    assert.deepEqual([...new Set(PORTRAIT_ANCHORS.slice(0, n).map((a) => a.side))].sort(), [-1, 1], `${n} trees are all on one side`);
  }
  const { trees: placed } = layoutPortrait(trees(7), 375, 844);
  const plateH = PLATES.portrait.h * Math.max(375 / PLATES.portrait.w, 844 / PLATES.portrait.h);
  placed.forEach((t, i) => assert.ok(Math.abs(t.footY - PORTRAIT_ANCHORS[i].y * plateH) < 1e-9));
});

test("the traced path runs up the middle of the portrait plate", () => {
  assert.ok(PORTRAIT_PATH.length > 100);
  for (let i = 1; i < PORTRAIT_PATH.length; i++) assert.ok(PORTRAIT_PATH[i][0] >= PORTRAIT_PATH[i - 1][0]);
  // Where it doubles back, a height has more than one crossing.
  assert.ok(new Set(PORTRAIT_PATH.map((row) => row[0])).size < PORTRAIT_PATH.length);
  for (const [y, left, right] of PORTRAIT_PATH) {
    assert.ok(y > 0.15 && y < 0.95 && left < right, `row at ${y}`);
    assert.ok(left > 0.35 && right < 0.82, `the path at ${y} is at ${left}..${right}`);
  }
  // On the path the distance is zero; well off it, it is the gap to the edge.
  const frame = { plateLeft: 0, plateW: 1000, plateH: 1000 };
  const [y, left, right] = PORTRAIT_PATH[80];
  assert.equal(pathDistance(((left + right) / 2) * 1000, y * 1000, frame), 0);
  assert.ok(pathDistance(100, 500, frame) > 200);
  const e = pathEdges(y);
  assert.ok(e.left <= left && e.right >= right);
});

test("no portrait trunk base or pin stands on the path: each is 14px clear at 375, scaled with the screen", () => {
  assert.equal(PORTRAIT.pathClear, 14);
  for (const [vw, vh] of PHONES) for (let n = 1; n <= 30; n++) for (const [name, days] of Object.entries(SIZES)) {
    const { trees: placed, frame } = layoutPortrait(trees(n, days), vw, vh);
    const clear = PORTRAIT.pathClear * (vw / 375) - 1e-6;
    for (const t of placed) {
      const b = trunkBase(t);
      const d = Math.min(
        pathDistance(t.footX, t.footY, frame),
        pathDistance(b.x, b.y, frame), pathDistance(b.x + b.w, b.y, frame),
        pathDistance(b.x, b.y + b.h, frame), pathDistance(b.x + b.w, b.y + b.h, frame),
      );
      assert.ok(d >= clear, `${vw}x${vh}, ${n} trees, ${name}: ${t.id} is ${d.toFixed(1)}px from the path`);
      // And on its own side of it.
      const e = pathEdges(t.footY / frame.plateH);
      const x = (t.footX - frame.plateLeft) / frame.plateW;
      assert.ok(t.side < 0 ? x < e.left : x > e.right, `${vw}x${vh}, ${n} trees, ${name}: ${t.id} crossed the path`);
    }
  }
});

test("the portrait stage curve keeps young trees legible and still rises every stage", () => {
  const c = PORTRAIT.stageCurve;
  assert.equal(c.length, 8);
  assert.equal(c[7], 1);
  for (let i = 1; i < 8; i++) assert.ok(c[i] > c[i - 1]);
  for (let i = 0; i <= 3; i++) assert.ok(c[i] > STAGE_CURVE[i]);
  const [t] = layoutPortrait(trees(1, () => 1), 375, 844).trees;
  assert.ok(Math.abs(t.h - 844 * PORTRAIT.fullHeight * c[1]) < 1e-9);
  assert.deepEqual(PORTRAIT.tone, { brightness: 0.84, saturation: 0.72 });
  assert.deepEqual(sceneLayout(trees(3), 375, 844).tone, PORTRAIT.tone);
  assert.equal(sceneLayout(trees(3), 1280, 800).tone, undefined);
});

test("a near full-grown portrait tree is within the agreed share of the plate", () => {
  assert.ok(PORTRAIT.fullHeight >= 0.24 && PORTRAIT.fullHeight <= 0.28);
  const [t] = layoutPortrait(trees(1, () => 7), 375, 844).trees;
  assert.ok(Math.abs(t.h - 844 * PORTRAIT.fullHeight) < 1e-9);
});

test("portrait scale follows the count", () => {
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
  for (const n of [1, 3, 7]) assert.equal(portraitScale(n), 1);
  close(portraitScale(8), 0.965);
  close(portraitScale(12), 0.825);
  for (let n = 8; n <= 30; n++) assert.ok(portraitScale(n) < portraitScale(n - 1), `${n} trees aren't smaller than ${n - 1}`);
  // Past twelve the lattice may lower the scale further, never raise it.
  for (const n of [13, 15, 20, 30]) {
    const { scale, spots } = portraitSpots(n);
    assert.equal(spots.length, n);
    assert.ok(scale <= portraitScale(n) + 1e-9 && scale < 0.825);
  }
  assert.equal(layoutPortrait(trees(12), 375, 844).scale, portraitScale(12));
});

test("a portrait tag nudged clear of a nearer tag keeps its nudge and shows", () => {
  const items = [
    { id: "front", footX: 60, footY: 300, top: 250, w: 100, h: 22 },
    { id: "back", footX: 150, footY: 290, top: 260, w: 100, h: 22 },
  ];
  const slots = placeLabels(items, { minX: 8, maxX: 367, minY: 100, maxY: 700 }, [], { beside: true });
  assert.equal(slots.front.x, 10);
  assert.ok(slots.back.x > 114, "the back tag wasn't nudged clear");
  const { pos, shown } = panLabels(items, slots, { sx: 0, vw: 375 });
  assert.equal(shown.has("front") && shown.has("back"), true);
  assert.equal(pos.back.x, slots.back.x);
});

test("portrait depth runs from 1 to 0.45, in the same order as before", () => {
  const depths = PORTRAIT_ANCHORS.map((a) => a.depth);
  assert.equal(Math.max(...depths), 1);
  assert.equal(Math.min(...depths), PORTRAIT.farDepth);
  assert.equal(PORTRAIT.farDepth, 0.45);
  // Nearer anchors (larger y) are never smaller than farther ones.
  const byY = [...PORTRAIT_ANCHORS].sort((p, q) => q.y - p.y);
  for (let i = 1; i < byY.length; i++) assert.ok(byY[i].depth <= byY[i - 1].depth, `depth order breaks at y ${byY[i].y}`);
});

test("no portrait tree is drawn under the floor, and stages still read in order at every anchor", () => {
  for (const [vw, vh] of [[375, 844], [320, 844], [430, 932]]) for (const n of [1, 3, 7, 12, 15, 20]) {
    const floor = PORTRAIT.minHeight * (vw / 375);
    const byStage = Array.from({ length: 8 }, (_, stage) => layoutPortrait(trees(n, () => stage), vw, vh).trees);
    for (let i = 0; i < n; i++) {
      // The planted mark is sized by width and has a minimum width; every tree stage has the height floor.
      assert.ok(byStage[0][i].w >= PORTRAIT.minPlantedWidth * (vw / 375) - 1e-9, `${vw}, ${n} trees: planted mark ${i} is ${byStage[0][i].w}px wide`);
      assert.ok(byStage[1][i].h >= floor - 1e-9, `${vw}, ${n} trees: sprout ${i} is ${byStage[1][i].h}px`);
      for (let stage = 1; stage < 8; stage++) assert.ok(byStage[stage][i].h > byStage[stage - 1][i].h, `${vw}, ${n} trees, anchor ${i}: stage ${stage} isn't taller than ${stage - 1}`);
    }
  }
  assert.equal(PORTRAIT.minHeight, 28);
  assert.equal(PORTRAIT.minPlantedWidth, 20);
});

test("the planted mark is narrower than the sprout and no taller, at every anchor and width", () => {
  const check = (planted, sprout, where) => {
    for (let i = 0; i < planted.length; i++) {
      assert.ok(planted[i].w <= PLANTED_MAX_WIDTH * sprout[i].w + 1e-9, `${where}, anchor ${i}: planted ${planted[i].w} vs sprout ${sprout[i].w}`);
      assert.ok(planted[i].w < sprout[i].w && planted[i].h <= sprout[i].h, `${where}, anchor ${i}: planted is not smaller than the sprout`);
      // Still standing on its anchor.
      assert.ok(Math.abs(planted[i].left + planted[i].art.footX * planted[i].w - planted[i].footX) < 1e-9);
      assert.ok(Math.abs(planted[i].top + planted[i].art.footY * planted[i].h - planted[i].footY) < 1e-9);
    }
  };
  // Portrait: the twelve anchors, and the generated spots past twelve.
  for (const [vw, vh] of [[320, 844], [375, 844], [430, 932], [768, 1024]]) for (const n of [12, 20]) {
    check(layoutPortrait(trees(n, () => 0), vw, vh).trees, layoutPortrait(trees(n, () => 1), vw, vh).trees, `portrait ${vw}, ${n} trees`);
  }
  // Wide: the seven anchors, on a desktop and a landscape phone.
  for (const [vw, vh] of [[1280, 800], [844, 390]]) {
    const { w, h } = plateSize(vw, vh);
    check(layoutScene(trees(7, () => 0), w, h).trees, layoutScene(trees(7, () => 1), w, h).trees, `wide ${vw}`);
  }
});

test("past twelve trees the generated spots are handed out in spread order", () => {
  for (const n of [13, 15, 20, 30]) {
    const { spots } = portraitSpots(n);
    assert.equal(spots.length, n);
    const ys = spots.map((s) => s.y), lo = Math.min(...ys), hi = Math.max(...ys);
    assert.ok(hi >= 0.7 && lo <= 0.4, `${n} trees use ${lo}..${hi} of the hill`);
    const band = (s) => (s.y > lo + ((hi - lo) * 2) / 3 ? "near" : s.y > lo + (hi - lo) / 3 ? "middle" : "far");
    for (let k = 3; k <= 7; k++) assert.deepEqual([...new Set(spots.slice(0, k).map(band))].sort(), ["far", "middle", "near"], `${n} trees, first ${k}`);
    for (const s of spots) assert.ok(s.depth >= PORTRAIT.farDepth && s.depth <= 1);
    // Both sides of the path are used.
    assert.deepEqual([...new Set(spots.map((s) => s.side))].sort(), [-1, 1], `${n} trees are all on one side of the path`);
  }
});

test("a portrait tag leans away from the path, its near end just past the pin", () => {
  const band = { minX: 8, maxX: 367, minY: 100, maxY: 700 };
  const left = placeLabels([{ id: "l", footX: 150, footY: 300, top: 250, w: 100, h: 22, lean: -1 }], band, [], { beside: true });
  assert.equal(left.l.x, 60);   // ends 10px right of the pin, the rest to the left
  const right = placeLabels([{ id: "r", footX: 220, footY: 300, top: 250, w: 100, h: 22, lean: 1 }], band, [], { beside: true });
  assert.equal(right.r.x, 210); // starts 10px left of the pin, the rest to the right
});

test("past twelve trees the two sides of the path never differ by more than one", () => {
  for (let n = 13; n <= 30; n++) {
    const { spots } = portraitSpots(n);
    assert.equal(spots.length, n);
    let left = 0, right = 0;
    spots.forEach((s, i) => {
      if (s.side < 0) left++; else right++;
      assert.ok(Math.abs(left - right) <= 1, `${n} trees: after ${i + 1}, ${left} left and ${right} right`);
      // Strict alternation, starting on the left.
      assert.equal(s.side, i % 2 ? 1 : -1, `${n} trees: tree ${i + 1} is on the wrong side`);
    });
    // The right-hand trees use the open meadow beside the path's lower half.
    assert.ok(spots.some((s) => s.side > 0 && s.y >= 0.45 && s.y <= 0.75), `${n} trees: nothing in the right-hand meadow`);
  }
});

test("a tag keeps off a neighbouring grown tree when it has somewhere else to go", () => {
  const band = { minX: 8, maxX: 367, minY: 100, maxY: 700 };
  const item = { id: "young", footX: 200, footY: 300, top: 270, w: 80, h: 22, lean: -1 };
  // With no grown tree nearby the tag leans away from the path: 130..210.
  assert.equal(placeLabels([item], band, [], { beside: true }).young.x, 130);
  // Leaning would put it on the oak; centred below the pin is free.
  const oak = { id: "oak", x: 20, y: 200, w: 110, h: 140 };
  assert.equal(placeLabels([item], band, [], { beside: true, canopies: [oak] }).young.x, 160);
  // A wider oak covers that too: the path side of the pin, if the tag
  // wouldn't lie across the path there; otherwise the next spot along.
  const wide = { id: "wide", x: 60, y: 200, w: 120, h: 140 };
  assert.equal(placeLabels([item], band, [], { beside: true, canopies: [wide], crosses: () => false }).young.x, 190);
  assert.equal(placeLabels([item], band, [], { beside: true, canopies: [wide], crosses: () => true }).young.x, 192);
  // Hemmed in on both sides under the pin: above its own tree.
  const low = { id: "low", x: 0, y: 290, w: 400, h: 60 };
  assert.deepEqual(placeLabels([item], band, [], { beside: true, canopies: [low] }).young, { x: 160, y: 270 - 22 - 6, out: false, held: true });
  // Nothing else fits: it leans onto the tree, as before, rather than hiding.
  const everywhere = { id: "all", x: 0, y: 0, w: 400, h: 800 };
  assert.equal(placeLabels([item], band, [], { beside: true, canopies: [everywhere] }).young.x, 130);
  // A tree's own canopy never counts against its own tag.
  assert.equal(placeLabels([item], band, [], { beside: true, canopies: [{ ...oak, id: "young" }] }).young.x, 130);
  assert.equal(CANOPY_FROM_STAGE, 4);
});

test("crossesPath and canopyOf describe the plate and a tree", () => {
  const frame = { plateLeft: 0, plateW: 1000, plateH: 1000 };
  const [y, left, right] = PORTRAIT_PATH[80];
  assert.equal(crossesPath({ x: left * 1000 - 20, y: y * 1000 - 5, w: 60, h: 10 }, frame), true);
  assert.equal(crossesPath({ x: 20, y: y * 1000 - 5, w: 60, h: 10 }, frame), false);
  const c = canopyOf({ id: "t", left: 100, top: 50, w: 100, h: 200 });
  assert.deepEqual([c.id, c.round, Math.round(c.x), c.y, Math.round(c.w), Math.round(c.h)], ["t", true, 104, 50, 92, 180]);
  // A round canopy is the ellipse inside its box: a tag in the box's corner is clear of it.
  const band = { minX: 0, maxX: 400, minY: 0, maxY: 800 };
  const tag = { id: "y", footX: 60, footY: 44, top: 20, w: 40, h: 16, lean: 0 };
  const crown = { id: "t", round: true, x: 0, y: 40, w: 200, h: 200 };
  assert.equal(placeLabels([tag], band, [], { beside: true, canopies: [crown] }).y.x, 40);
  // As a plain box the same canopy covers that corner, so the tag moves on.
  assert.notEqual(placeLabels([{ ...tag, top: 40 }], band, [], { beside: true, canopies: [{ ...crown, y: 46, round: false }] }).y.y, 50);
});

test("portrait tags are the name alone; the wide plate keeps the stage line", () => {
  for (const n of [1, 7, 12, 15]) assert.equal(sceneLayout(trees(n), 375, 844).showStage, false);
  assert.equal(sceneLayout(trees(15), 1280, 800).showStage, true);
});

test("portrait labels stay on screen, clear of each other and of every other trunk base", () => {
  for (const [vw, vh] of [[320, 844], [375, 844]]) for (const n of [3, 7, 12, 15]) for (const days of Object.values(SIZES)) {
    const s = sceneLayout(trees(n, days), vw, vh);
    const items = s.trees.map((t) => ({ id: t.id, footX: t.footX, footY: t.footY, top: t.top, lean: t.side, w: 96, h: 22 }));
    const bases = s.trees.map(trunkBase);
    const slots = placeLabels(items, { minX: 8, maxX: vw - 8, minY: 130, maxY: vh - 140 }, bases, { beside: true });
    const { pos, shown } = panLabels(items, slots, { sx: 0, vw }, new Set(), bases);
    // A tag sits just under its own trunk base, at most 0.7 of its width to either side.
    for (const it of items) {
      const p = pos[it.id];
      assert.ok([it.footY + 6, it.top - it.h - 6, it.top - it.h - 16].some((y) => Math.abs(p.y - y) < 1e-9), `${vw}, ${n} trees: a tag is neither under its trunk base nor above its tree`);
      assert.ok(Math.abs(p.x + it.w / 2 - it.footX) <= 1.1 * it.w + it.w / 2, `${vw}, ${n} trees: a tag drifted sideways`);
    }
    const rects = items.filter((it) => shown.has(it.id)).map((it) => ({ id: it.id, ...pos[it.id], w: it.w, h: it.h }));
    assert.ok(rects.length >= 1, `${vw}, ${n} trees: no label shown`);
    for (const r of rects) {
      assert.ok(r.x >= 8 - 1e-9 && r.x + r.w <= vw - 8 + 1e-9, `${vw}, ${n} trees: a label is off the side`);
      for (const b of bases) {
        if (b.id === r.id) continue;
        assert.ok(!(r.x < b.x + b.w && b.x < r.x + r.w && r.y < b.y + b.h && b.y < r.y + r.h), `${vw}, ${n} trees: a label covers a trunk base`);
      }
    }
    noOverlap(rects);
  }
});

test("turning the phone opens the scene afresh", () => {
  assert.deepEqual(
    opening([{ key: "portrait:g1", hasTrees: true }, { scrolled: true }, { key: "wide:g1", hasTrees: true }]),
    [CENTRE, CENTRE],
  );
  // With the plate's name on the key, "no grove" is still no grove: a late
  // load after a swipe keeps the swipe.
  assert.deepEqual(opening([{ key: "wide:", hasTrees: false }, { scrolled: true }, { key: "wide:g1", hasTrees: true }]), [CENTRE, NOTHING]);
});

test("only sprout, seedling and sapling get the young-tree look", () => {
  for (const stage of [0, 4, 5, 6, 7]) assert.equal(youngLook(stage), null);
  for (const stage of [1, 2, 3]) {
    const look = youngLook(stage);
    assert.match(look.filter, /^contrast\([\d.]+\) brightness\([\d.]+\) saturate\([\d.]+\) drop-shadow\(0 0 [\d.]+px rgba\(250, 252, 240, [\d.]+\)\)$/);
    assert.ok(look.shadowSize > 1 && look.shadowOpacity > 0.55);
  }
});

