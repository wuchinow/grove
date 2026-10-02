"use client";

import React from "react";
import { C } from "../../lib/theme";
import Tree from "../Tree";
import Icon from "../Icon";
import GroveBackdrop from "../GroveBackdrop";

// The grove scene: the backdrop, the scrolling row of trees with their floating
// labels, the legend (or the empty-grove copy), and the stats strip under it.
//
// The stage's height is the .groveStage rule in ui.css, an explicit height
// rather than an aspect-ratio. Each label sits in a fixed-height slot, so every
// tree stands on the same ground line however many lines its name takes.
export default function GroveScene({ g }) {
  const { concepts, grewIds, justPlantedIds, setSelected } = g;
  const has = concepts.length > 0;
  const ordered = [...concepts].sort((a, b) => b.days - a.days || b.mastery - a.mastery);
  const treeRowRef = React.useRef(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  // Measures the real scroll position rather than guessing from tree count,
  // since how many fit without scrolling depends on the actual screen width.
  const updateScrollState = React.useCallback(() => {
    const el = treeRowRef.current;
    if (!el) { setCanScrollLeft(false); setCanScrollRight(false); return; }
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);
  React.useLayoutEffect(() => { updateScrollState(); }, [ordered.length, updateScrollState]);
  React.useEffect(() => {
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [updateScrollState]);
  const scrolls = canScrollLeft || canScrollRight;

  // No explicit `behavior` here on purpose: `.noscroll`'s scroll-behavior in
  // theme.js governs smooth-vs-instant, and already flips to instant under
  // the OS reduced-motion setting - the one place this app makes that call.
  function scrollTreeRow(dir) {
    const el = treeRowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 2 / 3) });
  }

  const arrow = (on) => ({ width: 28, height: 28, border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", visibility: on ? "visible" : "hidden", cursor: on ? "pointer" : "default" });

  return (
    <div style={{ margin: "14px 16px 0", borderRadius: 22, overflow: "hidden", border: `1px solid ${C.line}`, background: C.bg, boxShadow: "0 14px 34px rgba(31,56,36,.10)" }}>
      <div className={has ? "groveStage" : "groveStage isEmpty"}>
        <GroveBackdrop />
        {has ? (
          <div style={{ position: "relative", zIndex: 1 }}>
            <div ref={treeRowRef} onScroll={updateScrollState} className="noscroll" style={{ display: "flex", flexWrap: "nowrap", alignItems: "flex-end", justifyContent: scrolls ? "flex-start" : "center", gap: 0, padding: "24px 8px 10px", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
              {(() => { let plantedIndex = 0; return ordered.map((c) => {
                const justPlanted = justPlantedIds.includes(c.id);
                const style = { border: "none", background: "transparent", cursor: "pointer", padding: "0 3px", transformOrigin: "50% 100%", display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto", width: 88 };
                if (justPlanted) style.animationDelay = `${Math.min(plantedIndex++, 6) * 50}ms`;
                return (
                  <button key={c.id} onClick={() => setSelected(c.id)} className={justPlanted ? "planted" : grewIds.includes(c.id) ? "grew" : ""} style={style} title={c.name}>
                    <Tree days={c.days} mastery={c.mastery} width={76} />
                    <span className="treeLabelSlot">
                      <span className="treeLabelCard"><span className="treeLabel" title={c.name}>{c.name}</span></span>
                    </span>
                  </button>
                );
              }); })()}
            </div>
          </div>
        ) : (
          <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", padding: "0 20px 16px" }}>
            <Tree days={0} mastery={0} width={78} />
          </div>
        )}
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, padding: has ? "6px 10px" : "16px 18px 18px", textAlign: "center" }}>
        {has ? (
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* Reserved-width slots at the outer edges keep the text centred
                whether zero, one, or two arrows are showing. Which arrow
                shows follows the real scroll position: only right at the
                start, only left at the end, both in between, none if
                everything already fits. */}
            <button onClick={() => scrollTreeRow(-1)} disabled={!canScrollLeft} aria-label="Scroll trees left" style={{ ...arrow(canScrollLeft), justifyContent: "flex-start" }}>
              <Icon name="chevronLeft" size={16} color={C.primary} strokeWidth={2.4} />
            </button>
            <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.sub }}>Taller = more sessions</div>
            <button onClick={() => scrollTreeRow(1)} disabled={!canScrollRight} aria-label="Scroll trees right" style={{ ...arrow(canScrollRight), justifyContent: "flex-end" }}>
              <Icon name="chevronRight" size={16} color={C.primary} strokeWidth={2.4} />
            </button>
          </div>
        ) : (
          <>
            <div className="disp" style={{ fontSize: 22, fontWeight: 500, color: C.ink }}>A quiet, empty grove</div>
            <div style={{ fontSize: 14, color: C.sub, marginTop: 6, lineHeight: 1.55, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>Add what you're studying below. Grove asks you questions instead of handing over answers, which is what makes it stick.</div>
          </>
        )}
      </div>
      {has && (
        <div style={{ borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "space-around", padding: "10px 8px 11px", fontSize: 12 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontWeight: 600, fontSize: 18, lineHeight: 1.2 }}>{concepts.length}</div><div style={{ color: C.sub }}>Planted</div></div>
        </div>
      )}
    </div>
  );
}
