"use client";

import React from "react";
import { C } from "../lib/theme";
import Tree from "../components/Tree";
import { Shell, Logo } from "../components/Shell";
import Card, { Chip } from "../components/ui/Card";
import Field from "../components/ui/Field";
import PillButton from "../components/ui/PillButton";
import Toast from "../components/ui/Toast";

export default function Confirm({ g }) {
  const { addText, confirmConcepts, pending, setAddText, setPending, setScreen, subject } = g;
  const [adding, setAdding] = React.useState(false);
  const [removed, setRemoved] = React.useState(null); // { item, index } of the last-removed card, for Undo
  const removeTimeout = React.useRef(null);

  React.useEffect(() => () => { if (removeTimeout.current) clearTimeout(removeTimeout.current); }, []);

  function handleRemove(i) {
    setRemoved({ item: pending[i], index: i });
    setPending(pending.filter((_, j) => j !== i));
    if (removeTimeout.current) clearTimeout(removeTimeout.current);
    removeTimeout.current = setTimeout(() => setRemoved(null), 4000);
  }
  function undoRemove() {
    if (!removed) return;
    setPending((prev) => {
      const next = [...prev];
      next.splice(Math.min(removed.index, next.length), 0, removed.item);
      return next;
    });
    setRemoved(null);
    if (removeTimeout.current) clearTimeout(removeTimeout.current);
  }
  function commitAdd() {
    if (addText.trim()) setPending([...pending, { name: addText.trim(), note: "" }]);
    setAddText("");
    setAdding(false);
  }

  return (
    <Shell>
      <div style={{ padding: "18px 18px 28px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Logo small />
        <div className="fadeUp" style={{ marginTop: 22 }}>
          <Chip>{subject}</Chip>
          <div className="disp" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.2, marginTop: 12 }}>Here's what I found.</div>
          <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.55, marginTop: 6 }}>Keep what's useful. Remove the rest, or add your own.</div>
        </div>

        <div style={{ position: "relative", flex: 1, minHeight: 0, marginTop: 16 }}>
          <div style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 26, WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 26px), transparent 100%)", maskImage: "linear-gradient(to bottom, black calc(100% - 26px), transparent 100%)" }}>
            {pending.map((c, i) => (
              <Card key={i} className="fadeUp" style={{ padding: "11px 12px 11px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <Tree days={0} mastery={0} width={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 15, overflowWrap: "anywhere" }}>{c.name}</div>
                  {c.note && <div style={{ color: C.sub, fontSize: 12.5, marginTop: 2, overflowWrap: "anywhere" }}>{c.note}</div>}
                </div>
                <button onClick={() => handleRemove(i)} aria-label={`Remove ${c.name}`} className="uiClose" style={{ border: "none", background: "#eef0e6", color: C.ink, width: 30, height: 30, borderRadius: 999, fontSize: 17, lineHeight: 1, flexShrink: 0, padding: 0 }}>×</button>
              </Card>
            ))}

            {adding ? (
              <div style={{ display: "flex", gap: 8 }}>
                <Field
                  autoFocus
                  value={addText}
                  onChange={(e) => setAddText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitAdd(); if (e.key === "Escape") { setAddText(""); setAdding(false); } }}
                  onBlur={() => { if (!addText.trim()) setAdding(false); }}
                  placeholder="Add a concept…"
                  style={{ flex: 1, minWidth: 0, width: "auto" }}
                />
                <PillButton variant="quiet" onClick={commitAdd} style={{ flexShrink: 0, height: 46 }}>Add</PillButton>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} style={{ border: `1px dashed ${C.stone}`, background: "transparent", cursor: "pointer", textAlign: "left", padding: "13px 14px", borderRadius: 14, color: C.primary, fontWeight: 500, fontSize: 14 }}>
                + Add your own concept
              </button>
            )}
          </div>
        </div>

        {removed && (
          <Toast floating className="fadeUp" style={{ bottom: "calc(118px + env(safe-area-inset-bottom))", maxWidth: "min(400px, calc(100% - 32px))" }}
            action={<button onClick={undoRemove} style={{ border: "none", background: "transparent", color: "#d9e8b8", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, padding: 0 }}>Undo</button>}>
            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Removed "{removed.item.name}"</span>
          </Toast>
        )}

        <PillButton size="lg" full onClick={confirmConcepts} disabled={!pending.length} style={{ marginTop: 14 }}>
          {`Plant ${pending.length} ${pending.length === 1 ? "tree" : "trees"}`}
        </PillButton>
        <button onClick={() => setScreen("home")} style={{ marginTop: 6, width: "100%", border: "none", background: "transparent", cursor: "pointer", color: C.sub, fontWeight: 500, fontSize: 14, padding: 8 }}>Back to my grove</button>
      </div>
    </Shell>
  );
}
