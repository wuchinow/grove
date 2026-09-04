"use client";

import { useState, useRef, useEffect } from "react";
import { callAPI, parseJSON, fileToImage, tutorSystem, EXTRACT_SYSTEM, EXTRACT_PROMPT, TOPIC_SYSTEM, TOPIC_PROMPT, SAMPLE, uid } from "./ai";

// ---- useGrove --------------------------------------------------------------
// All of Grove's state and behaviour in one place: what is planted, how well it
// is known, and the tutoring session in progress. The screens are presentational
// and receive this object as `g`.
export function useGrove() {
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
  const [topicText, setTopicText] = useState("");
  const [preview, setPreview] = useState(false);   // showing the sample grove, nothing saved
  const stash = useRef(null);                      // the real grove, parked during a preview

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
    if (!child || !loaded || preview) return;   // a preview must never overwrite a real grove
    setSaveState("saving");
    const t = setTimeout(() => {
      fetch("/api/grove", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ child, concepts, profile: profile || {} }) })
        .then((r) => setSaveState(r.ok ? "saved" : "error"))
        .catch(() => setSaveState("error"));
    }, 800);
    return () => clearTimeout(t);
  }, [concepts, profile, child, loaded, preview]);

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
    stash.current = concepts;
    setConcepts(SAMPLE.concepts.map((c) => ({ id: uid(), name: c.name, note: c.note, mastery: c.mastery, days: c.days, reviews: c.days })));
    setPreview(true); setSelected(null); setGrewIds([]); setScreen("home");
  }
  function exitPreview() {
    setConcepts(stash.current || []);
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

  return { active, activeId, addText, exitPreview, handleTopic, preview, setPreview, setTopicText, startPreview, topicText, apiMsgs, busy, chat, child, clearGrove, concepts, confirmConcepts, editingProfile, error, failed, fileRef, grewIds, handleFile, input, leaveSession, loadSample, loaded, nextConcept, nextStage, pending, phase, profile, queue, removeTree, saveState, screen, scrollRef, selected, send, sessionPos, sessionTotal, setActiveId, setAddText, setApiMsgs, setBusy, setChat, setChild, setConcepts, setEditingProfile, setError, setFailed, setGrewIds, setInput, setLoaded, setPending, setPhase, setProfile, setQueue, setSaveState, setScreen, setSelected, setSetupGrade, setShowHelp, setSubject, setupGrade, showHelp, startConcept, startSession, studyEverything, subject, updateMastery };
}
