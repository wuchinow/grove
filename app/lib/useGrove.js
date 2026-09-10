"use client";

import { useState, useRef, useEffect } from "react";
import { callAPI, parseJSON, fileToImage, tutorSystem, tutorSeed, EXTRACT_SYSTEM, EXTRACT_PROMPT, TOPIC_SYSTEM, TOPIC_PROMPT, SAMPLE, uid } from "./ai";

// ---- useGrove --------------------------------------------------------------
// A student can have several groves, one per subject. This hook owns: the
// student's profile (grade), the light list of their groves for the switcher,
// whichever grove is currently open (its concepts and the tutoring session in
// progress), and a non-saving preview of the sample grove. Screens receive the
// whole thing as `g` and are otherwise presentational.
//
// Two persistence modes share one shape. A signed-in student (session cookie,
// see the boot effect) has groves saved to Supabase via /api/student and
// /api/grove. A guest gets the identical multi-grove experience held entirely
// in memory in `localGroves` below: nothing is sent to the server, and it's
// gone on refresh. Every function below branches on `child` internally, so
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
  const [child, setChild] = useState(null);      // signed-in (or legacy-link) student id; null = guest
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("");  // "", "saving", "saved", "error"
  const [profile, setProfile] = useState(null);   // { grade } once set up
  const [insights, setInsights] = useState([]);   // short notes from past sessions, for tutor calibration
  const [setupGrade, setSetupGrade] = useState("");
  const [setupInterests, setSetupInterests] = useState(["", "", ""]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [topicText, setTopicText] = useState("");
  const [sourceMode, setSourceMode] = useState("photo"); // "photo" | "topic", drives Processing's copy
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

  // Who is this? Three answers, in order of preference:
  //   account - a session cookie names a signed-in student (the normal case)
  //   legacy  - no session, but ?student=NAME names a beta row that no account
  //             has claimed yet; those links keep working until the person
  //             signs up, then stop
  //   guest   - neither; the in-memory demo, with the welcome card offered once
  // `child` stays the student id in the first two cases and null for a guest,
  // so nothing downstream changes.
  const [auth, setAuth] = useState({ status: "loading", username: "", role: "student" });
  const [authCard, setAuthCard] = useState(null);     // null | "welcome" | "signin" | "signup"
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  function applyPerson(id, j, status) {
    setChild(id);
    setAuth({ status, username: (j.student && j.student.username) || id, role: (j.student && j.student.role) || "student" });
    setProfile(j.profile && j.profile.grade ? j.profile : null);
    setGroves(Array.isArray(j.groves) ? j.groves : []);
    setInsights(Array.isArray(j.insights) ? j.insights : []);
  }

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        // Coming back from Google? Two possible outcomes are encoded in the
        // URL: the person needs to pick a username, or something failed.
        const back = new URLSearchParams(window.location.search);
        const claim = back.get("claim") === "1";
        const oautherr = back.get("autherror");
        if (claim || oautherr) window.history.replaceState(null, "", window.location.pathname);
        if (oautherr) setAuthError(oautherr === "denied" ? "Google sign-in was cancelled." : "Google sign-in didn't complete. Try again.");

        const r = await fetch("/api/auth/session", { cache: "no-store" });
        const j = r.ok ? await r.json() : null;
        if (cancelled) return;
        if (j && j.student) { applyPerson(j.student.student_id, j, "account"); return; }
        // Signed in with Google but no username yet: ask for one, and don't
        // fall through to guest mode, since the session is real.
        if (claim) {
          setAuth({ status: "claiming", username: "", role: "student" });
          setAuthCard("claim");
          return;
        }
        if (oautherr) { setAuth({ status: "guest", username: "", role: "student" }); setAuthCard("signin"); return; }
        const q = new URLSearchParams(window.location.search);
        const name = q.get("student") || q.get("child");
        const id = name ? name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) : "";
        if (id) {
          const lr = await fetch(`/api/student?student=${encodeURIComponent(id)}`, { cache: "no-store" });
          const lj = lr.ok ? await lr.json() : null;
          if (cancelled) return;
          if (lj) { applyPerson(id, lj, "legacy"); return; }
        }
        setAuth({ status: "guest", username: "", role: "student" });
        setAuthCard("welcome");
      } catch {
        if (!cancelled) setAuth({ status: "guest", username: "", role: "student" });
      } finally {
        if (!cancelled) { setLoaded(true); setGrovesLoaded(true); }
      }
    }
    boot();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // After a sign-in or sign-up: adopt the session, and if this was a guest
  // with groves in memory, save them under the new account so nothing they
  // just did is lost. Then clear any ?student= from the address bar.
  async function adoptSession() {
    const carry = Object.entries(localGroves.current).map(([id, concepts]) => {
      const entry = groves.find((g) => g.id === id);
      return { name: entry ? entry.name : "My grove", concepts };
    }).filter((g) => g.concepts && g.concepts.length);
    for (const g of carry) {
      try { await fetch("/api/grove", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: g.name, concepts: g.concepts }) }); } catch {}
    }
    localGroves.current = {};
    const r = await fetch("/api/auth/session", { cache: "no-store" });
    const j = r.ok ? await r.json() : null;
    if (!j || !j.student) throw new Error("no session");
    setActiveGroveId(null); setActiveGroveName(""); setConcepts([]); setGrewIds([]); setSelected(null);
    applyPerson(j.student.student_id, j, "account");
    setAuthCard(null); setAuthError("");
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }

  async function signIn(identifier, password) {
    setAuthBusy(true); setAuthError("");
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, password }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setAuthError(j.error || "Couldn't sign in."); return false; }
      await adoptSession();
      return true;
    } catch { setAuthError("Couldn't reach the server. Try again."); return false; }
    finally { setAuthBusy(false); }
  }

  async function signUp(username, email, password) {
    setAuthBusy(true); setAuthError("");
    try {
      const r = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, email, password }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setAuthError(j.error || "Couldn't create the account."); return false; }
      if (j.needsConfirmation) { setAuthError("Check your email to confirm the account, then sign in."); setAuthCard("signin"); return false; }
      await adoptSession();
      return true;
    } catch { setAuthError("Couldn't reach the server. Try again."); return false; }
    finally { setAuthBusy(false); }
  }

  function signInWithGoogle() {
    window.location.assign("/api/auth/google");
  }

  async function claimUsername(username) {
    setAuthBusy(true); setAuthError("");
    try {
      const r = await fetch("/api/auth/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setAuthError(j.error || "Couldn't save that username."); return false; }
      await adoptSession();
      return true;
    } catch { setAuthError("Couldn't reach the server. Try again."); return false; }
    finally { setAuthBusy(false); }
  }

  async function signOut() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    window.location.assign(window.location.pathname);   // a clean reload is the simplest correct reset
  }

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
      const r = await fetch(`/api/grove?id=${encodeURIComponent(id)}&student=${encodeURIComponent(child)}`);
      const j = r.ok ? await r.json() : null;
      // A failed load must never fall through to an empty grove: the autosave
      // effect below would then write that empty array back over real data
      // 800ms later. Bail out to the grove list instead of pretending this
      // grove is legitimately empty.
      if (j) { setConcepts(Array.isArray(j.concepts) ? j.concepts : []); setActiveGroveName(j.name || (entry ? entry.name : "")); }
      else { setActiveGroveId(null); setActiveGroveName(""); setError("Couldn't load that grove. Try again."); }
    } catch {
      setActiveGroveId(null); setActiveGroveName(""); setError("Couldn't load that grove. Try again.");
    }
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

  // Accepts one photo or several at once (e.g. a multi-page worksheet or a
  // multi-page calc test). Every page goes into a single extraction call so
  // the model can read them as one assignment rather than merging separate
  // results itself. Capped at 6 pages to keep the request a reasonable size.
  async function handleFile(e) {
    const files = e.target.files ? Array.from(e.target.files).slice(0, 6) : [];
    if (!files.length) return;
    const multi = files.length > 1;
    setError(""); setSourceMode("photo"); setScreen("processing");
    try {
      const images = await Promise.all(files.map((f) => fileToImage(f)));
      const content = [
        ...images.map((img) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: img.data } })),
        { type: "text", text: EXTRACT_PROMPT },
      ];
      const text = await callAPI([{ role: "user", content }], EXTRACT_SYSTEM, "extract");
      const parsed = parseJSON(text);
      if (!parsed || !parsed.concepts || !parsed.concepts.length) throw new Error("empty");
      setSubject(parsed.subject || "Your work");
      setPending(parsed.concepts.slice(0, 8));
      setScreen("confirm");
    } catch {
      setError(multi ? "I couldn't read those clearly. Try brighter, closer photos." : "I couldn't read that one clearly. Try a brighter, closer photo.");
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
    setError(""); setTopicText(""); setSourceMode("topic"); setScreen("processing");
    try {
      const text = await callAPI(
        [{ role: "user", content: TOPIC_PROMPT(topic, profile && profile.grade) }],
        TOPIC_SYSTEM,
        "topic"
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
    const fresh = pending.map((p) => ({ id: uid(), name: p.name, note: p.note || "", attempt: p.attempt || "", mastery: 0, days: 0, reviews: 0 }));
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
    const seed = [{ role: "user", content: tutorSeed(c) }];
    try {
      const text = await callAPI(seed, tutorSystem({ ...(profile || {}), insights }), "tutor");
      const j = parseJSON(text) || { message: text, phase: "question", understanding: "unknown" };
      setApiMsgs([...seed, { role: "assistant", content: text }]);
      setChat([{ who: "tutor", text: j.message, phase: j.phase, options: Array.isArray(j.options) ? j.options : [], correctOption: j.correctOption || "", visual: j.visual || null }]);
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
    // If the student picked one of the last question's own listed options, we
    // already know objectively whether that's right - the tutor declared the
    // answer key when it wrote the question. Check it here instead of asking
    // the model to re-derive it from scratch, and tell the model the verdict
    // rather than leaving it to reason its way back to the same fact.
    const lastTutor = [...chat].reverse().find((m) => m.who === "tutor");
    const wasOption = lastTutor && Array.isArray(lastTutor.options) && lastTutor.options.includes(val);
    const groundTruth = wasOption ? (val === lastTutor.correctOption ? "solid" : "struggling") : null;
    const apiContent = groundTruth
      ? `${val}\n\n(Answer key says this is ${groundTruth === "solid" ? "correct" : "incorrect"} - grade accordingly, this isn't something to re-check.)`
      : val;
    const msgs = [...apiMsgs, { role: "user", content: apiContent }];
    setApiMsgs(msgs); setBusy(true);
    try {
      const text = await callAPI(msgs, tutorSystem({ ...(profile || {}), insights }), "tutor");
      const j = parseJSON(text) || { message: text, phase, understanding: "unknown" };
      // Trust the answer key over the model's own re-judgment if the two ever
      // disagree - the mastery score should never dip on a genuinely correct
      // answer just because the model second-guessed its own stated key.
      if (groundTruth && j.understanding !== groundTruth) j.understanding = groundTruth;
      setApiMsgs([...msgs, { role: "assistant", content: text }]);
      setChat([...nextChat, { who: "tutor", text: j.message, phase: j.phase, options: Array.isArray(j.options) ? j.options : [], correctOption: j.correctOption || "", visual: j.visual || null }]);
      setPhase(j.phase || phase);
      updateMastery(activeId, j.understanding);
      if (j.phase === "done") {
        const doneConcept = concepts.find((c) => c.id === activeId);
        setConcepts((prev) => prev.map((c) => c.id === activeId ? { ...c, days: c.days + 1, reviews: c.reviews + 1 } : c));
        setGrewIds((g) => (g.includes(activeId) ? g : [...g, activeId]));
        // A short, concrete note for next time - saved to the student record, not
        // the grove, since it's about the learner rather than any one concept.
        if (child && j.reflection) {
          const entry = { concept: doneConcept ? doneConcept.name : "", note: j.reflection, at: new Date().toISOString() };
          setInsights((prev) => [...prev, entry].slice(-20));
          fetch("/api/student", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student: child, insight: entry }) }).catch(() => {});
        }
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

  return { active, activeGroveId, activeGroveName, activeId, addText, auth, authBusy, authCard, authError, busy, chat, clearGrove, concepts, confirmConcepts, createGrove, deleteGrove, editingProfile, error, exitPreview, failed, fileRef, grewIds, groves, grovesLoaded, handleFile, handleTopic, input, insights, leaveSession, loaded, newGroveName, nextConcept, nextStage, openGrove, pending, phase, preview, profile, queue, removeTree, renameGrove, saveState, screen, scrollRef, selected, send, sessionPos, sessionTotal, setActiveId, setAddText, setApiMsgs, setBusy, setChat, setChild, setConcepts, setEditingProfile, setError, setFailed, setGrewIds, setInput, setLoaded, setNewGroveName, setPending, setPhase, setProfile, setQueue, setSaveState, setScreen, setSelected, setSetupGrade, setSetupInterests, setShowNewGrove, setSubject, setTopicText, setupGrade, setupInterests, showNewGrove, signIn, signInWithGoogle, signOut, signUp, claimUsername, setAuthCard, setAuthError, sourceMode, startConcept, startPreview, startSession, studyEverything, subject, topicText, updateMastery, child };
}
