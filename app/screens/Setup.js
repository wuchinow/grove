"use client";

import React from "react";
import { C } from "../lib/theme";
import { fileToImage } from "../lib/ai";
import { Shell, Logo } from "../components/Shell";
import Icon from "../components/Icon";

export default function Setup({ g }) {
  const { editingProfile, profile, setEditingProfile, setProfile, setSetupAvatar, setSetupGrade, setSetupInterests, setupAvatar, setupGrade, setupInterests } = g;
  const grades = ["4-5", "6-8", "9-10", "11-12", "College", "Adult"];
  const placeholders = ["A sport, game, or show you like", "Something you're good at", "Anything else you're into"];
  const avatarRef = React.useRef(null);

  function setInterest(i, val) {
    setSetupInterests((prev) => prev.map((x, idx) => (idx === i ? val : x)));
  }
  async function handleAvatar(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const img = await fileToImage(file, 96);
      setSetupAvatar(`data:image/jpeg;base64,${img.data}`);
    } catch {}
    if (avatarRef.current) avatarRef.current.value = "";
  }
  function start() {
    // Preserve any existing profile field this screen doesn't own (avatar,
    // soundOn, snakeBest) - this used to always send a fresh { grade,
    // interests } object, silently wiping everything else on every save.
    setProfile({ ...(profile || {}), grade: setupGrade, interests: setupInterests.map((x) => x.trim()).filter(Boolean), avatar: setupAvatar });
    setEditingProfile(false);
  }

  return (
    <Shell>
      <div style={{ padding: "26px 22px 34px", flex: 1, display: "flex", flexDirection: "column" }}>
        <Logo />
        <div className="fadeUp" style={{ marginTop: 26 }}>
          <div className="disp" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>{editingProfile ? "Update your info" : "A couple of quick things"}</div>
          <div style={{ color: C.sub, fontSize: 14, fontWeight: 700, marginTop: 6, lineHeight: 1.55 }}>This sets how Grove pitches its questions and talks to you. Change any of it later from Help.</div>
        </div>

        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, flexShrink: 0, overflow: "hidden", background: C.soft, display: "grid", placeItems: "center" }}>
            {setupAvatar ? <img src={setupAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="sprout" size={26} color={C.primaryDeep} />}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
            <button onClick={() => avatarRef.current && avatarRef.current.click()} style={{ border: `1.5px solid ${C.line}`, background: C.card, cursor: "pointer", padding: "8px 14px", borderRadius: 12, color: C.primaryDeep, fontWeight: 800, fontSize: 13 }}>
              {setupAvatar ? "Change photo" : "Add a photo"} <span style={{ fontWeight: 700, color: C.sub }}>(optional)</span>
            </button>
            {setupAvatar && (
              <button onClick={() => setSetupAvatar("")} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, color: C.sub, fontWeight: 700, fontSize: 12.5 }}>Remove photo</button>
            )}
          </div>
          <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatar} style={{ display: "none" }} />
        </div>

        <div style={{ marginTop: 26, fontSize: 14, fontWeight: 800 }}>What grade are you in?</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {grades.map((gr) => (
            <button key={gr} onClick={() => setSetupGrade(gr)} style={{ border: `1.5px solid ${setupGrade === gr ? C.primary : C.line}`, background: setupGrade === gr ? C.soft : C.card, color: setupGrade === gr ? C.primaryDeep : C.ink, borderRadius: 999, padding: "12px 18px", fontWeight: 800, fontSize: 15, cursor: "pointer", minHeight: 44 }}>{gr}</button>
          ))}
        </div>

        <div style={{ marginTop: 28, fontSize: 14, fontWeight: 800 }}>What are you into? <span style={{ fontWeight: 700, color: C.sub }}>(optional)</span></div>
        <div style={{ fontSize: 13, color: C.sub, fontWeight: 700, marginTop: 4, lineHeight: 1.5 }}>
          Grove can borrow from these to make an explanation click, like a skateboarding analogy for physics. Never forced, only when it actually helps.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              value={setupInterests[i] || ""}
              onChange={(e) => setInterest(i, e.target.value)}
              placeholder={placeholders[i]}
              style={{ border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "12px 15px", fontSize: 16, outline: "none", fontFamily: "inherit", background: C.card }}
            />
          ))}
        </div>

        {!editingProfile && (
          <div style={{ marginTop: 24, fontSize: 13, color: C.sub, fontWeight: 700, lineHeight: 1.55 }}>
            One more thing: on the next screen, tell Grove what you want to study, a topic or a photo. That becomes your first grove.
          </div>
        )}

        <div style={{ flex: 1, minHeight: 20 }} />
        <button onClick={start} disabled={!setupGrade} style={{ marginTop: 22, width: "100%", border: "none", cursor: setupGrade ? "pointer" : "default", padding: 16, borderRadius: 16, background: setupGrade ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : C.line, color: "#FCEFE4", fontWeight: 800, fontSize: 16 }}>Start</button>
      </div>
    </Shell>
  );
}
