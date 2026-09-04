"use client";

import React from "react";
import { C } from "../lib/theme";
import { Shell, Logo } from "../components/Shell";
import Icon from "../components/Icon";

export default function Setup({ g }) {
  const { setEditingProfile, setProfile, setSetupGrade, setupGrade } = g;
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
            {grades.map((gr) => (
              <button key={gr} onClick={() => setSetupGrade(gr)} style={{ border: `1.5px solid ${setupGrade === gr ? C.primary : C.line}`, background: setupGrade === gr ? C.soft : C.card, color: setupGrade === gr ? C.primaryDeep : C.ink, borderRadius: 999, padding: "12px 18px", fontWeight: 800, fontSize: 15, cursor: "pointer", minHeight: 44 }}>{gr}</button>
            ))}
          </div>

          <div style={{ flex: 1 }} />
          <button onClick={() => { setProfile({ grade: setupGrade }); setEditingProfile(false); }} disabled={!setupGrade} style={{ marginTop: 22, width: "100%", border: "none", cursor: setupGrade ? "pointer" : "default", padding: 16, borderRadius: 16, background: setupGrade ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : C.line, color: "#FCEFE4", fontWeight: 800, fontSize: 16 }}>Start</button>
        </div>
      </Shell>
    );
}
