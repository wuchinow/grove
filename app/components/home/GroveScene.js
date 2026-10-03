"use client";

import React from "react";
import Icon from "../Icon";
import SceneTree from "./SceneTree";
import { OPENING, openingMove, panLabels, placeLabels, sceneLayout, trunkBase } from "../../lib/scene";

// The grove scene: the painted plate full-bleed behind Home, with the trees
// standing on their anchors and their labels. A portrait screen gets the tall
// plate, which fits the screen and doesn't pan; any other screen gets the
// wide plate, which pans sideways, with the two chevrons that pan it. Home's header, notices and bar
// float above it. Where everything goes is worked out in lib/scene.js; this
// measures the viewport and the labels, and draws.
export default function GroveScene({ g }) {
  const { activeGroveId, concepts, grewIds, justPlantedIds, preview, setSelected } = g;
  const has = concepts.length > 0;
  const treeRowRef = React.useRef(null);
  const labelRefs = React.useRef({});
  // What openingMove (lib/scene.js) has done so far, and whether the student
  // has scrolled the scene themselves.
  const opening = React.useRef(OPENING);
  // Label state across scroll frames: each label's slot and size (decided
  // once per layout), which labels were shown last frame, and where each was
  // last shown, so a hiding label fades out where it was.
  const labelItems = React.useRef([]);
  const labelSlots = React.useRef({});
  const labelObstacles = React.useRef([]);
  const shownRef = React.useRef(new Set());
  const lastPos = React.useRef({});
  const frame = React.useRef(0);
  const [view, setView] = React.useState(null);
  const [fontsReady, setFontsReady] = React.useState(false);
  const [labels, setLabels] = React.useState({ pos: {}, shown: new Set() });
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  // Explicit pixel sizes from the real viewport, never aspect-ratio.
  React.useLayoutEffect(() => {
    const measure = () => setView({ vw: window.innerWidth, vh: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Labels are measured to be placed. A label measured before the web fonts
  // arrive is the wrong size (the fallback face wraps differently), so the
  // layout is measured again once they're in.
  React.useEffect(() => {
    let live = true;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (live) setFontsReady(true); });
    return () => { live = false; };
  }, []);

  const layout = view ? sceneLayout(concepts, view.vw, view.vh) : null;
  const plate = layout ? layout.plate : null;
  const offsetTop = layout ? layout.offsetTop : 0;
  const portrait = !!layout && layout.kind === "portrait";
  const layoutKey = layout ? `${layout.kind}|${view.vw}x${view.vh}|${fontsReady ? "fonts" : "fallback"}|${concepts.map((c) => `${c.id}:${c.days}:${c.name}`).join("|")}` : "";

  // Measures the real scroll position rather than guessing from tree count,
  // since how much of the plate fits depends on the actual screen width.
  const updateScrollState = React.useCallback(() => {
    const el = treeRowRef.current;
    if (!el) { setCanScrollLeft(false); setCanScrollRight(false); return; }
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  // Where the labels go for the current scroll position: each keeps its slot
  // and only slides sideways (panLabels in lib/scene.js).
  const placeForScroll = React.useCallback(() => {
    const el = treeRowRef.current;
    if (!el || !labelItems.current.length) return;
    const res = panLabels(labelItems.current, labelSlots.current, { sx: el.scrollLeft, vw: el.clientWidth }, shownRef.current, labelObstacles.current);
    shownRef.current = res.shown;
    for (const id of Object.keys(res.pos)) {
      if (res.shown.has(id) || !lastPos.current[id]) lastPos.current[id] = res.pos[id];
    }
    setLabels({ pos: { ...lastPos.current }, shown: res.shown });
  }, []);

  // Labels: measured after render, then given vertical slots clear of each
  // other and of the floating notices and bar (in plate pixels), once per
  // layout. Runs before paint, so the first placement is never seen.
  React.useLayoutEffect(() => {
    if (!layout) return;
    const bar = document.querySelector(".actionBar");
    const stack = document.querySelector(".sceneTopStack");
    const minY = (stack ? stack.getBoundingClientRect().bottom : 120) + 8 - offsetTop;
    const maxY = (bar ? bar.getBoundingClientRect().top : view.vh) - 8 - offsetTop;
    const items = layout.trees.map((t) => {
      const el = labelRefs.current[t.id];
      return { id: t.id, footX: t.footX, footY: t.footY, top: t.top, w: el ? el.offsetWidth : 140, h: el ? el.offsetHeight : 42 };
    });
    labelItems.current = items;
    // On the portrait plate nothing pans, so the slots are clamped to the
    // screen from the start, and no label may cover another tree's trunk base.
    labelObstacles.current = portrait ? layout.trees.map(trunkBase) : [];
    const edge = portrait ? 8 : 0;
    labelSlots.current = placeLabels(items, { minX: edge, maxX: layout.width - edge, minY, maxY }, labelObstacles.current, { beside: portrait });
    lastPos.current = {};
    shownRef.current = new Set();
    placeForScroll();
  }, [layoutKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scrolling re-places the labels at most once a frame.
  function onScroll() {
    updateScrollState();
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => { frame.current = 0; placeForScroll(); });
  }
  React.useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // The student scrolling the scene themselves: a wheel, a touch drag or a
  // chevron. The scene's own centring and panning don't count.
  const markScrolled = () => { opening.current = { ...opening.current, userScrolled: true }; };

  // Where the scene sits when its layout changes; openingMove decides. A
  // grove's trees centre it the first time they appear (it loads after Home
  // can mount), never on later changes in the same grove and never once the
  // student has scrolled. Centring is instant, before paint: on a phone, on
  // the first tree, so the second and third peek in at the edges as a cue to
  // swipe; on a wider screen, on the first copy of the plate. Then, if a
  // tree was just planted or just grew, pan to it so the moment is on
  // screen. That pan follows .noscroll's scroll-behavior in theme.js:
  // smooth, or instant under the OS reduced-motion setting.
  React.useLayoutEffect(() => {
    const el = treeRowRef.current;
    if (!el || !layout) return;
    const focus = layout.trees.find((t) => justPlantedIds.includes(t.id)) || layout.trees.find((t) => grewIds.includes(t.id));
    // The plate is part of the key: turning the phone is a new scene to open.
    const move = openingMove(opening.current, { key: `${layout.kind}:${preview ? "sample" : activeGroveId || ""}`, hasTrees: has, focusId: focus ? focus.id : null });
    opening.current = move.state;
    if (move.centre) {
      const prev = el.style.scrollBehavior;
      el.style.scrollBehavior = "auto";
      const first = layout.trees[0];
      el.scrollLeft = Math.max(0, view.vw < 600 && first ? first.footX - el.clientWidth / 2 : (layout.tileW - el.clientWidth) / 2);
      el.style.scrollBehavior = prev;
    }
    if (move.panTo && focus) el.scrollTo({ left: Math.max(0, focus.footX - el.clientWidth / 2) });
    updateScrollState();
    placeForScroll();
  }, [layoutKey, updateScrollState]); // eslint-disable-line react-hooks/exhaustive-deps

  // No explicit `behavior` here on purpose: `.noscroll`'s scroll-behavior in
  // theme.js governs smooth-vs-instant, and already flips to instant under
  // the OS reduced-motion setting - the one place this app makes that call.
  function scrollTreeRow(dir) {
    const el = treeRowRef.current;
    if (!el) return;
    markScrolled();
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 2 / 3) });
  }

  let plantedIndex = 0;
  return (
    <div className={portrait ? "scene portrait" : "scene"}>
      {layout && (
        <div ref={treeRowRef} onScroll={onScroll} onWheel={markScrolled} onTouchMove={markScrolled} className={layout.pans ? "sceneScroller noscroll" : "sceneScroller noscroll still"}>
          <div className="scenePlates" style={{ width: layout.width, height: plate.h, top: offsetTop }}>
            {/* Each copy shows its window of the plate; odd copies are mirrored. */}
            {Array.from({ length: layout.tiles }, (_, k) => (
              // A pixel of overlap, so a fractional copy width never leaves a hairline between copies.
              <div key={k} className="scenePlateWindow" style={{ left: Math.floor(k * layout.tileW), width: Math.ceil(layout.tileW) + 1, height: plate.h, transform: k % 2 ? "scaleX(-1)" : undefined }}>
                <img className="scenePlate" src={layout.src} alt="" width={Math.round(plate.w)} height={Math.round(plate.h)} draggable={false} style={{ left: layout.plateLeft, width: plate.w, height: plate.h }} />
              </div>
            ))}
            {layout.trees.map((t, i) => {
              const c = concepts[i];
              const justPlanted = justPlantedIds.includes(c.id);
              const delay = justPlanted ? `${Math.min(plantedIndex++, 6) * 50}ms` : undefined;
              return (
                <SceneTree
                  key={c.id}
                  t={t}
                  c={c}
                  label={labels.pos[c.id]}
                  labelShown={labels.shown.has(c.id)}
                  showStage={layout.showStage}
                  portrait={portrait}
                  labelRef={(el) => { labelRefs.current[c.id] = el; }}
                  animClass={justPlanted ? "planted" : grewIds.includes(c.id) ? "grew" : ""}
                  delay={delay}
                  onOpen={() => setSelected(c.id)}
                />
              );
            })}
          </div>
        </div>
      )}
      <div className="sceneFade" />
      {has && (
        <>
          {/* Each chevron shows only while the scene can pan that way. */}
          <button onClick={() => scrollTreeRow(-1)} disabled={!canScrollLeft} aria-label="Scroll trees left" className="sceneChevron left" style={{ visibility: canScrollLeft ? "visible" : "hidden" }}>
            <Icon name="chevronLeft" size={18} color="#234d3b" strokeWidth={2.4} />
          </button>
          <button onClick={() => scrollTreeRow(1)} disabled={!canScrollRight} aria-label="Scroll trees right" className="sceneChevron right" style={{ visibility: canScrollRight ? "visible" : "hidden" }}>
            <Icon name="chevronRight" size={18} color="#234d3b" strokeWidth={2.4} />
          </button>
        </>
      )}
    </div>
  );
}
