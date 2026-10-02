"use client";

import { C } from "../../lib/theme";
import { statusOf, growthLabel, canopyColor } from "../../lib/ai";
import Tree from "../Tree";
import Icon from "../Icon";

// The card that opens when a tree is tapped: its growth, how well it's known,
// and the way into a session on it. Home renders it only while a tree is selected.
export default function TreeCard({ g }) {
  const { concepts, nextStage, removeTree, selected, setSelected, startSession } = g;
  const c = concepts.find((x) => x.id === selected);
  if (!c) return null;
  return (
    <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(45,28,16,.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="fadeUp" style={{ width: "100%", maxWidth: 420, maxHeight: "88vh", overflowY: "auto", background: C.card, borderRadius: 20, padding: "20px 22px 24px", boxShadow: "0 24px 56px rgba(40,24,12,.32)" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -8 }}>
          <button onClick={() => setSelected(null)} aria-label="Close" style={{ border: "none", background: "transparent", color: C.sub, cursor: "pointer", padding: 4, fontSize: 18, lineHeight: 1 }}>&times;</button>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ background: C.bg, borderRadius: 16, padding: 4 }}><Tree days={c.days} mastery={c.mastery} width={64} /></div>
          <div style={{ flex: 1 }}>
            <div className="disp" style={{ fontSize: 21, fontWeight: 600 }}>{c.name}</div>
            <div style={{ color: C.sub, fontSize: 13.5, fontWeight: 700 }}>{growthLabel(c.days, c.mastery, g.settings.mastery_threshold)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <div style={{ flex: 1, background: C.bg, borderRadius: 14, padding: "12px 14px" }}>
            <div className="disp" style={{ fontSize: 17, fontWeight: 700, color: canopyColor(c.mastery).dark, textTransform: "capitalize" }}>{statusOf(c.mastery)}</div>
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>how well you know it</div>
          </div>
          <div style={{ flex: 1, background: C.bg, borderRadius: 14, padding: "12px 14px" }}>
            <div className="disp" style={{ fontSize: 17, fontWeight: 700 }}>{Math.min(5, c.days)} of 5</div>
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>sessions to full size</div>
          </div>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 5 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i < Math.min(5, c.days) ? C.sageDeep : C.line }} />
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: C.sub, fontWeight: 700, textAlign: "center" }}>{nextStage(c)}</div>
        <button onClick={() => { setSelected(null); startSession([c.id], concepts); }} style={{ marginTop: 10, width: "100%", border: "none", cursor: "pointer", padding: 15, borderRadius: 15, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", fontWeight: 800, fontSize: 15 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Icon name="drop" size={17} color="#FCEFE4" /> Tend this tree</span>
        </button>
        <button onClick={() => removeTree(c.id)} style={{ marginTop: 8, width: "100%", border: "none", background: "transparent", cursor: "pointer", color: C.sub, fontWeight: 700, fontSize: 13 }}>Remove this tree</button>
      </div>
    </div>
  );
}
