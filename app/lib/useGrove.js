"use client";

import { useState, useRef, useEffect } from "react";
import { callAPI, parseJSON, fileToImage, tutorSystem, EXTRACT_SYSTEM, EXTRACT_PROMPT, TOPIC_SYSTEM, TOPIC_PROMPT, SAMPLE, uid } from "./ai";

// ---- useGrove --------------------------------------------------------------
// A student can have several groves, one per subject. This hook owns: the
// student's profile (grade), the light list of their groves for the switcher,
// whichever grove is currently open (its concepts and the tutoring session in
// progress), and a non-saving preview of the sample grove. Screens receive the
// whole thing as `g` and are otherwise presentational.
//
// Two persistence modes share one shape. A named student (?student=name in
// the URL) has groves saved to Supabase via /api/student and /api/grove. An
// anonymous visitor (no name) gets the identical multi-grove experience held
// entirely in memory in `localGroves` below: nothing is ever sent to the
// server, and it's gone on refresh, matching the existing "lasts for this
// session" framing. Every function below branches on `child` internally, so
// the screens never need to know which mode they're in.
export function useGrove() {
  const [screen, setScreen] = useState("home");
  const [concepts, setConcepts] = useState([]);
  const [subject, setSubject] = useState("");
  const [pending, setPending] = useState([]);
  const [addText, setAddText] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [grewIds, setGrewIds] = useState([]);
  const [failed, setFailed] = useState(false);
  const [child, setChild] = useState(null);      // student id from the URL; null = session-only demo
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("");  // "", "saving", "saved", "error"
  const [profile, setProfile] = useState(null);   // { grade } once set up
  const [setupGrade, setSetupGrade] = useState("");
  const [setupInterests, setSetupInterests] = useState(["", "", ""]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [topicText, setTopicText] = useState("");
  const [preview, setPreview] = useState(false);   // showing the sample grove, nothing saved
  const stash = useRef(null);                      // { concepts, activeGroveId, activeGroveName }, parked during a preview

  // Multiple groves per person. `groves` is the light list (id, name, tree
  // count) for the switcher; opening one loads its full concepts. For an
  // anonymous session, `localGroves` holds each grove's concepts in memory.
  const [groves, setGroves] = useState([]);
  const [grovesLoaded, setGrovesLoaded] = useState(false);
  const [activeGroveId, setActiveGroveId] = useState(null);
  const [activeGroveName, setActiveGroveName] = useState("");
  const [newGroveName, setNewGroveName] = useState("");
  const [showNewGrove, setShowNewGrove] = useState(false);
  const localGroves = useRef({});

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

  // Load this student once, if the URL names one (?student= or legacy ?child=).
  // An anonymous visitor (no name) still gets grovesLoaded=true immediately,
  // starting from an empty local list, so the switcher and empty-state logic
  // behave identically in both modes.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const name = q.get("student") || q.get("child");
    const id = name ? name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) : "";
    if (!id) { setLoaded(true); setGrovesLoaded(true); return; }
    setChild(id);
    fetch(`/api/student?student=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j) {
          setProfile(j.profile && j.profile.grade ? j.profile : null);
          setGroves(Array.isArray(j.groves) ? j.groves : []);
        }
      })
      .catch(() => {})
      .finally(() => { setLoaded(true); setGrovesLoaded(true); });
  }, []);

  // Save the grade whenever it changes, once a named student is loaded.
  useEffect(() => {
    if (!child || !loaded || !profile) return;
    fetch("/api/student", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student: child, profile }) }).catch(() => {});
  }, [profile, child, loaded]);

  // Save the open grove's concepts whenever they change (debounced), for a
  // named student only.
  useEffect(() => {
    if (!child || !loaded || preview || !activeGroveId) return;
    setSaveState("saving");
    const t = setTimeout(() => {
      fetch("/api/grove", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student: child, id: activeGroveId, name: activeGroveName, concepts }) })
        .then((r) => setSaveState(r.ok ? "saved" : "error"))
        .catch(() => setSaveState("error"));
    }, 800);
    return () => clearTimeout(t);
  }, [concepts, child, loaded, preview, activeGroveId, activeGroveName]);

  // The anonymous equivalent: keep the in-memory copy of the open grove in
  // sync as it's edited, so switching away and back doesn't lose the work.
  useEffect(() => {
    if (child || !activeGroveId || preview) return;
    localGroves.current[activeGroveId] = concepts;
  }, [concepts, child, activeGroveId, preview]);

  // Opening a grove. For a named student this fetches; for an anonymous
  // session it's an instant local lookup, so it skips the loading screen
  // entirely rather than faking a delay that doesn't exist.
  async function openGrove(id) {
    const entry = groves.find((g) => g.id === id);
    if (!child) {
      setActiveGroveId(id);
      setActiveGroveName(entry ? entry.name : "");
      setConcepts(localGroves.current[id] || []);
      setGrewIds([]); setSelected(null); setScreen("home");
      return;
    }
    setActiveGroveId(id);
    setActiveGroveName(entry ? entry.name : "");
    setConcepts([]); setGrewIds([]); setSelected(null);
    setScreen("processing");
    try {
      const r = await fetch(`/api/grove?id=${encodeURIComponent(id)}`);
      const j = r.ok ? await r.json() : null;
      if (j) { setConcepts(Array.isArray(j.concepts) ? j.concepts : []); setActiveGroveName(j.name || (entry ? entry.name : "")); }
    } catch {}
    setScreen("home");
  }

  // Creates a grove (empty, or seeded with concepts already extracted) and
  // makes it the open one. Returns the new id, or null on failure. For an
  // anonymous session this always succeeds and never touches the network.
  async function createGrove(rawName, seedConcepts) {
    const name = (rawName ?? newGroveName).trim() || "My grove";
    const seed = seedConcepts || [];
    if (!child) {
      const id = uid();
      localGroves.current[id] = seed;
      setGroves((prev) => [{ id, name, treeCount: seed.length, flourishing: seed.filter((c) => c.mastery >= 85).length }, ...prev]);
      setNewGroveName(""); setShowNewGrove(false);
      setActiveGroveId(id); setActiveGroveName(name);
      setConcepts(seed); setGrewIds([]); setSelected(null);   // never leave the previous grove's trees sitting in state
      return id;
    }
    try {
      const r = await fetch("/api/grove", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student: child, name, concepts: seed }) });
      const j = r.ok ? await r.json() : null;
      if (!j || !j.id) return null;
      setGroves((prev) => [{ id: j.id, name, treeCount: seed.length, flourishing: seed.filter((c) => c.mastery >= 85).length }, ...prev]);
      setNewGroveName(""); setShowNewGrove(false);
      setActiveGroveId(j.id); setActiveGroveName(name);
      setConcepts(seed); setGrewIds([]); setSelected(null);   // never leave the previous grove's trees sitting in state
      return j.id;
    } catch { return null; }
  }

  function renameGrove(id, name) {
    const clean = name.trim();
    if (!clean) return;
    setGroves((prev) => prev.map((g) => (g.id === id ? { ...g, name: clean } : g)));
    if (id === activeGroveId) setActiveGroveName(clean);
    if (!child) return;
    fetch("/api/grove", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student: child, id, name: clean }) }).catch(() => {});
  }

  function deleteGrove(id, name) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    setGroves((prev) => prev.filter((g) => g.id !== id));
    if (id === activeGroveId) { setActiveGroveId(null); setActiveGroveName(""); setConcepts([]); setGrewIds([]); setSelected(null); }
    if (!child) { delete localGroves.current[id]; return; }
    fetch(`/api/grove?id=${encodeURIComponent(id)}&student=${encodeURIComponent(child)}`, { method: "DELETE" }).catch(() => {});
  }

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

  // Adding work by typing, an equal partner to the photo route: better for
  // "I want to understand X" than for "here is my worksheet".
  async function handleTopic(raw) {
    const topic = (raw ?? topicText).trim();
    if (!topic) return;
    setError(""); setTopicText(""); setScreen("processing");
    try {
      const text = await callAPI(
        [{ role: "user", content: TOPIC_PROMPT(topic, profile && profile.grade) }],
        TOPIC_SYSTEM
      );
      const parsed = parseJSON(text);
      if (!parsed || !parsed.concepts || !parsed.concepts.length) throw new Error("empty");
      setSubject(parsed.subject || topic);
      setPending(parsed.concepts.slice(0, 8));
      setScreen("confirm");
    } catch {
      setError("I couldn't break that topic down. Try naming it a little differently.");
      setScreen("home");
    }
  }

  function startPreview() {
    stash.current = { concepts, activeGroveId, activeGroveName };
    setConcepts(SAMPLE.concepts.map((c) => ({ id: uid(), name: c.name, note: c.note, mastery: c.mastery, days: c.days, reviews: c.days })));
    setActiveGroveId(null); setActiveGroveName("Sample grove");
    setPreview(true); setSelected(null); setGrewIds([]); setScreen("home");
  }
  function exitPreview() {
    const prev = stash.current || { concepts: [], activeGroveId: null, activeGroveName: "" };
    setConcepts(prev.concepts); setActiveGroveId(prev.activeGroveId); setActiveGroveName(prev.activeGroveName);
    stash.current = null;
    setPreview(false); setSelected(null); setGrewIds([]); setScreen("home");
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

  // Confirming a fresh batch of concepts. If no grove is open, this is the
  // first add for this grove slot: it becomes a new grove, auto-named from
  // the subject, with no separate naming step in the way. Works identically
  // whether or not the student is signed in by name.
  async function confirmConcepts() {
    const fresh = pending.map((p) => ({ id: uid(), name: p.name, note: p.note || "", mastery: 0, days: 0, reviews: 0 }));
    if (!activeGroveId) {
      const id = await createGrove(subject, fresh);
      if (!id) { setError("Couldn't create a grove for this. Try again."); setScreen("home"); return; }
      setConcepts(fresh);
      startSession(fresh.map((c) => c.id), fresh);
      return;
    }
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
      setChat([{ who: "tutor", text: "I couldn't reach the tutor just now. Tap Try again.", phase: "question" }]);
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
      // "unknown" (a hint, or an honest "I don't know") leaves it unchanged
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

  return { active, activeGroveId, activeGroveName, activeId, addText, busy, chat, clearGrove, concepts, confirmConcepts, createGrove, deleteGrove, editingProfile, error, exitPreview, failed, fileRef, grewIds, groves, grovesLoaded, handleFile, handleTopic, input, leaveSession, loaded, newGroveName, nextConcept, nextStage, openGrove, pending, phase, preview, profile, queue, removeTree, renameGrove, saveState, screen, scrollRef, selected, send, sessionPos, sessionTotal, setActiveId, setAddText, setApiMsgs, setBusy, setChat, setChild, setConcepts, setEditingProfile, setError, setFailed, setGrewIds, setInput, setLoaded, setNewGroveName, setPending, setPhase, setProfile, setQueue, setSaveState, setScreen, setSelected, setSetupGrade, setSetupInterests, setShowNewGrove, setSubject, setTopicText, setupGrade, setupInterests, showNewGrove, startConcept, startPreview, startSession, studyEverything, subject, topicText, updateMastery, child };
}
