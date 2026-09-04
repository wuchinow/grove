"use client";

import React from "react";
import { C } from "../lib/theme";
import { statusOf, growthLabel, canopyColor } from "../lib/ai";
import Tree from "../components/Tree";
import { Shell, Logo } from "../components/Shell";
import Icon from "../components/Icon";

export default function Confirm({ g }) {
  const { addText, confirmConcepts, input, pending, setAddText, setPending, setScreen, subject } = g;
    return (
      <Shell>
        <div style={{ padding: "20px 20px 30px", flex: 1, display: "flex", flexDirection: "column" }}>
          <Logo small />
          <div className="fadeUp" style={{ marginTop: 20 }}>
            <div className="disp" style={{ fontSize: 25, fontWeight: 600 }}>Ready to plant {pending.length} {pending.length === 1 ? "tree" : "trees"}</div>
            <div style={{ display: "inline-block", marginTop: 8, background: C.soft, color: C.primaryDeep, padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>{subject}</div>
          </div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto" }}>
            {pending.map((c, i) => (
              <div key={i} className="fadeUp" style={{ background: C.card, borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 3px 10px rgba(58,42,32,.05)" }}>
                <Tree days={0} mastery={0} width={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{c.name}</div>
                  {c.note && <div style={{ color: C.sub, fontSize: 12.5, marginTop: 1 }}>{c.note}</div>}
                </div>
                <button onClick={() => setPending(pending.filter((_, j) => j !== i))} style={{ border: "none", background: C.soft, color: C.primaryDeep, width: 28, height: 28, borderRadius: 999, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={addText} onChange={(e) => setAddText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && addText.trim()) { setPending([...pending, { name: addText.trim(), note: "" }]); setAddText(""); } }} placeholder="Add a concept…" style={{ flex: 1, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "11px 14px", fontSize: 14, outline: "none", background: C.card, fontFamily: "inherit" }} />
              <button onClick={() => { if (addText.trim()) { setPending([...pending, { name: addText.trim(), note: "" }]); setAddText(""); } }} style={{ border: "none", background: C.soft, color: C.primaryDeep, padding: "0 16px", borderRadius: 14, fontWeight: 800, cursor: "pointer" }}>Add</button>
            </div>
          </div>
          <button onClick={confirmConcepts} disabled={!pending.length} style={{ marginTop: 14, width: "100%", border: "none", cursor: pending.length ? "pointer" : "default", padding: 16, borderRadius: 16, background: pending.length ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : C.line, color: "#FCEFE4", fontWeight: 800, fontSize: 16 }}>
            Plant and start growing
          </button>
          <button onClick={() => setScreen("home")} style={{ marginTop: 8, width: "100%", border: "none", background: "transparent", cursor: "pointer", color: C.sub, fontWeight: 700, fontSize: 14 }}>Back to grove</button>
        </div>
      </Shell>
    );
}
