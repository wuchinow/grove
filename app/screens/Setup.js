"use client";

import React from "react";
import { C } from "../lib/theme";
import { Shell, Logo } from "../components/Shell";

export default function Setup({ g }) {
  const { editingProfile, setEditingProfile, setProfile, setSetupGrade, setSetupInterests, setupGrade, setupInterests } = g;
  const grades = ["4-5", "6-8", "9-10", "11-12", "College", "Adult"];
  const placeholders = ["A sport, game, or show you like", "Something you're good at", "Anything else you're into"];

  function setInterest(i, val) {
    setSetupInterests((prev) => prev.map((x, idx) => (idx === i ? val : x)));
  }
  function start() {
    setProfile({ grade: setupGrade, interests: setupInterests.map((x) => x.trim()).filter(Boolean) });
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
              style={{ border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "12px 15px", fontSize: 15, outline: "none", fontFamily: "inherit", background: C.card }}
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
