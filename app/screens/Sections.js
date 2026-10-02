"use client";

import React from "react";
import { C } from "../lib/theme";
import { Shell, Logo } from "../components/Shell";
import Icon from "../components/Icon";
import Card, { Chip } from "../components/ui/Card";

// Shown for a long document (PDF/DOCX/TXT/URL over the character threshold):
// the student picks one section to start with rather than the whole thing
// going through in one extraction call. Single-select, on purpose - it picks
// a slice, not several.
export default function Sections({ g }) {
  const { chooseSection, sections, setScreen, subject } = g;

  return (
    <Shell>
      <div style={{ padding: "18px 18px 28px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Logo small />
        <div className="fadeUp" style={{ marginTop: 22 }}>
          <Chip>{subject}</Chip>
          <div className="disp" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.2, marginTop: 12 }}>That's a long one.</div>
          <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.55, marginTop: 6 }}>Pick a section to start with. You can come back for the rest later.</div>
        </div>

        <div style={{ position: "relative", flex: 1, minHeight: 0, marginTop: 16 }}>
          <div style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 26, WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 26px), transparent 100%)", maskImage: "linear-gradient(to bottom, black calc(100% - 26px), transparent 100%)" }}>
            {sections.map((s, i) => (
              <Card as="button" key={i} onClick={() => chooseSection(i)} className="fadeUp" style={{ padding: "13px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 999, background: C.soft, flexShrink: 0, fontWeight: 600, fontSize: 13, color: C.primary }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 15, overflowWrap: "anywhere" }}>{s.title}</div>
                  {s.note && <div style={{ color: C.sub, fontSize: 12.5, marginTop: 2, overflowWrap: "anywhere" }}>{s.note}</div>}
                </div>
                <Icon name="chevronRight" size={16} color={C.sub} strokeWidth={2.2} />
              </Card>
            ))}
          </div>
        </div>

        <button onClick={() => setScreen("home")} style={{ marginTop: 6, width: "100%", border: "none", background: "transparent", cursor: "pointer", color: C.sub, fontWeight: 500, fontSize: 14, padding: 8 }}>Back to my grove</button>
      </div>
    </Shell>
  );
}
