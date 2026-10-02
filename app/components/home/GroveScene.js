"use client";

import React from "react";
import { C } from "../../lib/theme";
import Tree from "../Tree";
import Icon from "../Icon";
import GroveBackdrop from "../GroveBackdrop";

// The grove scene: the backdrop, the scrolling row of trees with their labels,
// the legend (or the empty-grove copy), and the stats strip under it.
export default function GroveScene({ g }) {
  const { concepts, grewIds, justPlantedIds, setSelected } = g;
  const flourishing = concepts.filter((c) => c.mastery >= 85).length;
  const thirsty = concepts.filter((c) => c.mastery < 40).length;
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

  return (
    <div style={{ margin: "16px 20px 0", borderRadius: 22, overflow: "hidden", boxShadow: "0 18px 38px rgba(58,42,32,.18), 0 2px 6px rgba(58,42,32,.08)", border: `1px solid ${C.line}` }}>
      <div style={{ position: "relative", minHeight: has ? 300 : 264, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <GroveBackdrop />
        {has ? (
          <div style={{ position: "relative", zIndex: 1 }}>
          <div ref={treeRowRef} onScroll={updateScrollState} className="noscroll" style={{ display: "flex", flexWrap: "nowrap", alignItems: "flex-end", justifyContent: scrolls ? "flex-start" : "center", gap: 0, padding: "28px 10px 12px", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
              {(() => { let plantedIndex = 0; return ordered.map((c) => {
                const justPlanted = justPlantedIds.includes(c.id);
                const style = { border: "none", background: "transparent", cursor: "pointer", padding: "0 2px", transformOrigin: "50% 100%", display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto", width: 84 };
                if (justPlanted) style.animationDelay = `${Math.min(plantedIndex++, 6) * 50}ms`;
                return (
                  <button key={c.id} onClick={() => setSelected(c.id)} className={justPlanted ? "planted" : grewIds.includes(c.id) ? "grew" : ""} style={style} title={c.name}>
                    <Tree days={c.days} mastery={c.mastery} width={68} />
                    <span className="treeLabel" title={c.name}>{c.name}</span>
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
      <div style={{ background: C.card, borderTop: `1px solid ${C.line}`, padding: "11px 14px", textAlign: "center" }}>
        {has ? (
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* Reserved-width slots at the outer edges keep the text centred
                whether zero, one, or two arrows are showing. Which arrow
                shows follows the real scroll position: only right at the
                start, only left at the end, both in between, none if
                everything already fits. */}
            <button onClick={() => scrollTreeRow(-1)} disabled={!canScrollLeft} aria-label="Scroll trees left" style={{ width: 22, border: "none", background: "transparent", padding: 0, display: "flex", justifyContent: "flex-start", visibility: canScrollLeft ? "visible" : "hidden", cursor: canScrollLeft ? "pointer" : "default" }}>
              <Icon name="chevronLeft" size={16} color={C.primaryDeep} strokeWidth={3} />
            </button>
            <div style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: C.sub }}>Taller = more sessions &middot; Greener = you know it better</div>
            <button onClick={() => scrollTreeRow(1)} disabled={!canScrollRight} aria-label="Scroll trees right" style={{ width: 22, border: "none", background: "transparent", padding: 0, display: "flex", justifyContent: "flex-end", visibility: canScrollRight ? "visible" : "hidden", cursor: canScrollRight ? "pointer" : "default" }}>
              <Icon name="chevronRight" size={16} color={C.primaryDeep} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <>
            <div className="disp" style={{ fontSize: 18, fontWeight: 600, color: C.ink }}>A quiet, empty grove</div>
            <div style={{ fontSize: 13, color: C.sub, fontWeight: 700, marginTop: 4, lineHeight: 1.5, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>Add what you're studying below. Grove asks you questions instead of handing over answers, which is what makes it stick.</div>
          </>
        )}
      </div>
      {has && (
        <div style={{ background: C.card, display: "flex", justifyContent: "space-around", padding: "13px 8px", fontSize: 12.5 }}>
          <div style={{ textAlign: "center" }}><div className="disp" style={{ fontWeight: 700, fontSize: 18 }}>{concepts.length}</div><div style={{ color: C.sub, fontWeight: 700 }}>Planted</div></div>
          <div style={{ textAlign: "center" }}><div className="disp" style={{ fontWeight: 700, fontSize: 18, color: C.sageDeep }}>{flourishing}</div><div style={{ color: C.sub, fontWeight: 700 }}>Flourishing</div></div>
          <div style={{ textAlign: "center" }}><div className="disp" style={{ fontWeight: 700, fontSize: 18, color: C.coral }}>{thirsty}</div><div style={{ color: C.sub, fontWeight: 700 }}>Needs work</div></div>
        </div>
      )}
    </div>
  );
}
