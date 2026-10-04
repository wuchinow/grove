"use client";

import { C } from "../../lib/theme";
import { growthLabel } from "../../lib/ai";
import { stageOf, STAGE_MAX } from "../../lib/growth";
import TreeArt from "../TreeArt";
import Icon from "../Icon";
import ModalCard, { Eyebrow } from "../ui/ModalCard";
import PillButton from "../ui/PillButton";

// The card that opens when a tree is tapped: its growth and the way into a
// session on it. How well the concept is known is on Progress, not here. Home
// renders it only while a tree is selected.
export default function TreeCard({ g }) {
  const { concepts, nextStage, removeTree, selected, setSelected, startSession } = g;
  const c = concepts.find((x) => x.id === selected);
  if (!c) return null;
  return (
    <ModalCard onClose={() => setSelected(null)} maxWidth={420} zIndex={20}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ background: C.soft, borderRadius: 16, padding: 6, flexShrink: 0 }}><TreeArt stage={stageOf(c.days)} size={76} concept={c} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow>{growthLabel(c.days)}</Eyebrow>
          <div className="disp" style={{ fontSize: 24, fontWeight: 500, lineHeight: 1.2, marginTop: 5, overflowWrap: "anywhere" }}>{c.name}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 20 }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>{stageOf(c.days)} of {STAGE_MAX}</div>
        <div style={{ fontSize: 13, color: C.sub }}>sessions to full size</div>
      </div>
      <div style={{ marginTop: 9, display: "flex", gap: 5 }}>
        {Array.from({ length: STAGE_MAX }, (_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i < stageOf(c.days) ? C.primary : C.line }} />
        ))}
      </div>
      <div style={{ marginTop: 9, fontSize: 13, color: C.sub, textAlign: "center" }}>{nextStage(c)}</div>
      <PillButton size="lg" full onClick={() => { setSelected(null); startSession([c.id], concepts); }} style={{ marginTop: 14 }}>
        <Icon name="drop" size={17} color="#fff" /> Tend this tree
      </PillButton>
      <button onClick={() => removeTree(c.id)} style={{ marginTop: 6, width: "100%", border: "none", background: "transparent", cursor: "pointer", color: C.sub, fontWeight: 500, fontSize: 13, padding: 8 }}>Remove this tree</button>
    </ModalCard>
  );
}
