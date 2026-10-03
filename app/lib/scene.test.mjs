import test from "node:test";
import assert from "node:assert/strict";
import { ANCHORS, ANCHOR_SPACING, FULL_HEIGHT, LABEL_EDGE, LABEL_ENTER, PLATE_ASPECT, REPEAT, STAGE_CURVE, layoutScene, panLabels, placeLabels, plateSize, speciesOf, treeArt } from "./scene.js";
import { SCENE_ART } from "./scene-art.js";

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
    assert.ok(Math.abs(t.h - 600 * FULL_HEIGHT * a.depth * STAGE_CURVE[stage]) < 1e-9);
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
  assert.deepEqual(pos.a, { x: 440, y: 306 });
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

