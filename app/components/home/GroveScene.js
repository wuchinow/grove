"use client";

import React from "react";
import Icon from "../Icon";
import SceneTree from "./SceneTree";
import { PLATE, layoutScene, placeLabels, plateSize } from "../../lib/scene";

// The grove scene: the painted plate full-bleed behind Home, wider than a
// phone, so it pans sideways; the trees standing on their anchors with their
// labels; and the two chevrons that pan it. Home's header, notices and bar
// float above it. Where everything goes is worked out in lib/scene.js; this
// measures the viewport and the labels, and draws.
export default function GroveScene({ g }) {
  const { concepts, grewIds, justPlantedIds, setSelected } = g;
  const has = concepts.length > 0;
  const treeRowRef = React.useRef(null);
  const labelRefs = React.useRef({});
  const opened = React.useRef(false);
  const [view, setView] = React.useState(null);
  const [labels, setLabels] = React.useState({});
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  // Explicit pixel sizes from the real viewport, never aspect-ratio.
  React.useLayoutEffect(() => {
    const measure = () => setView({ vw: window.innerWidth, vh: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const plate = view ? plateSize(view.vw, view.vh) : null;
  const layout = plate ? layoutScene(concepts, plate.w, plate.h) : null;
  // A very wide window draws the plate taller than the screen; keep its
  // bottom, where the meadow is, and lose sky.
  const offsetTop = plate ? Math.min(0, view.vh - plate.h) : 0;
  const layoutKey = layout ? `${plate.w}x${plate.h}|${concepts.map((c) => `${c.id}:${c.days}:${c.name}`).join("|")}` : "";

  // Measures the real scroll position rather than guessing from tree count,
  // since how much of the plate fits depends on the actual screen width.
  const updateScrollState = React.useCallback(() => {
    const el = treeRowRef.current;
    if (!el) { setCanScrollLeft(false); setCanScrollRight(false); return; }
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  // Labels: measured after render, then placed clear of each other and of
  // the floating notices and bar (converted to plate pixels). Runs before
  // paint, so the first placement is never seen.
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
    setLabels(placeLabels(items, { minX: 0, maxX: layout.width, minY, maxY }));
  }, [layoutKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // On open: centred on the first copy of the plate, where the first trees
  // stand, set instantly before paint. Then, if a tree was just planted or
  // just grew, pan to it so the moment is on screen. That pan follows
  // .noscroll's scroll-behavior in theme.js: smooth, or instant under the OS
  // reduced-motion setting.
  React.useLayoutEffect(() => {
    const el = treeRowRef.current;
    if (!el || !layout) return;
    if (!opened.current) {
      opened.current = true;
      const prev = el.style.scrollBehavior;
      el.style.scrollBehavior = "auto";
      el.scrollLeft = Math.max(0, (layout.tileW - el.clientWidth) / 2);
      el.style.scrollBehavior = prev;
      const focus = layout.trees.find((t) => justPlantedIds.includes(t.id)) || layout.trees.find((t) => grewIds.includes(t.id));
      if (focus) el.scrollTo({ left: Math.max(0, focus.footX - el.clientWidth / 2) });
    }
    updateScrollState();
  }, [layoutKey, updateScrollState]); // eslint-disable-line react-hooks/exhaustive-deps

  // No explicit `behavior` here on purpose: `.noscroll`'s scroll-behavior in
  // theme.js governs smooth-vs-instant, and already flips to instant under
  // the OS reduced-motion setting - the one place this app makes that call.
  function scrollTreeRow(dir) {
    const el = treeRowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 2 / 3) });
  }

  let plantedIndex = 0;
  return (
    <div className="scene">
      {layout && (
        <div ref={treeRowRef} onScroll={updateScrollState} className="sceneScroller noscroll">
          <div className="scenePlates" style={{ width: layout.width, height: plate.h, top: offsetTop }}>
            {/* Each copy shows its window of the plate; odd copies are mirrored. */}
            {Array.from({ length: layout.tiles }, (_, k) => (
              <div key={k} className="scenePlateWindow" style={{ left: k * layout.tileW, width: layout.tileW, height: plate.h, transform: k % 2 ? "scaleX(-1)" : undefined }}>
                <img className="scenePlate" src={PLATE.src} alt="" width={plate.w} height={plate.h} draggable={false} style={{ left: -layout.crop.left * plate.w }} />
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
                  label={labels[c.id]}
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
