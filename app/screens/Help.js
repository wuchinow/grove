"use client";

import React from "react";
import { C } from "../lib/theme";
import { Shell, Logo } from "../components/Shell";
import Icon from "../components/Icon";

// A full screen rather than a sheet, so it matches Progress: back top-left, room
// to read, and no button stranded at the bottom of a scrolling panel.
export default function Help({ g }) {
  const { child, profile, setEditingProfile, setScreen, setSetupGrade, setSetupInterests } = g;

  const Step = ({ title, children }) => (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "14px 16px", boxShadow: "0 3px 12px rgba(58,42,32,.05)" }}>
      <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 14, color: C.ink, opacity: 0.85, lineHeight: 1.55 }}>{children}</div>
    </div>
  );

  return (
    <Shell>
      <div style={{ padding: "20px 20px 44px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setScreen("home")} style={{ border: "none", background: C.soft, color: C.primaryDeep, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>&larr; My grove</button>
          <Logo small />
        </div>

        <div className="fadeUp" style={{ marginTop: 22 }}>
          <div className="disp" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>How Grove works</div>
          <div style={{ color: C.sub, fontSize: 14, fontWeight: 700, marginTop: 6, lineHeight: 1.5 }}>Grove asks you questions instead of handing over answers. That is the whole idea.</div>
        </div>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          <Step title="1. Add what you're studying">
            Type a topic, or photograph your notes, a worksheet, or a textbook page. Grove pulls out the key ideas and plants a tree for each one.
          </Step>
          <Step title="2. Tend a tree">
            Tap any tree to start a session: one concept, about 3 to 5 questions. Grove asks rather than tells, gives a hint if you're stuck, then has you explain it back.
          </Step>
          <Step title="3. Finish to grow it">
            Every completed session makes that tree one stage taller: seedling, sprouting, sapling, young tree, full grown, towering. Five sessions gets it to full size.
          </Step>
          <Step title="Green means you know it">
            Right answers deepen the colour, wrong ones fade it slightly. A hint or an honest &ldquo;I don't know&rdquo; costs nothing, so there's no reason to guess.
          </Step>
          <Step title="No streaks, no daily quota">
            Do six sessions today and none tomorrow. The grove just reflects the work you've done.
          </Step>
          <Step title="Your photos aren't stored">
            They're read once to find the concepts, then discarded.
          </Step>
        </div>

        <div style={{ flex: 1, minHeight: 20 }} />

        {child && profile && (
          <button onClick={() => {
            setSetupGrade(profile.grade || "");
            const existing = Array.isArray(profile.interests) ? profile.interests : [];
            setSetupInterests([existing[0] || "", existing[1] || "", existing[2] || ""]);
            setScreen("home"); setEditingProfile(true);
          }} style={{ marginTop: 18, width: "100%", border: `1.5px solid ${C.line}`, background: C.card, cursor: "pointer", padding: 14, borderRadius: 15, color: C.primaryDeep, fontWeight: 800, fontSize: 14.5, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="sprout" size={16} color={C.primaryDeep} /> Edit my grade &amp; interests
          </button>
        )}
      </div>
    </Shell>
  );
}
