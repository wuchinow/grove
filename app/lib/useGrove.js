"use client";

import { useState, useRef, useEffect } from "react";
import { callAPI, parseJSON, fileToImage, fileToBase64, tutorSystem, tutorSeed, EXTRACT_SYSTEM, EXTRACT_PROMPT, TOPIC_SYSTEM, TOPIC_PROMPT, DOCUMENT_SYSTEM, DOCUMENT_PROMPT, DIRECT_TEXT_MAX, splitParagraphs, SECTIONS_SYSTEM, SECTIONS_PROMPT, SCAN_SYSTEM, SCAN_PROMPT, SAMPLE, uid } from "./ai";
import { soundEnabled, playMiss, playSolid, playSessionComplete } from "./sound";
import { DEFAULT_SETTINGS } from "./settings";

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
// gone on refresh. Every function below branches on `student` internally, so
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
  const [justPlantedIds, setJustPlantedIds] = useState([]); // freshly confirmed concepts, animated once on Home then cleared
  const plantTimeout = useRef(null);
  const [failed, setFailed] = useState(false);
  const [student, setStudent] = useState(null);   // signed-in (or legacy-link) student id; null = guest
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("");  // "", "saving", "saved", "error"
  const [profile, setProfile] = useState(null);   // { grade } once set up
  const [insights, setInsights] = useState([]);   // short notes from past sessions, for tutor calibration
  // Public subset of the admin Tuning settings (starting_trees,
  // mastery_threshold, interest_analogies, sample_grove), read once at boot
  // from /api/auth/session or /api/student. Defaults match pre-Tuning
  // behavior exactly, so a failed fetch is invisible to the student.
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [setupGrade, setSetupGrade] = useState("");
  const [setupInterests, setSetupInterests] = useState(["", "", ""]);
  const [setupAvatar, setSetupAvatar] = useState(""); // data URL, seeded from profile.avatar when editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [topicText, setTopicText] = useState("");
  const [sourceMode, setSourceMode] = useState("photo"); // "photo" | "topic" | "pdf" | "docx" | "txt" | "url", drives Processing's copy
  const [processingStage, setProcessingStage] = useState(""); // "" | "reading" | "structuring" | "extracting", Processing's long-wait caption for document sources
  const [sections, setSections] = useState([]); // [{title, note, start, end}] for the Sections screen, a long document's picked slice
  // pendingSource: the {text (full), kind, filename, start, end} to persist as
  // this grove's founding source once confirmConcepts creates it - null for
  // photos, typed topics, and the scanned-PDF fallback (nothing to persist).
  const pendingSource = useRef(null);
  // docRef: the full text + kind/filename of a long document while its
  // Sections screen is up, so picking one can slice locally without a resend.
  const docRef = useRef(null);
  const [preview, setPreview] = useState(false);   // showing the sample grove, nothing saved
  const stash = useRef(null);                      // { concepts, activeGroveId, activeGroveName, loadedGroveId }, parked during a preview
  // Autosave debounce bookkeeping (see the effect below): saveDeadline caps how
  // long a burst of rapid changes can keep deferring the actual save; pendingSave
  // holds the exact payload still waiting to go out, so a page-hide/pagehide
  // listener can flush it immediately instead of losing it to page teardown.
  const saveDeadline = useRef(null);
  const pendingSave = useRef(null);

  // Multiple groves per person. `groves` is the light list (id, name, tree
  // count) for the switcher; opening one loads its full concepts. For an
  // anonymous session, `localGroves` holds each grove's concepts in memory.
  const [groves, setGroves] = useState([]);
  const [grovesLoaded, setGrovesLoaded] = useState(false);
  const [activeGroveId, setActiveGroveId] = useState(null);
  const [activeGroveName, setActiveGroveName] = useState("");
  // Set only once a grove's concepts are known-good in state (a fetch that
  // resolved, a local/guest grove, or a grove just created). The autosave
  // effect below requires this to match activeGroveId before it's allowed to
  // fire, so a save scheduled while a grove is mid-load can never land - the
  // race that wiped Asher's grove (Sep 8) and Phil's (today).
  const [loadedGroveId, setLoadedGroveId] = useState(null);
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

  // Chat-pane scroll position (top-align a new tutor reply vs. bottom-anchor
  // the student's own turn) is DOM-dependent and owned by Tutor.js, which has
  // the message refs.

  useEffect(() => () => { if (plantTimeout.current) clearTimeout(plantTimeout.current); }, []);

  // Who is this? Three answers, in order of preference:
  //   account - a session cookie names a signed-in student (the normal case)
  //   legacy  - no session, but ?student=NAME names a beta row that no account
  //             has claimed yet; those links keep working until the person
  //             signs up, then stop
  //   guest   - neither; the in-memory demo, with the welcome card offered once
  // `student` stays the student id in the first two cases and null for a guest,
  // so nothing downstream changes.
  const [auth, setAuth] = useState({ status: "loading", username: "", role: "student" });
  const [authCard, setAuthCard] = useState(null);     // null | "welcome" | "signin" | "signup"
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  function applyPerson(id, j, status) {
    setStudent(id);
    setAuth({ status, username: (j.student && j.student.username) || id, role: (j.student && j.student.role) || "student" });
    setProfile(j.profile && j.profile.grade ? j.profile : null);
    setGroves(Array.isArray(j.groves) ? j.groves : []);
    setInsights(Array.isArray(j.insights) ? j.insights : []);
    if (j.settings) setSettings(j.settings);
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
        // A guest gets settings too - session always returns the public
        // subset regardless of whether there's a student, since a guest's
        // first extraction still needs starting_trees et al.
        if (j && j.settings) setSettings(j.settings);
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
        const name = q.get("student");
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
    if (!student || !loaded || !profile) return;
    fetch("/api/student", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student, profile }) }).catch(() => {});
  }, [profile, student, loaded]);

  // Save the open grove's concepts whenever they change (debounced), for a
  // named student only. Never sends allowEmpty - clearGrove() and removeTree()
  // send their own immediate, explicit request for that (see below), so any
  // other path that lands on an empty array is refused server-side.
  //
  // Debounced, but capped: a burst of rapid changes (e.g. studying the same
  // concept back-to-back) keeps resetting a flat 800ms timer indefinitely,
  // which is exactly what let Phil's grove sit unsaved for minutes today even
  // though sessions kept completing. saveDeadline bounds how long a single
  // burst can defer the actual write to ~4s from its first change.
  useEffect(() => {
    if (!student || !loaded || preview || !activeGroveId || loadedGroveId !== activeGroveId) return;
    const now = Date.now();
    if (!saveDeadline.current) saveDeadline.current = now + 4000;
    const wait = Math.min(800, Math.max(0, saveDeadline.current - now));
    setSaveState("saving");
    const payload = { student, id: activeGroveId, name: activeGroveName, concepts };
    pendingSave.current = payload;
    const t = setTimeout(() => {
      saveDeadline.current = null;
      fetch("/api/grove", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        .then((r) => setSaveState(r.ok ? "saved" : "error"))
        .catch(() => setSaveState("error"))
        .finally(() => { if (pendingSave.current === payload) pendingSave.current = null; });
    }, wait);
    return () => clearTimeout(t);
  }, [concepts, student, loaded, preview, activeGroveId, activeGroveName, loadedGroveId]);

  // Safety net for the gap above: if the tab closes, the app is backgrounded,
  // or the page otherwise tears down before the debounced save fires, whatever
  // is still in pendingSave would be lost to a normal fetch. sendBeacon is
  // built to survive exactly this; it's POST-only, so /api/grove aliases POST
  // to the same handler as PUT. Falls back to a keepalive fetch if sendBeacon
  // isn't available. The scheduled timeout above is left alone - if the page
  // doesn't actually go away, it still fires and harmlessly re-sends the same
  // (idempotent, full-snapshot) payload.
  useEffect(() => {
    function flush() {
      const payload = pendingSave.current;
      if (!payload) return;
      pendingSave.current = null;
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/grove", new Blob([JSON.stringify(payload)], { type: "application/json" }));
        } else {
          fetch("/api/grove", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
        }
      } catch {}
    }
    function onVisibility() { if (document.visibilityState === "hidden") flush(); }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => { document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("pagehide", flush); };
  }, []);

  // The anonymous equivalent: keep the in-memory copy of the open grove in
  // sync as it's edited, so switching away and back doesn't lose the work.
  useEffect(() => {
    if (student || !activeGroveId || preview) return;
    localGroves.current[activeGroveId] = concepts;
  }, [concepts, student, activeGroveId, preview]);

  // Opening a grove. For a named student this fetches; for an anonymous
  // session it's an instant local lookup, so it skips the loading screen
  // entirely rather than faking a delay that doesn't exist.
  async function openGrove(id) {
    const entry = groves.find((g) => g.id === id);
    if (!student) {
      setActiveGroveId(id);
      setActiveGroveName(entry ? entry.name : "");
      setConcepts(localGroves.current[id] || []);
      setLoadedGroveId(id);
      setGrewIds([]); setSelected(null); setScreen("home");
      return;
    }
    // Block autosave for the duration of the load, even if activeGroveId is
    // switched again before this fetch resolves (loadedGroveId then won't
    // match whatever id is active by the time it settles, so a late response
    // can't write a stale/empty snapshot over a grove the student has since
    // moved away from, or into).
    setLoadedGroveId(null);
    saveDeadline.current = null;
    setActiveGroveId(id);
    setActiveGroveName(entry ? entry.name : "");
    setConcepts([]); setGrewIds([]); setSelected(null);
    setScreen("processing");
    try {
      const r = await fetch(`/api/grove?id=${encodeURIComponent(id)}&student=${encodeURIComponent(student)}`);
      const j = r.ok ? await r.json() : null;
      // A failed load must never fall through to an empty grove: the autosave
      // effect below would then write that empty array back over real data
      // 800ms later. Bail out to the grove list instead of pretending this
      // grove is legitimately empty.
      if (j) { setConcepts(Array.isArray(j.concepts) ? j.concepts : []); setActiveGroveName(j.name || (entry ? entry.name : "")); setLoadedGroveId(id); }
      else { setActiveGroveId(null); setActiveGroveName(""); setError("Couldn't load that grove. Try again."); }
    } catch {
      setActiveGroveId(null); setActiveGroveName(""); setError("Couldn't load that grove. Try again.");
    }
    setScreen("home");
  }

  // Creates a grove (empty, or seeded with concepts already extracted) and
  // makes it the open one. Returns the new id, or null on failure. For an
  // anonymous session this always succeeds and never touches the network.
  async function createGrove(rawName, seedConcepts, source) {
    const name = (rawName ?? newGroveName).trim() || "My grove";
    const seed = seedConcepts || [];
    if (!student) {
      const id = uid();
      localGroves.current[id] = seed;
      setGroves((prev) => [{ id, name, treeCount: seed.length, flourishing: seed.filter((c) => c.mastery >= 85).length }, ...prev]);
      setNewGroveName(""); setShowNewGrove(false);
      setActiveGroveId(id); setActiveGroveName(name); setLoadedGroveId(id);
      setConcepts(seed); setGrewIds([]); setSelected(null);   // never leave the previous grove's trees sitting in state
      return id;
    }
    try {
      const body = { student, name, concepts: seed };
      if (source && source.id) {
        body.source_id = source.id;
        if (Number.isInteger(source.start) && Number.isInteger(source.end)) { body.source_start = source.start; body.source_end = source.end; }
      }
      const r = await fetch("/api/grove", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = r.ok ? await r.json() : null;
      if (!j || !j.id) return null;
      setGroves((prev) => [{ id: j.id, name, treeCount: seed.length, flourishing: seed.filter((c) => c.mastery >= 85).length }, ...prev]);
      setNewGroveName(""); setShowNewGrove(false);
      setActiveGroveId(j.id); setActiveGroveName(name); setLoadedGroveId(j.id);
      setConcepts(seed); setGrewIds([]); setSelected(null);   // never leave the previous grove's trees sitting in state
      return j.id;
    } catch { return null; }
  }

  function renameGrove(id, name) {
    const clean = name.trim();
    if (!clean) return;
    setGroves((prev) => prev.map((g) => (g.id === id ? { ...g, name: clean } : g)));
    if (id === activeGroveId) setActiveGroveName(clean);
    if (!student) return;
    fetch("/api/grove", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student, id, name: clean }) }).catch(() => {});
  }

  function deleteGrove(id, name) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    setGroves((prev) => prev.filter((g) => g.id !== id));
    if (id === activeGroveId) { setActiveGroveId(null); setActiveGroveName(""); setConcepts([]); setGrewIds([]); setSelected(null); }
    if (!student) { delete localGroves.current[id]; return; }
    fetch(`/api/grove?id=${encodeURIComponent(id)}&student=${encodeURIComponent(student)}`, { method: "DELETE" }).catch(() => {});
  }

  // Accepts one photo or several at once (e.g. a multi-page worksheet or a
  // multi-page calc test). Every page goes into a single extraction call so
  // the model can read them as one assignment rather than merging separate
  // results itself. Capped at 6 pages to keep the request a reasonable size.
  async function handleFile(e) {
    const files = e.target.files ? Array.from(e.target.files).slice(0, 6) : [];
    if (!files.length) return;
    const multi = files.length > 1;
    pendingSource.current = null; docRef.current = null;
    setError(""); setSourceMode("photo"); setScreen("processing");
    try {
      const images = await Promise.all(files.map((f) => fileToImage(f)));
      const content = [
        ...images.map((img) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: img.data } })),
        { type: "text", text: EXTRACT_PROMPT(settings.starting_trees) },
      ];
      const text = await callAPI([{ role: "user", content }], EXTRACT_SYSTEM, "extract");
      const parsed = parseJSON(text);
      if (!parsed || !parsed.concepts || !parsed.concepts.length) throw new Error("empty");
      setSubject(parsed.subject || "Your work");
      setPending(parsed.concepts.slice(0, settings.starting_trees));
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
    pendingSource.current = null; docRef.current = null;
    setError(""); setTopicText(""); setSourceMode("topic"); setScreen("processing");
    try {
      const text = await callAPI(
        [{ role: "user", content: TOPIC_PROMPT(topic, profile && profile.grade, settings.starting_trees) }],
        TOPIC_SYSTEM,
        "topic"
      );
      const parsed = parseJSON(text);
      if (!parsed || !parsed.concepts || !parsed.concepts.length) throw new Error("empty");
      setSubject(parsed.subject || topic);
      setPending(parsed.concepts.slice(0, settings.starting_trees));
      setScreen("confirm");
    } catch {
      setError("I couldn't break that topic down. Try naming it a little differently.");
      setScreen("home");
    }
  }

  // Starts with http(s), or has no whitespace and a dot followed by letters
  // (a bare domain like "en.wikipedia.org/..."): a deliberately simple
  // shape-based check, not a URL parser - anything else is a topic.
  function looksLikeUrl(s) {
    const t = s.trim();
    if (/^https?:\/\//i.test(t)) return true;
    return !/\s/.test(t) && /\.[a-z]{2,}/i.test(t);
  }

  // The merged study field's one submit path: dispatches to the existing
  // handleTopic or handleUrl, which are otherwise unchanged.
  function handleStudy(raw) {
    const val = (raw ?? topicText).trim();
    if (!val) return;
    setTopicText("");
    if (looksLikeUrl(val)) handleUrl(val);
    else handleTopic(val);
  }

  // Dispatched from the one "Share your work" file input, which now accepts
  // photos alongside PDF/DOCX/TXT: an all-image selection keeps the existing
  // multi-page photo flow, anything else is a single document.
  function handleShare(e) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    if (files.every((f) => f.type.startsWith("image/"))) { handleFile(e); return; }
    handleDocument(files[0]);
    if (fileRef.current) fileRef.current.value = "";
  }

  const MAX_DOC_BYTES = 20 * 1024 * 1024;

  function docKindOf(file) {
    const ext = (file.name || "").toLowerCase().split(".").pop();
    if (file.type === "application/pdf" || ext === "pdf") return "pdf";
    if (ext === "docx" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
    return "txt";
  }

  // PDF/DOCX/TXT: every format becomes plain text before any model call.
  // TXT is read client-side; PDF and DOCX round-trip through
  // /api/extract-file, which extracts text server-side and never sends the
  // original file to the model unless the PDF has no text layer at all (see
  // handlePdfFallback).
  async function handleDocument(file) {
    if (!file) return;
    pendingSource.current = null; docRef.current = null;
    if (file.size > MAX_DOC_BYTES) { setError("That file is too large. Try something smaller."); return; }
    const kind = docKindOf(file);
    const name = file.name || "";
    setError(""); setSourceMode(kind); setScreen("processing"); setProcessingStage("reading");
    try {
      let text;
      if (kind === "txt") {
        text = (await file.text()).trim();
        if (!text) throw new Error("I couldn't find any text in that file.");
      } else {
        const b64 = await fileToBase64(file);
        const r = await fetch("/api/extract-file", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, data: b64 }) });
        const j = await r.json().catch(() => null);
        if (!r.ok) throw new Error((j && j.error) || "I couldn't read that file. Try again.");
        if (kind === "pdf" && j.fallback) { await handlePdfFallback(b64); return; }
        text = (j.text || "").trim();
        if (!text) throw new Error("I couldn't find any text in that file.");
      }
      await proceedWithText(text, kind, name);
    } catch (e) {
      setError(e.message || "I couldn't read that file. Try again.");
      setScreen("home"); setProcessingStage("");
    }
  }

  // Plain web URLs: fetched and stripped to text server-side (see
  // /api/extract-file), same pipeline from there on as any other document.
  async function handleUrl(url) {
    if (!url) return;
    pendingSource.current = null; docRef.current = null;
    setError(""); setSourceMode("url"); setScreen("processing"); setProcessingStage("reading");
    try {
      const r = await fetch("/api/extract-file", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "url", url }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error((j && j.error) || "Couldn't reach that page. Check the link and try again.");
      const text = (j.text || "").trim();
      if (!text) throw new Error("That page didn't have readable text to pull from.");
      await proceedWithText(text, "url", url);
    } catch (e) {
      setError(e.message || "Couldn't reach that page. Check the link and try again.");
      setScreen("home"); setProcessingStage("");
    }
  }

  // A scanned PDF has no text layer: degrade to exactly the photo path, sent
  // to the model as a native document content block. Nothing is persisted -
  // no sources row, no source_id - same promise as a photo.
  async function handlePdfFallback(b64) {
    setProcessingStage("extracting");
    try {
      const content = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
        { type: "text", text: SCAN_PROMPT(settings.starting_trees) },
      ];
      const text = await callAPI([{ role: "user", content }], SCAN_SYSTEM, "extract");
      const parsed = parseJSON(text);
      if (!parsed || !parsed.concepts || !parsed.concepts.length) throw new Error("empty");
      setSubject(parsed.subject || "Your document");
      setPending(parsed.concepts.slice(0, settings.starting_trees));
      pendingSource.current = null;
      setScreen("confirm");
    } catch {
      setError("I couldn't read that PDF clearly. Try a text-based PDF, or a photo of it instead.");
      setScreen("home");
    } finally {
      setProcessingStage("");
    }
  }

  // The uniform direct-vs-structure decision, in code: a single character
  // threshold, applied identically no matter which of the four formats the
  // text came from - no model judgment involved.
  async function proceedWithText(text, kind, filename) {
    if (text.length <= DIRECT_TEXT_MAX) {
      await runDocumentExtraction(text, { fullText: text, kind, filename, start: null, end: null });
      return;
    }
    setProcessingStage("structuring");
    try {
      const paras = splitParagraphs(text);
      const raw = await callAPI([{ role: "user", content: SECTIONS_PROMPT(paras) }], SECTIONS_SYSTEM, "extract");
      const parsed = parseJSON(raw);
      const rawSections = parsed && Array.isArray(parsed.sections) ? parsed.sections : [];
      // Code derives the real [start,end) from the paragraph offsets it
      // already tracked; the model only ever named paragraph indices.
      const built = rawSections.map((s) => {
        const first = Math.max(0, Math.min(paras.length - 1, Math.round(Number(s.firstParagraph)) || 0));
        const last = Math.max(first, Math.min(paras.length - 1, Math.round(Number(s.lastParagraph)) || first));
        return { title: (s.title || "Section").slice(0, 80), note: (s.note || "").slice(0, 160), start: paras[first].start, end: paras[last].end };
      }).filter((s) => s.end > s.start);
      if (!built.length) throw new Error("empty");
      setSubject(parsed.subject || filename || "Your document");
      setSections(built);
      docRef.current = { text, kind, filename };
      setScreen("sections");
    } catch {
      setError("I couldn't find sections in that document. Try a shorter one.");
      setScreen("home");
    } finally {
      setProcessingStage("");
    }
  }

  // The student picked one slice of a long document: slice it locally (the
  // full text is already in hand, no resend) and run the same direct-mode
  // extraction call on just that slice.
  async function chooseSection(index) {
    const sec = sections[index];
    const doc = docRef.current;
    if (!sec || !doc) return;
    const slice = doc.text.slice(sec.start, sec.end);
    setScreen("processing");
    await runDocumentExtraction(slice, { fullText: doc.text, kind: doc.kind, filename: doc.filename, start: sec.start, end: sec.end });
  }

  async function runDocumentExtraction(text, { fullText, kind, filename, start, end }) {
    setProcessingStage("extracting"); setScreen("processing");
    try {
      const raw = await callAPI([{ role: "user", content: DOCUMENT_PROMPT(text, settings.starting_trees) }], DOCUMENT_SYSTEM, "extract");
      const parsed = parseJSON(raw);
      if (!parsed || !parsed.concepts || !parsed.concepts.length) throw new Error("empty");
      setSubject(parsed.subject || filename || "Your document");
      setPending(parsed.concepts.slice(0, settings.starting_trees));
      pendingSource.current = { text: fullText, kind, filename, start, end };
      setScreen("confirm");
    } catch {
      setError("I couldn't find concepts in that. Try a different document.");
      setScreen("home");
    } finally {
      setProcessingStage("");
    }
  }

  function startPreview() {
    stash.current = { concepts, activeGroveId, activeGroveName, loadedGroveId };
    setConcepts(SAMPLE.concepts.map((c) => ({ id: uid(), name: c.name, note: c.note, mastery: c.mastery, days: c.days, reviews: c.days })));
    setActiveGroveId(null); setActiveGroveName("Sample grove");
    setPreview(true); setSelected(null); setGrewIds([]); setScreen("home");
  }
  function exitPreview() {
    const prev = stash.current || { concepts: [], activeGroveId: null, activeGroveName: "", loadedGroveId: null };
    setConcepts(prev.concepts); setActiveGroveId(prev.activeGroveId); setActiveGroveName(prev.activeGroveName); setLoadedGroveId(prev.loadedGroveId);
    saveDeadline.current = null;
    stash.current = null;
    setPreview(false); setSelected(null); setGrewIds([]); setScreen("home");
  }

  function nextStage(c) {
    const stages = ["Just planted", "Sprouting", "Sapling", "Young tree", "Full grown", "Towering"];
    const threshold = settings.mastery_threshold || 1;
    const i = Math.min(5, Math.floor(c.days / threshold));
    if (i >= 5) return "Fully grown. Come back to it whenever you want to keep it green.";
    const remaining = (i + 1) * threshold - c.days;
    return remaining === 1
      ? `Finish one more session to become a ${stages[i + 1]}.`
      : `Finish ${remaining} more sessions to become a ${stages[i + 1]}.`;
  }
  // Going to zero trees is the one legitimate reason to overwrite a non-empty
  // concepts array with an empty one, so these two send allowEmpty explicitly
  // and immediately - outside the debounced autosave effect, which never
  // sends it - so a later unrelated re-render within the debounce window can
  // never cancel or drop the deliberate write.
  function persistEmptyGrove() {
    if (!student || !activeGroveId) return;
    fetch("/api/grove", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student, id: activeGroveId, concepts: [], allowEmpty: true }) }).catch(() => {});
  }
  function clearGrove() {
    if (!window.confirm("Clear every tree in this grove? This can't be undone.")) return;
    setConcepts([]); setGrewIds([]); setSelected(null);
    persistEmptyGrove();
  }
  function removeTree(id) {
    const c = concepts.find((x) => x.id === id);
    if (!c || !window.confirm(`Remove "${c.name}" from your grove?`)) return;
    const next = concepts.filter((x) => x.id !== id);
    setConcepts(next); setSelected(null);
    if (next.length === 0) persistEmptyGrove();
  }

  // Confirming a fresh batch of concepts. If no grove is open, this is the
  // first add for this grove slot: it becomes a new grove, auto-named from
  // the subject, with no separate naming step in the way. Works identically
  // whether or not the student is signed in by name.
  async function confirmConcepts() {
    const fresh = pending.map((p) => ({ id: uid(), name: p.name, note: p.note || "", attempt: p.attempt || "", mastery: 0, days: 0, reviews: 0 }));
    let all;
    if (!activeGroveId) {
      // A grove founded from an extracted document (PDF/DOCX/TXT/URL) gets a
      // sources row - the full text, never just a picked slice - and records
      // its source_id (and the range actually used, if any) in the same
      // write that creates the grove. Guests and every other source (photo,
      // typed topic, scanned-PDF fallback) never touch /api/sources.
      let source = null;
      const doc = pendingSource.current;
      if (student && doc && doc.text) {
        try {
          const r = await fetch("/api/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student, filename: doc.filename, kind: doc.kind, text: doc.text }) });
          const j = r.ok ? await r.json() : null;
          if (j && j.id) source = { id: j.id, start: doc.start, end: doc.end };
        } catch {}
      }
      const id = await createGrove(subject, fresh, source);
      if (!id) { setError("Couldn't create a grove for this. Try again."); setScreen("home"); return; }
      setConcepts(fresh);
      all = fresh;
    } else {
      // Merge server-side against the row's own current concepts, rather than
      // trusting local state (which may not be fully settled yet) to already
      // be complete - same race class as the load race above.
      try {
        const r = await fetch("/api/grove", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student, id: activeGroveId, append: fresh }) });
        const j = r.ok ? await r.json() : null;
        if (!j || !Array.isArray(j.concepts)) { setError("Couldn't add to this grove. Try again."); setScreen("home"); return; }
        all = j.concepts;
        setConcepts(all);
      } catch {
        setError("Couldn't add to this grove. Try again."); setScreen("home"); return;
      }
    }
    pendingSource.current = null; docRef.current = null;
    plantAndStart(fresh.map((c) => c.id), all);
  }

  // Lands on Home with the new trees rising (Home.js animates justPlantedIds
  // with the reused .grew keyframe, staggered), plays the session-complete
  // sound, then auto-advances into tutoring once the animation has had time
  // to play - "Plant and start growing" stays true, it just shows the
  // planting first rather than skipping straight to the first question.
  function plantAndStart(freshIds, all) {
    setGrewIds([]);
    setJustPlantedIds(freshIds);
    setScreen("home");
    if (soundEnabled(student, profile)) playSessionComplete();
    if (plantTimeout.current) clearTimeout(plantTimeout.current);
    plantTimeout.current = setTimeout(() => {
      plantTimeout.current = null;
      setJustPlantedIds([]);
      startSession(freshIds, all);
    }, 500);
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

  // Snake best score plus a best-effort turns row, so admin can see whether
  // it displaces study time. Guests never reach the Play screen (no entry
  // point in AccountMenu), so there's always a student to resolve.
  async function reportGameScore(score) {
    if (!student) return;
    try {
      const r = await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student, score }) });
      const j = r.ok ? await r.json() : null;
      if (j && typeof j.best === "number") setProfile((prev) => ({ ...(prev || {}), snakeBest: j.best }));
    } catch {}
  }
  async function startConcept(id, all) {
    const c = (all || concepts).find((x) => x.id === id);
    if (!c) return;
    setActiveId(id); setPhase("question"); setChat([]); setBusy(true); setFailed(false);
    const seed = [{ role: "user", content: tutorSeed(c) }];
    try {
      const { text, j } = await getTutorReply(seed);
      setApiMsgs([...seed, { role: "assistant", content: text }]);
      setChat([{ who: "tutor", text: j.message, phase: j.phase, options: Array.isArray(j.options) ? j.options : [], correctOption: j.correctOption || "", visual: j.visual || null }]);
      setPhase(j.phase || "question");
    } catch {
      setChat([{ who: "tutor", text: "I couldn't reach the tutor just now. Tap Try again.", phase: "question" }]);
      setApiMsgs(seed); setFailed(true);
    } finally { setBusy(false); }
  }
  // Every non-final turn must leave the student something to act on (a
  // question, or options). The prompt says so, but a model can still drop it -
  // same "code guarantees the shape" pattern as parseJSON's recovery and
  // autoboldQuestion. One re-prompt with a short nudge; if that still comes
  // back malformed, patch the message with a generic open-ended question
  // rather than leaving a dead end (never fabricate options here - a fake
  // option could get graded as a wrong answer against an empty answer key).
  function isMalformed(j) {
    if (!j || j.phase === "done") return false;
    const hasOptions = Array.isArray(j.options) && j.options.length > 0;
    const hasQuestion = typeof j.message === "string" && j.message.includes("?");
    return !hasOptions && !hasQuestion;
  }
  async function getTutorReply(msgsForApi) {
    const system = tutorSystem({ ...(profile || {}), insights }, settings);
    const text = await callAPI(msgsForApi, system, "tutor");
    const j = parseJSON(text) || { message: text, phase: "question", understanding: "unknown" };
    if (!isMalformed(j)) return { text, j };
    try {
      const nudge = "(That reply had no question and no options - every non-final turn must leave the student something to act on. Try again with a question.)";
      const retryText = await callAPI([...msgsForApi, { role: "assistant", content: text }, { role: "user", content: nudge }], system, "tutor-retry");
      const retryJ = parseJSON(retryText);
      if (retryJ && !isMalformed(retryJ)) return { text: retryText, j: retryJ };
    } catch {}
    const fallbackMsg = (j.message || "").trim() || "Let's keep going.";
    return { text, j: { ...j, message: `${fallbackMsg}\n\n**What would you like to do next?**`, options: [], correctOption: "" } };
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
      const { text, j } = await getTutorReply(msgs);
      // Trust the answer key over the model's own re-judgment if the two ever
      // disagree - the mastery score should never dip on a genuinely correct
      // answer just because the model second-guessed its own stated key.
      if (groundTruth && j.understanding !== groundTruth) j.understanding = groundTruth;
      setApiMsgs([...msgs, { role: "assistant", content: text }]);
      setChat([...nextChat, { who: "tutor", text: j.message, phase: j.phase, options: Array.isArray(j.options) ? j.options : [], correctOption: j.correctOption || "", visual: j.visual || null }]);
      setPhase(j.phase || phase);
      updateMastery(activeId, j.understanding);
      if (soundEnabled(student, profile)) {
        if (j.understanding === "solid") playSolid();
        else if (j.understanding === "struggling") playMiss();
      }
      if (j.phase === "done") {
        const doneConcept = concepts.find((c) => c.id === activeId);
        setConcepts((prev) => prev.map((c) => c.id === activeId ? { ...c, days: c.days + 1, reviews: c.reviews + 1 } : c));
        setGrewIds((g) => (g.includes(activeId) ? g : [...g, activeId]));
        // A short, concrete note for next time - saved to the student record, not
        // the grove, since it's about the learner rather than any one concept.
        if (student && j.reflection) {
          const entry = { concept: doneConcept ? doneConcept.name : "", note: j.reflection, at: new Date().toISOString() };
          setInsights((prev) => [...prev, entry].slice(-20));
          fetch("/api/student", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student, insight: entry }) }).catch(() => {});
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

  return { active, activeGroveId, activeGroveName, activeId, addText, auth, authBusy, authCard, authError, busy, chat, chooseSection, clearGrove, concepts, confirmConcepts, createGrove, deleteGrove, editingProfile, error, exitPreview, failed, feedbackOpen, fileRef, grewIds, groves, grovesLoaded, handleDocument, handleFile, handleShare, handleStudy, input, insights, justPlantedIds, leaveSession, loaded, newGroveName, nextConcept, nextStage, openGrove, pending, phase, preview, processingStage, profile, queue, removeTree, renameGrove, reportGameScore, saveState, screen, scrollRef, sections, selected, send, sessionPos, sessionTotal, setActiveId, setAddText, setApiMsgs, setBusy, setChat, setConcepts, setEditingProfile, setError, setFailed, setGrewIds, setInput, setLoaded, setNewGroveName, setPending, setPhase, setProfile, setQueue, setSaveState, setScreen, setSelected, setSetupGrade, setSetupInterests, setShowNewGrove, setStudent, setSubject, setTopicText, setSetupAvatar, setupAvatar, setupGrade, setupInterests, settings, showNewGrove, signIn, signInWithGoogle, signOut, signUp, claimUsername, setAuthCard, setAuthError, setFeedbackOpen, sourceMode, startConcept, startPreview, startSession, studyEverything, student, subject, topicText, updateMastery };
}
