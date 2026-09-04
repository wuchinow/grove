"use client";

import React, { useState, useRef, useEffect } from "react";
import { C } from "./lib/theme";
import { callAPI, parseJSON, fileToImage, tutorSystem, EXTRACT_SYSTEM, EXTRACT_PROMPT, SAMPLE, uid, statusOf, growthLabel, canopyColor } from "./lib/ai";
import Tree from "./components/Tree";
import GroveBackdrop from "./components/GroveBackdrop";
import { Shell, Logo } from "./components/Shell";
import Icon from "./components/Icon";

// ---- App -------------------------------------------------------------------
export default function App() {
  const [screen, setScreen] = useState("home");
  const [concepts, setConcepts] = useState([]);
  const [subject, setSubject] = useState("");
  const [pending, setPending] = useState([]);
  const [addText, setAddText] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [grewIds, setGrewIds] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [failed, setFailed] = useState(false);
  const [child, setChild] = useState(null);      // grove id from the URL; null = session-only demo
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("");  // "", "saving", "saved", "error"
  const [profile, setProfile] = useState(null);   // { grade, subject } once set up
  const [setupGrade, setSetupGrade] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);

  const [queue, setQueue] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [chat, setChat] = useState([]);
  const [apiMsgs, setApiMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("question");
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const sessionTotal = useRef(0);
  const sessionPos = useRef(0);

  const active = concepts.find((c) => c.id === activeId);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, busy]);

  // Load this child's grove once, if the URL names a child.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const name = q.get("student") || q.get("child");
    const id = name ? name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) : "";
    if (!id) { setLoaded(true); return; }
    setChild(id);
    fetch(`/api/grove?child=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j) { if (Array.isArray(j.concepts)) setConcepts(j.concepts); setProfile(j.profile && j.profile.grade ? j.profile : null); } })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Save whenever the grove changes (debounced), but only after the initial load.
  useEffect(() => {
    if (!child || !loaded) return;
    setSaveState("saving");
    const t = setTimeout(() => {
      fetch("/api/grove", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ child, concepts, profile: profile || {} }) })
        .then((r) => setSaveState(r.ok ? "saved" : "error"))
        .catch(() => setSaveState("error"));
    }, 800);
    return () => clearTimeout(t);
  }, [concepts, profile, child, loaded]);

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError(""); setScreen("processing");
    try {
      const { data } = await fileToImage(file);
      const text = await callAPI(
        [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data } }, { type: "text", text: EXTRACT_PROMPT }] }],
        EXTRACT_SYSTEM
      );
      const parsed = parseJSON(text);
      if (!parsed || !parsed.concepts || !parsed.concepts.length) throw new Error("empty");
      setSubject(parsed.subject || "Your work");
      setPending(parsed.concepts.slice(0, 8));
      setScreen("confirm");
    } catch {
      setError("I couldn't read that one clearly. Try a brighter, closer photo.");
      setScreen("home");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function nextStage(c) {
    const stages = ["Just planted", "Sprouting", "Sapling", "Young tree", "Full grown", "Towering"];
    const i = Math.min(5, c.days);
    if (i >= 5) return "Fully grown. Come back to it whenever you want to keep it green.";
    return `Finish one more session to become a ${stages[i + 1]}.`;
  }
  function clearGrove() {
    if (!window.confirm("Clear every tree in this grove? This can't be undone.")) return;
    setConcepts([]); setGrewIds([]); setSelected(null);
  }
  function removeTree(id) {
    const c = concepts.find((x) => x.id === id);
    if (!c || !window.confirm(`Remove "${c.name}" from your grove?`)) return;
    setConcepts((prev) => prev.filter((x) => x.id !== id)); setSelected(null);
  }
  function loadSample() {
    setConcepts(SAMPLE.concepts.map((c) => ({ id: uid(), name: c.name, note: c.note, mastery: c.mastery, days: c.days, reviews: c.days })));
    setScreen("home");
  }
  function confirmConcepts() {
    const fresh = pending.map((p) => ({ id: uid(), name: p.name, note: p.note || "", mastery: 0, days: 0, reviews: 0 }));
    const all = [...concepts, ...fresh];
    setConcepts(all);
    startSession(fresh.map((c) => c.id), all);
  }

  function startSession(ids, all) {
    if (!ids.length) { setScreen("home"); return; }
    setGrewIds([]);
    sessionTotal.current = ids.length; sessionPos.current = 0;
    setQueue(ids); setScreen("tutor");
    startConcept(ids[0], all || concepts);
  }
  function studyEverything() {
    const ids = [...concepts].sort((a, b) => a.mastery - b.mastery).map((c) => c.id);
    startSession(ids, concepts);
  }
  async function startConcept(id, all) {
    const c = (all || concepts).find((x) => x.id === id);
    if (!c) return;
    setActiveId(id); setPhase("question"); setChat([]); setBusy(true); setFailed(false);
    const seed = [{ role: "user", content: `The concept is "${c.name}"${c.note ? ` (${c.note})` : ""}. Ask me one question to begin - pick whatever format fits (true/false, multiple choice, or open-ended). Question first, don't tell me the answer.` }];
    try {
      const text = await callAPI(seed, tutorSystem(profile));
      const j = parseJSON(text) || { message: text, phase: "question", understanding: "unknown" };
      setApiMsgs([...seed, { role: "assistant", content: text }]);
      setChat([{ who: "tutor", text: j.message, phase: j.phase, options: Array.isArray(j.options) ? j.options : [] }]);
      setPhase(j.phase || "question");
    } catch {
      setChat([{ who: "tutor", text: "I couldn't reach the tutor. If the API key hasn't been added to Vercel yet, that's the reason. Otherwise it's probably a connection blip.", phase: "question" }]);
      setApiMsgs(seed); setFailed(true);
    } finally { setBusy(false); }
  }
  function updateMastery(id, understanding) {
    setConcepts((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      let m = c.mastery;
      if (understanding === "solid") m = Math.round(m * 0.3 + 92 * 0.7);        // correct: strong gain
      else if (understanding === "partial") m = Math.round(m * 0.5 + 66 * 0.5); // partly right: some gain
      else if (understanding === "struggling") m = m - 6;                        // a miss: never adds, can only dip
      // "unknown" (e.g. just asked for a hint) leaves the bar unchanged
      return { ...c, mastery: Math.max(0, Math.min(100, m)) };
    }));
  }
  async function send(raw) {
    const val = (raw ?? input).trim();
    if (!val || busy) return;
    setInput("");
    const nextChat = [...chat, { who: "student", text: val }];
    setChat(nextChat);
    const msgs = [...apiMsgs, { role: "user", content: val }];
    setApiMsgs(msgs); setBusy(true);
    try {
      const text = await callAPI(msgs, tutorSystem(profile));
      const j = parseJSON(text) || { message: text, phase, understanding: "unknown" };
      setApiMsgs([...msgs, { role: "assistant", content: text }]);
      setChat([...nextChat, { who: "tutor", text: j.message, phase: j.phase, options: Array.isArray(j.options) ? j.options : [] }]);
      setPhase(j.phase || phase);
      updateMastery(activeId, j.understanding);
      if (j.phase === "done") {
        setConcepts((prev) => prev.map((c) => c.id === activeId ? { ...c, days: c.days + 1, reviews: c.reviews + 1 } : c));
        setGrewIds((g) => (g.includes(activeId) ? g : [...g, activeId]));
      }
    } catch {
      setChat([...nextChat, { who: "tutor", text: "I couldn't reach the tutor just now. Say that once more?", phase }]);
    } finally { setBusy(false); }
  }
  function leaveSession() {
    // Mastery changes are already saved; only a finished session grows the tree.
    if (phase !== "done" && chat.length > 1 && !window.confirm("Leave now and this tree won't grow this time. Your answers so far are saved. Leave anyway?")) return;
    setScreen("home");
  }
  function nextConcept() {
    const remaining = queue.slice(1);
    setQueue(remaining); sessionPos.current += 1;
    if (remaining.length) startConcept(remaining[0]);
    else setScreen("home");
  }

  // ---- SETUP (once per grove: grade drives the tutor's tone and difficulty) --
  if (child && loaded && (!profile || editingProfile)) {
    const grades = ["4-5", "6-8", "9-10", "11-12", "College", "Adult"];
    return (
      <Shell>
        <div style={{ padding: "26px 22px 34px", flex: 1, display: "flex", flexDirection: "column" }}>
          <Logo />
          <div className="fadeUp" style={{ marginTop: 26 }}>
            <div className="disp" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>What grade are you in?</div>
            <div style={{ color: C.sub, fontSize: 14, fontWeight: 700, marginTop: 6, lineHeight: 1.55 }}>This is the only thing Grove needs. It sets how hard the questions are and how it talks to you. Change it whenever you like.</div>
          </div>
          <div style={{ marginTop: 24 }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {grades.map((g) => (
              <button key={g} onClick={() => setSetupGrade(g)} style={{ border: `1.5px solid ${setupGrade === g ? C.primary : C.line}`, background: setupGrade === g ? C.soft : C.card, color: setupGrade === g ? C.primaryDeep : C.ink, borderRadius: 999, padding: "12px 18px", fontWeight: 800, fontSize: 15, cursor: "pointer", minHeight: 44 }}>{g}</button>
            ))}
          </div>

          <div style={{ flex: 1 }} />
          <button onClick={() => { setProfile({ grade: setupGrade }); setEditingProfile(false); }} disabled={!setupGrade} style={{ marginTop: 22, width: "100%", border: "none", cursor: setupGrade ? "pointer" : "default", padding: 16, borderRadius: 16, background: setupGrade ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : C.line, color: "#FCEFE4", fontWeight: 800, fontSize: 16 }}>Start</button>
        </div>
      </Shell>
    );
  }

  // ---- HOME (the grove at golden hour) -------------------------------------
  if (screen === "home") {
    const flourishing = concepts.filter((c) => c.mastery >= 85).length;
    const thirsty = concepts.filter((c) => c.mastery < 40).length;
    const has = concepts.length > 0;
    const ordered = [...concepts].sort((a, b) => b.days - a.days || b.mastery - a.mastery);
    return (
      <Shell>
        <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logo />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setScreen("progress")} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 13px", borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.card, color: C.primaryDeep, fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(58,42,32,.07)" }}><Icon name="chart" size={15} color={C.primaryDeep} /> Progress</button>
              <button onClick={() => setShowHelp(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 13px", borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.card, color: C.primaryDeep, fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(58,42,32,.07)" }}><Icon name="help" size={15} color={C.primaryDeep} /> Help</button>
          </div>
        </div>

        {grewIds.length > 0 && (
          <div className="fadeUp" style={{ margin: "14px 20px 0", background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 22px rgba(58,42,32,.10)" }}>
            <Icon name="sprout" size={20} color={C.sageDeep} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>Your grove grew - {grewIds.length} {grewIds.length === 1 ? "tree" : "trees"} stood a little taller.</div>
          </div>
        )}

        {/* grove scene */}
        <div style={{ margin: "16px 20px 0", borderRadius: 22, overflow: "hidden", boxShadow: "0 18px 38px rgba(58,42,32,.18), 0 2px 6px rgba(58,42,32,.08)", border: `1px solid ${C.line}` }}>
          <div style={{ position: "relative", minHeight: has ? 300 : 264, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <GroveBackdrop />
            {has ? (
              <div className="noscroll" style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "nowrap", alignItems: "flex-end", justifyContent: ordered.length > 6 ? "flex-start" : "center", gap: 0, padding: "0 10px 12px", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                {ordered.map((c) => (
                  <button key={c.id} onClick={() => setSelected(c.id)} className={grewIds.includes(c.id) ? "grew" : ""} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "0 2px", transformOrigin: "50% 100%", display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto", width: 84 }} title={c.name}>
                    <Tree days={c.days} mastery={c.mastery} width={68} />
                    <span className="treeLabel" title={c.name}>{c.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", padding: "0 20px 16px" }}>
                <Tree days={0} mastery={0} width={78} />
              </div>
            )}
          </div>
          <div style={{ background: C.card, borderTop: `1px solid ${C.line}`, padding: "11px 14px", textAlign: "center" }}>
            {has ? (
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.sub }}>Taller = more sessions · Greener = you know it better</div>
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

          <button onClick={() => fileRef.current && fileRef.current.click()} style={{ width: "100%", border: "none", cursor: "pointer", textAlign: "left", padding: 18, borderRadius: 18, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", boxShadow: "0 16px 32px rgba(120,66,37,.36), 0 2px 6px rgba(90,45,22,.2)", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,.16)" }}><Icon name="camera" size={21} color="#FCEFE4" /></span>
            <span>
              <span className="disp" style={{ display: "block", fontSize: 18, fontWeight: 600 }}>{has ? "Add more work" : "Add your homework"}</span>
              <span style={{ display: "block", fontSize: 13, opacity: 0.92 }}>Take a photo or choose one from your library</span>
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

          {!has && !child && (
            <button onClick={loadSample} style={{ marginTop: 12, width: "100%", background: C.card, border: `1.5px dashed ${C.line}`, cursor: "pointer", padding: 13, borderRadius: 16, color: C.primary, fontWeight: 700, fontSize: 14 }}>
              See a grown grove (sample) →
            </button>
          )}
          <p style={{ textAlign: "center", color: "#B7A489", fontSize: 12, marginTop: 22 }}>
            {child ? (saveState === "error" ? "Couldn't save your grove. Check the connection." : `Saving as ${child.charAt(0).toUpperCase() + child.slice(1)}${saveState === "saving" ? "…" : ""}`) : "Demo · your grove lasts for this session"}
            {has && <>{" · "}<button onClick={clearGrove} style={{ border: "none", background: "transparent", padding: 0, color: C.primary, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Clear grove</button></>}
          </p>
        </div>

        {showHelp && (
          <div onClick={() => setShowHelp(false)} style={{ position: "fixed", inset: 0, background: "rgba(45,28,16,.42)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 20 }}>
            <div onClick={(e) => e.stopPropagation()} className="fadeUp" style={{ width: "100%", maxWidth: 430, background: C.card, borderRadius: "24px 24px 0 0", padding: "10px 22px 26px" }}>
              <div style={{ width: 40, height: 4, background: C.line, borderRadius: 999, margin: "0 auto 14px" }} />
              <div className="disp" style={{ fontSize: 21, fontWeight: 600, marginBottom: 10 }}>How Grove works</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.5, color: C.ink, display: "flex", flexDirection: "column", gap: 8 }}>
                <div><b>1. Add your work.</b> Photograph your notes, a worksheet, or a textbook page. Grove pulls out the key ideas and plants a tree for each one.</div>
                <div><b>2. Tend a tree.</b> Tap any tree to start a session: one concept, about 3 to 5 questions. Grove asks rather than tells, gives a hint if you're stuck, then has you explain it back.</div>
                <div><b>3. Finish to grow it.</b> Every completed session makes that tree one stage taller: seedling, sprouting, sapling, young tree, full grown, towering. Five sessions gets it to full size.</div>
                <div><b>Green means you know it.</b> Right answers deepen the colour, wrong ones fade it slightly. A hint or an honest &ldquo;I don't know&rdquo; costs nothing, so there's no reason to guess.</div>
                <div><b>Your photos</b> are read once to find the concepts, then discarded. They aren't stored.</div>
                <div><b>No streaks, no daily quota.</b> Do six sessions today and none tomorrow. The grove just reflects the work you've done.</div>
              </div>
              {child && profile && (
                <button onClick={() => { setSetupGrade(profile.grade || ""); setEditingProfile(true); setShowHelp(false); }} style={{ marginTop: 14, width: "100%", border: `1.5px solid ${C.line}`, background: C.card, cursor: "pointer", padding: 12, borderRadius: 14, color: C.primaryDeep, fontWeight: 700, fontSize: 13.5 }}>Change my level ({profile.grade})</button>
              )}
              <button onClick={() => setShowHelp(false)} style={{ marginTop: 8, width: "100%", border: "none", cursor: "pointer", padding: 14, borderRadius: 15, background: C.soft, color: C.primaryDeep, fontWeight: 800, fontSize: 15 }}>Got it</button>
            </div>
          </div>
        )}

        {selected && (() => {
          const c = concepts.find((x) => x.id === selected);
          if (!c) return null;
          return (
            <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(45,28,16,.42)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 20 }}>
              <div onClick={(e) => e.stopPropagation()} className="fadeUp" style={{ width: "100%", maxWidth: 430, background: C.card, borderRadius: "24px 24px 0 0", padding: "10px 22px 26px" }}>
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
      </Shell>
    );
  }

  // ---- PROGRESS ------------------------------------------------------------
  // Available any time, not once a week. Encouraging but never invented: every
  // line is derived from what the student actually did.
  if (screen === "progress") {
    const total = concepts.length;
    const sessions = concepts.reduce((n, c) => n + (c.days || 0), 0);
    const flourishing = concepts.filter((c) => c.mastery >= 85).length;
    const solid = concepts.filter((c) => c.mastery >= 75).length;
    const needs = [...concepts].filter((c) => c.mastery < 40).sort((a, b) => a.mastery - b.mastery);
    const strong = [...concepts].filter((c) => c.mastery >= 60).sort((a, b) => b.mastery - a.mastery).slice(0, 3);
    const young = /^(4|5|6|7|8)/.test((profile && profile.grade) || "");

    const headline = () => {
      if (!total) return young ? "Nothing planted yet" : "Nothing here yet";
      if (sessions === 0) return young ? "Your trees are waiting" : `${total} ${total === 1 ? "concept" : "concepts"} ready to work on`;
      if (solid >= Math.ceil(total * 0.6)) return young ? "You really know this stuff" : "You're on top of most of this";
      if (sessions >= 5) return young ? "Look how much you've done" : `${sessions} sessions in`;
      return young ? "Good start" : "Off to a start";
    };
    const note = () => {
      if (!total) return "Add a photo of what you're studying and Grove will pull out the key ideas.";
      if (sessions === 0) return `You've planted ${total} ${total === 1 ? "concept" : "concepts"}. Tend one to get going.`;
      const parts = [`You've finished ${sessions} ${sessions === 1 ? "session" : "sessions"} across ${total} ${total === 1 ? "concept" : "concepts"}.`];
      if (flourishing) parts.push(`${flourishing} ${flourishing === 1 ? "is" : "are"} flourishing.`);
      if (needs.length) parts.push(`${needs.length} could use another pass, and that's where a few minutes goes furthest.`);
      else if (solid === total) parts.push("Nothing is lagging behind right now.");
      return parts.join(" ");
    };

    const Stat = ({ n, label, color }) => (
      <div style={{ flex: 1, minWidth: 0, background: C.card, borderRadius: 16, padding: "14px 8px", textAlign: "center", border: `1px solid ${C.line}`, boxShadow: "0 4px 14px rgba(58,42,32,.07)" }}>
        <div className="disp" style={{ fontSize: 24, fontWeight: 700, color: color || C.ink }}>{n}</div>
        <div style={{ fontSize: 11.5, color: C.sub, fontWeight: 700, marginTop: 3, lineHeight: 1.3 }}>{label}</div>
      </div>
    );

    return (
      <Shell>
        <div style={{ padding: "20px 20px 44px", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Logo small />
            <button onClick={() => setScreen("home")} style={{ border: "none", background: C.soft, color: C.primaryDeep, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 800, fontSize: 13 }}>&larr; My grove</button>
          </div>

          <div className="fadeUp" style={{ marginTop: 22, background: `linear-gradient(150deg, ${C.card} 0%, #F4E9D6 100%)`, border: `1px solid ${C.line}`, borderRadius: 20, padding: "20px 20px 22px", boxShadow: "0 14px 30px rgba(58,42,32,.12)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="sprout" size={18} color={C.sageDeep} />
              <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: C.sageDeep }}>Where you are</div>
            </div>
            <div className="disp" style={{ fontSize: 25, fontWeight: 600, marginTop: 8, lineHeight: 1.22 }}>{headline()}</div>
            <div style={{ fontSize: 14.5, color: C.ink, opacity: 0.82, marginTop: 8, lineHeight: 1.55 }}>{note()}</div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Stat n={total} label="Concepts" />
            <Stat n={sessions} label="Sessions" />
            <Stat n={flourishing} label="Flourishing" color={C.sageDeep} />
            <Stat n={needs.length} label="Need work" color={C.coral} />
          </div>

          {strong.length > 0 && (
            <>
              <div style={{ marginTop: 26, fontSize: 14, fontWeight: 800 }}>Going well</div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {strong.map((c) => (
                  <div key={c.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 3px 12px rgba(58,42,32,.05)" }}>
                    <Tree days={c.days} mastery={c.mastery} width={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14.5 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginTop: 1 }}>{growthLabel(c.days, c.mastery)} &middot; {statusOf(c.mastery)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {needs.length > 0 && (
            <>
              <div style={{ marginTop: 24, fontSize: 14, fontWeight: 800 }}>Worth another look</div>
              <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 700, marginTop: 3, lineHeight: 1.5 }}>Tap one to start there.</div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {needs.slice(0, 4).map((c) => (
                  <button key={c.id} onClick={() => { setScreen("home"); startSession([c.id], concepts); }} style={{ textAlign: "left", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", boxShadow: "0 3px 12px rgba(58,42,32,.05)" }}>
                    <Tree days={c.days} mastery={c.mastery} width={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14.5, color: C.ink }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginTop: 1 }}>{statusOf(c.mastery)}</div>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: C.primaryDeep, flexShrink: 0 }}>Tend</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div style={{ flex: 1, minHeight: 18 }} />
          {total > 0 && (
            <button onClick={() => { setScreen("home"); studyEverything(); }} style={{ marginTop: 18, width: "100%", border: "none", cursor: "pointer", padding: 16, borderRadius: 16, background: `linear-gradient(135deg, ${C.amber}, ${C.amberDeep})`, color: "#3A2412", fontWeight: 800, fontSize: 16, boxShadow: "0 12px 26px rgba(199,125,52,.36)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Icon name="drop" size={18} color="#3A2412" /> Tend the whole grove</span>
            </button>
          )}
        </div>
      </Shell>
    );
  }

  // ---- PROCESSING ----------------------------------------------------------
  if (screen === "processing") {
    return (
      <Shell>
        <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 30 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ animation: "sway 2.4s ease-in-out infinite", transformOrigin: "50% 100%" }}><Tree days={3} mastery={60} width={96} /></div>
            <div className="disp" style={{ fontSize: 20, fontWeight: 600, marginTop: 12 }}>Reading your work…</div>
            <div style={{ color: C.sub, marginTop: 6, fontSize: 14, fontWeight: 700 }}>Finding concepts to plant</div>
          </div>
        </div>
      </Shell>
    );
  }

  // ---- CONFIRM -------------------------------------------------------------
  if (screen === "confirm") {
    return (
      <Shell>
        <div style={{ padding: "20px 20px 30px", flex: 1, display: "flex", flexDirection: "column" }}>
          <Logo small />
          <div className="fadeUp" style={{ marginTop: 20 }}>
            <div className="disp" style={{ fontSize: 25, fontWeight: 600 }}>Ready to plant {pending.length} {pending.length === 1 ? "tree" : "trees"}</div>
            <div style={{ display: "inline-block", marginTop: 8, background: C.soft, color: C.primaryDeep, padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>{subject}</div>
          </div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto" }}>
            {pending.map((c, i) => (
              <div key={i} className="fadeUp" style={{ background: C.card, borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 3px 10px rgba(58,42,32,.05)" }}>
                <Tree days={0} mastery={0} width={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{c.name}</div>
                  {c.note && <div style={{ color: C.sub, fontSize: 12.5, marginTop: 1 }}>{c.note}</div>}
                </div>
                <button onClick={() => setPending(pending.filter((_, j) => j !== i))} style={{ border: "none", background: C.soft, color: C.primaryDeep, width: 28, height: 28, borderRadius: 999, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={addText} onChange={(e) => setAddText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && addText.trim()) { setPending([...pending, { name: addText.trim(), note: "" }]); setAddText(""); } }} placeholder="Add a concept…" style={{ flex: 1, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "11px 14px", fontSize: 14, outline: "none", background: C.card, fontFamily: "inherit" }} />
              <button onClick={() => { if (addText.trim()) { setPending([...pending, { name: addText.trim(), note: "" }]); setAddText(""); } }} style={{ border: "none", background: C.soft, color: C.primaryDeep, padding: "0 16px", borderRadius: 14, fontWeight: 800, cursor: "pointer" }}>Add</button>
            </div>
          </div>
          <button onClick={confirmConcepts} disabled={!pending.length} style={{ marginTop: 14, width: "100%", border: "none", cursor: pending.length ? "pointer" : "default", padding: 16, borderRadius: 16, background: pending.length ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : C.line, color: "#FCEFE4", fontWeight: 800, fontSize: 16 }}>
            Plant and start growing
          </button>
          <button onClick={() => setScreen("home")} style={{ marginTop: 8, width: "100%", border: "none", background: "transparent", cursor: "pointer", color: C.sub, fontWeight: 700, fontSize: 14 }}>Back to grove</button>
        </div>
      </Shell>
    );
  }

  // ---- TUTOR ---------------------------------------------------------------
  if (screen === "tutor") {
    const done = phase === "done";
    const lastTutor = [...chat].reverse().find((m) => m.who === "tutor");
    const opts = !done && !busy && lastTutor && Array.isArray(lastTutor.options) ? lastTutor.options : [];
    const twoUp = opts.length === 2;
    return (
      <Shell>
        <div className="fullvh" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 18px 12px", background: C.card, borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={leaveSession} style={{ border: "none", background: C.soft, color: C.primaryDeep, borderRadius: 10, padding: "7px 12px", cursor: "pointer", fontWeight: 800, fontSize: 13 }}>← Back to my grove</button>
              <div style={{ color: C.sub, fontSize: 13, fontWeight: 700, textAlign: "right" }}>
                <div>Tree {sessionPos.current + 1} of {sessionTotal.current}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.stone }}>about 3 to 5 questions</div>
              </div>
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: C.bg, borderRadius: 12, padding: 2 }}><Tree days={active ? active.days : 0} mastery={active ? active.mastery : 0} width={44} /></div>
              <div style={{ flex: 1 }}>
                <div className="disp" style={{ fontSize: 18, fontWeight: 600 }}>{active ? active.name : ""}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginTop: 2 }}>
                  {active ? `${growthLabel(active.days, active.mastery)} · ${statusOf(active.mastery)}` : ""}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 4 }}>
              {[["question", "Question"], ["hint", "Hint"], ["explain", "Explain"], ["check", "Say it back"], ["done", "Done"]].map(([k, label], i) => {
                const order = ["question", "hint", "explain", "check", "done"];
                const cur = order.indexOf(phase), me = order.indexOf(k);
                const on = me <= cur;
                return (
                  <div key={k} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ height: 4, borderRadius: 999, background: on ? C.primary : C.line }} />
                    <div style={{ marginTop: 3, fontSize: 9.5, fontWeight: 800, letterSpacing: ".02em", color: me === cur ? C.primaryDeep : C.sub }}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {chat.map((m, i) =>
              m.who === "tutor" ? (
                <div key={i} className="fadeUp" style={{ alignSelf: "flex-start", maxWidth: "86%", display: "flex", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="tree" size={15} color="#FCEFE4" /></div>
                  <div style={{ background: C.card, padding: "12px 14px", borderRadius: "4px 16px 16px 16px", boxShadow: "0 3px 10px rgba(58,42,32,.06)", fontSize: 15, lineHeight: 1.45 }}>
                    {m.phase && m.phase !== "question" && m.phase !== "done" && (
                      <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: C.primary, marginBottom: 4 }}>{m.phase === "check" ? "your turn" : m.phase}</span>
                    )}
                    <div>{m.text}</div>
                  </div>
                </div>
              ) : (
                <div key={i} className="fadeUp" style={{ alignSelf: "flex-end", maxWidth: "86%", background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", padding: "12px 14px", borderRadius: "16px 4px 16px 16px", fontSize: 15, lineHeight: 1.45 }}>{m.text}</div>
              )
            )}
            {busy && (
              <div style={{ alignSelf: "flex-start", display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, display: "grid", placeItems: "center" }}><Icon name="tree" size={15} color="#FCEFE4" /></div>
                <div style={{ background: C.card, padding: "13px 16px", borderRadius: 16, boxShadow: "0 3px 10px rgba(58,42,32,.06)", color: C.sub, fontSize: 20, letterSpacing: 2 }}>···</div>
              </div>
            )}
          </div>

          <div style={{ padding: "12px 14px", paddingBottom: "max(16px, env(safe-area-inset-bottom))", background: C.card, borderTop: `1px solid ${C.line}` }}>
            {failed ? (
              <button onClick={() => startConcept(activeId)} style={{ width: "100%", border: "none", cursor: "pointer", padding: 16, borderRadius: 16, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", fontWeight: 800, fontSize: 16 }}>
                Try again
              </button>
            ) : done ? (
              <button onClick={nextConcept} className="pop" style={{ width: "100%", border: "none", cursor: "pointer", padding: 16, borderRadius: 16, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", fontWeight: 800, fontSize: 16, boxShadow: "0 8px 20px rgba(120,66,37,.36)" }}>
                {queue.length > 1 ? "Next tree" : "Back to my grove"}
              </button>
            ) : opts.length ? (
              <>
                <div style={{ display: twoUp ? "flex" : "block", gap: 8 }}>
                  {opts.map((o, i) => (
                    <button key={i} onClick={() => send(o)} disabled={busy} style={{ display: "block", width: "100%", marginBottom: twoUp ? 0 : 8, flex: twoUp ? 1 : undefined, border: `1.5px solid ${C.line}`, background: C.bg, borderRadius: 14, padding: "13px 15px", fontWeight: 700, fontSize: 15, color: C.ink, textAlign: twoUp ? "center" : "left", cursor: busy ? "default" : "pointer" }}>{o}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 18, marginTop: 10, justifyContent: "center" }}>
                  <button onClick={() => send("Can I get a hint?")} disabled={busy} style={{ border: "none", background: "transparent", padding: 4, fontWeight: 700, fontSize: 13, color: C.primaryDeep, cursor: busy ? "default" : "pointer", textDecoration: "underline" }}>Hint</button>
                  <button onClick={() => send("I don't know")} disabled={busy} style={{ border: "none", background: "transparent", padding: 4, fontWeight: 700, fontSize: 13, color: C.sub, cursor: busy ? "default" : "pointer", textDecoration: "underline" }}>I don't know</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Type your answer…" disabled={busy} style={{ flex: 1, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "13px 15px", fontSize: 15, outline: "none", fontFamily: "inherit", background: C.bg }} />
                  <button onClick={() => send()} disabled={busy || !input.trim()} style={{ border: "none", cursor: busy || !input.trim() ? "default" : "pointer", width: 50, borderRadius: 14, background: input.trim() && !busy ? C.primary : C.line, color: "#FCEFE4", fontSize: 20, fontWeight: 800, display: "grid", placeItems: "center" }} aria-label="Send"><Icon name="arrowUp" size={19} color="#FCEFE4" /></button>
                </div>
                <div style={{ display: "flex", gap: 18, marginTop: 10, justifyContent: "center" }}>
                  <button onClick={() => send("Can I get a hint?")} disabled={busy} style={{ border: "none", background: "transparent", padding: 4, fontWeight: 700, fontSize: 13, color: C.primaryDeep, cursor: busy ? "default" : "pointer", textDecoration: "underline" }}>Hint</button>
                  <button onClick={() => send("I don't know")} disabled={busy} style={{ border: "none", background: "transparent", padding: 4, fontWeight: 700, fontSize: 13, color: C.sub, cursor: busy ? "default" : "pointer", textDecoration: "underline" }}>I don't know</button>
                </div>
              </>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  return null;
}
