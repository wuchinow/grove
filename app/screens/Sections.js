"use client";

import React from "react";
import { C } from "../lib/theme";
import { Shell, Logo } from "../components/Shell";
import Icon from "../components/Icon";

// Shown for a long document (PDF/DOCX/TXT/URL over the character threshold):
// the student picks one section to start with rather than the whole thing
// going through in one extraction call. Single-select, on purpose - it picks
// a slice, not several.
export default function Sections({ g }) {
  const { chooseSection, sections, setScreen, subject } = g;

  return (
    <Shell>
      <div style={{ padding: "20px 20px 30px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Logo small />
        <div className="fadeUp" style={{ marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.5 }}>That's a long one. Pick a section to start with - you can come back for the rest later.</div>
          <div style={{ display: "inline-block", marginTop: 8, background: C.soft, color: C.primaryDeep, padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>{subject}</div>
        </div>

        <div style={{ position: "relative", flex: 1, minHeight: 0, marginTop: 16 }}>
          <div style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 26, WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 26px), transparent 100%)", maskImage: "linear-gradient(to bottom, black calc(100% - 26px), transparent 100%)" }}>
            {sections.map((s, i) => (
              <button key={i} onClick={() => chooseSection(i)} className="fadeUp" style={{ textAlign: "left", background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "13px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 3px 10px rgba(58,42,32,.05)" }}>
                <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 10, background: C.soft, flexShrink: 0, fontWeight: 800, fontSize: 13, color: C.primaryDeep }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, overflowWrap: "anywhere" }}>{s.title}</div>
                  {s.note && <div style={{ color: C.sub, fontSize: 12.5, marginTop: 1, overflowWrap: "anywhere" }}>{s.note}</div>}
                </div>
                <Icon name="chevronRight" size={16} color={C.stone} strokeWidth={2.4} />
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setScreen("home")} style={{ marginTop: 8, width: "100%", border: "none", background: "transparent", cursor: "pointer", color: C.sub, fontWeight: 700, fontSize: 14 }}>Back to grove</button>
      </div>
    </Shell>
  );
}
