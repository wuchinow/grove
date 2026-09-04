"use client";

import React from "react";
import { C } from "../lib/theme";
import { statusOf, growthLabel, canopyColor } from "../lib/ai";
import Tree from "../components/Tree";
import { Shell, Logo } from "../components/Shell";
import Icon from "../components/Icon";
import GroveBackdrop from "../components/GroveBackdrop";
import GroveSwitcher from "../components/GroveSwitcher";

export default function Home({ g }) {
  const { activeGroveId, activeGroveName, child, clearGrove, concepts, error, exitPreview, fileRef, grewIds, groves, grovesLoaded, handleFile, handleTopic, nextStage, openGrove, preview, profile, removeTree, saveState, selected, setEditingProfile, setScreen, setSelected, setSetupGrade, setTopicText, startPreview, startSession, studyEverything, topicText } = g;
  const [hideSample, setHideSample] = React.useState(false);
  const [switcherOpen, setSwitcherOpen] = React.useState(false);
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

  // Not every grove needs to be on screen at once. If nothing is open: with
  // exactly one grove, open it silently (today's returning-user experience,
  // unchanged). With two or more, there is a real choice to make, so surface
  // the switcher. With none yet, land directly on the "start something new"
  // prompt below; there is nothing to switch between.
  React.useEffect(() => {
    if (!child || !grovesLoaded || activeGroveId || preview) return;
    if (groves.length === 1) openGrove(groves[0].id);
    else if (groves.length > 1) setSwitcherOpen(true);
  }, [child, grovesLoaded, activeGroveId, preview, groves.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Shell>
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        {child && activeGroveId ? (
          <button onClick={() => setSwitcherOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "none", background: "transparent", cursor: "pointer", padding: 0, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(120,66,37,.24)" }}><Icon name="tree" size={17} color="#FCEFE4" /></div>
            <span className="disp" style={{ fontWeight: 600, fontSize: 19, letterSpacing: "-.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>{activeGroveName || "Grove"}</span>
            <Icon name="chevronDown" size={15} color={C.stone} strokeWidth={2.4} />
          </button>
        ) : (
          <Logo />
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button onClick={() => setScreen("progress")} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 13px", borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.card, color: C.primaryDeep, fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(58,42,32,.07)" }}><Icon name="chart" size={15} color={C.primaryDeep} /> Progress</button>
          <button onClick={() => setScreen("help")} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 13px", borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.card, color: C.primaryDeep, fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(58,42,32,.07)" }}><Icon name="help" size={15} color={C.primaryDeep} /> Help</button>
        </div>
      </div>

      {preview && (
        <div style={{ margin: "14px 20px 0", background: C.soft, border: `1.5px solid ${C.line}`, borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: C.primaryDeep, lineHeight: 1.45 }}>
            A sample grove, so you can see what one looks like once it has grown. Nothing here is saved.
          </div>
          <button onClick={exitPreview} style={{ border: "none", background: C.card, color: C.primaryDeep, borderRadius: 10, padding: "9px 13px", cursor: "pointer", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>Done</button>
        </div>
      )}

      {grewIds.length > 0 && (
        <div className="fadeUp" style={{ margin: "14px 20px 0", background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 22px rgba(58,42,32,.10)" }}>
          <Icon name="sprout" size={20} color={C.sageDeep} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>Your grove grew. {grewIds.length} {grewIds.length === 1 ? "tree" : "trees"} stood a little taller.</div>
        </div>
      )}

      {/* grove scene */}
      <div style={{ margin: "16px 20px 0", borderRadius: 22, overflow: "hidden", boxShadow: "0 18px 38px rgba(58,42,32,.18), 0 2px 6px rgba(58,42,32,.08)", border: `1px solid ${C.line}` }}>
        <div style={{ position: "relative", minHeight: has ? 300 : 264, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <GroveBackdrop />
          {has ? (
            <div style={{ position: "relative", zIndex: 1 }}>
            <div ref={treeRowRef} onScroll={updateScrollState} className="noscroll" style={{ display: "flex", flexWrap: "nowrap", alignItems: "flex-end", justifyContent: scrolls ? "flex-start" : "center", gap: 0, padding: "0 10px 12px", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                {ordered.map((c) => (
                  <button key={c.id} onClick={() => setSelected(c.id)} className={grewIds.includes(c.id) ? "grew" : ""} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "0 2px", transformOrigin: "50% 100%", display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto", width: 84 }} title={c.name}>
                    <Tree days={c.days} mastery={c.mastery} width={68} />
                    <span className="treeLabel" title={c.name}>{c.name}</span>
                  </button>
                ))}
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
              <div style={{ width: 22, display: "flex", justifyContent: "flex-start", visibility: canScrollLeft ? "visible" : "hidden" }}>
                <Icon name="chevronLeft" size={16} color={C.primaryDeep} strokeWidth={3} />
              </div>
              <div style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: C.sub }}>Taller = more sessions &middot; Greener = you know it better</div>
              <div style={{ width: 22, display: "flex", justifyContent: "flex-end", visibility: canScrollRight ? "visible" : "hidden" }}>
                <Icon name="chevronRight" size={16} color={C.primaryDeep} strokeWidth={3} />
              </div>
            </div>
          ) : (
            <>
              <div className="disp" style={{ fontSize: 18, fontWeight: 600, color: C.ink }}>A quiet, empty grove</div>
              <div style={{ fontSize: 13, color: C.sub, fontWeight: 700, marginTop: 4, lineHeight: 1.5, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>Add a photo of what you're studying. Grove asks you questions instead of handing over answers, which is what makes it stick.</div>
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

      <div style={{ padding: "18px 20px 40px" }}>
        {error && <div style={{ marginBottom: 14, background: "#F5E0D2", color: "#9A4A28", padding: "12px 14px", borderRadius: 14, fontSize: 14, fontWeight: 600 }}>{error}</div>}

        {has && (
          <button onClick={studyEverything} style={{ width: "100%", border: "none", cursor: "pointer", padding: 16, borderRadius: 16, background: `linear-gradient(135deg, ${C.amber}, ${C.amberDeep})`, color: "#3A2412", fontWeight: 800, fontSize: 16, marginBottom: 10, boxShadow: "0 12px 26px rgba(199,125,52,.36), 0 2px 5px rgba(150,90,30,.18)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Icon name="drop" size={18} color="#3A2412" /> Tend the whole grove</span>
          </button>
        )}

        {!preview && (
          <>
            {/* Two equal ways in. Typing suits "I want to understand X"; a photo
                suits "here is my worksheet". Neither is the fallback. */}
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 14, boxShadow: "0 10px 26px rgba(58,42,32,.10)" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 9 }}>{has ? "Study something else" : "What do you want to study?"}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={topicText}
                  onChange={(e) => setTopicText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleTopic(); }}
                  placeholder="Photosynthesis, the Krebs cycle, causes of WWI…"
                  style={{ flex: 1, minWidth: 0, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "13px 15px", fontSize: 15, outline: "none", fontFamily: "inherit", background: C.bg }}
                />
                <button onClick={() => handleTopic()} disabled={!topicText.trim()} aria-label="Break this topic down" style={{ border: "none", cursor: topicText.trim() ? "pointer" : "default", width: 50, flexShrink: 0, borderRadius: 14, background: topicText.trim() ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : C.line, color: "#FCEFE4", display: "grid", placeItems: "center" }}><Icon name="arrowUp" size={19} color="#FCEFE4" /></button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "13px 2px 12px" }}>
                <div style={{ flex: 1, height: 1, background: C.line }} />
                <div style={{ fontSize: 11, fontWeight: 800, color: C.stone, letterSpacing: ".06em" }}>OR</div>
                <div style={{ flex: 1, height: 1, background: C.line }} />
              </div>

              <button onClick={() => fileRef.current && fileRef.current.click()} style={{ width: "100%", border: `1.5px solid ${C.line}`, cursor: "pointer", textAlign: "left", padding: "13px 14px", borderRadius: 14, background: C.bg, color: C.ink, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 10, background: C.soft, flexShrink: 0 }}><Icon name="camera" size={18} color={C.primaryDeep} /></span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14.5, fontWeight: 800 }}>Photograph your work</span>
                  <span style={{ display: "block", fontSize: 12.5, color: C.sub, fontWeight: 700, marginTop: 1 }}>Notes, a worksheet, or a textbook page</span>
                </span>
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

            {!activeGroveId && groves.length > 0 && (
              <button onClick={() => setSwitcherOpen(true)} style={{ marginTop: 10, width: "100%", background: "transparent", border: "none", cursor: "pointer", color: C.primary, fontWeight: 700, fontSize: 13, padding: "4px 0" }}>
                Or open one of your {groves.length} groves &rarr;
              </button>
            )}

            {!has && !hideSample && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={startPreview} style={{ flex: 1, background: "transparent", border: `1.5px dashed ${C.line}`, cursor: "pointer", padding: 12, borderRadius: 14, color: C.primary, fontWeight: 700, fontSize: 13.5 }}>
                  See what a grown grove looks like
                </button>
                <button onClick={() => setHideSample(true)} aria-label="Hide this" style={{ border: "none", background: "transparent", color: C.stone, cursor: "pointer", fontSize: 18, padding: "8px 10px", flexShrink: 0 }}>&times;</button>
              </div>
            )}
          </>
        )}

        <p style={{ textAlign: "center", color: "#B7A489", fontSize: 12, marginTop: 22 }}>
          {preview ? "Sample grove · nothing is being saved" : child ? (saveState === "error" ? "Couldn't save your grove. Check the connection." : activeGroveId ? `Saving${saveState === "saving" ? "…" : ""}` : "") : "Demo · your grove lasts for this session"}
          {has && !preview && <>{" · "}<button onClick={clearGrove} style={{ border: "none", background: "transparent", padding: 0, color: C.primary, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Clear grove</button></>}
        </p>
      </div>

      {selected && (() => {
        const c = concepts.find((x) => x.id === selected);
        if (!c) return null;
        return (
          <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(45,28,16,.42)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 20 }}>
            <div onClick={(e) => e.stopPropagation()} className="fadeUp" style={{ width: "100%", maxWidth: 460, background: C.card, borderRadius: "24px 24px 0 0", padding: "10px 22px 26px", boxShadow: "0 -10px 40px rgba(40,24,12,.25)" }}>
              <div style={{ width: 40, height: 4, background: C.line, borderRadius: 999, margin: "0 auto 14px" }} />
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ background: C.bg, borderRadius: 16, padding: 4 }}><Tree days={c.days} mastery={c.mastery} width={64} /></div>
                <div style={{ flex: 1 }}>
                  <div className="disp" style={{ fontSize: 21, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ color: C.sub, fontSize: 13.5, fontWeight: 700 }}>{growthLabel(c.days, c.mastery)}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <div style={{ flex: 1, background: C.bg, borderRadius: 14, padding: "12px 14px" }}>
                  <div className="disp" style={{ fontSize: 17, fontWeight: 700, color: canopyColor(c.mastery).dark, textTransform: "capitalize" }}>{statusOf(c.mastery)}</div>
                  <div style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>how well you know it</div>
                </div>
                <div style={{ flex: 1, background: C.bg, borderRadius: 14, padding: "12px 14px" }}>
                  <div className="disp" style={{ fontSize: 17, fontWeight: 700 }}>{Math.min(5, c.days)} of 5</div>
                  <div style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>sessions to full size</div>
                </div>
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 5 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i < Math.min(5, c.days) ? C.sageDeep : C.line }} />
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: C.sub, fontWeight: 700, textAlign: "center" }}>{nextStage(c)}</div>
              <button onClick={() => { setSelected(null); startSession([c.id], concepts); }} style={{ marginTop: 10, width: "100%", border: "none", cursor: "pointer", padding: 15, borderRadius: 15, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", fontWeight: 800, fontSize: 15 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Icon name="drop" size={17} color="#FCEFE4" /> Tend this tree</span>
              </button>
              <button onClick={() => removeTree(c.id)} style={{ marginTop: 8, width: "100%", border: "none", background: "transparent", cursor: "pointer", color: C.sub, fontWeight: 700, fontSize: 13 }}>Remove this tree</button>
            </div>
          </div>
        );
      })()}

      {switcherOpen && <GroveSwitcher g={g} onClose={() => setSwitcherOpen(false)} />}
    </Shell>
  );
}
