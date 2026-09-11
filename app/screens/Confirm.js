"use client";

import React from "react";
import { C } from "../lib/theme";
import Tree from "../components/Tree";
import { Shell, Logo } from "../components/Shell";

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
      <div style={{ padding: "20px 20px 30px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Logo small />
        <div className="fadeUp" style={{ marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.5 }}>Here's what I found. Remove anything you don't need, or add your own.</div>
          <div style={{ display: "inline-block", marginTop: 8, background: C.soft, color: C.primaryDeep, padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>{subject}</div>
        </div>

        <div style={{ position: "relative", flex: 1, minHeight: 0, marginTop: 16 }}>
          <div style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 26, WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 26px), transparent 100%)", maskImage: "linear-gradient(to bottom, black calc(100% - 26px), transparent 100%)" }}>
            {pending.map((c, i) => (
              <div key={i} className="fadeUp" style={{ background: C.card, borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 3px 10px rgba(58,42,32,.05)" }}>
                <Tree days={0} mastery={0} width={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, overflowWrap: "anywhere" }}>{c.name}</div>
                  {c.note && <div style={{ color: C.sub, fontSize: 12.5, marginTop: 1, overflowWrap: "anywhere" }}>{c.note}</div>}
                </div>
                <button onClick={() => handleRemove(i)} aria-label={`Remove ${c.name}`} style={{ border: "none", background: C.soft, color: C.primaryDeep, width: 28, height: 28, borderRadius: 999, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
              </div>
            ))}

            {adding ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  autoFocus
                  value={addText}
                  onChange={(e) => setAddText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitAdd(); if (e.key === "Escape") { setAddText(""); setAdding(false); } }}
                  onBlur={() => { if (!addText.trim()) setAdding(false); }}
                  placeholder="Add a concept…"
                  style={{ flex: 1, minWidth: 0, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "11px 14px", fontSize: 16, outline: "none", background: C.card, fontFamily: "inherit" }}
                />
                <button onClick={commitAdd} style={{ border: "none", background: C.soft, color: C.primaryDeep, padding: "0 16px", borderRadius: 14, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>Add</button>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} style={{ border: `1.5px dashed ${C.line}`, background: "transparent", cursor: "pointer", textAlign: "left", padding: "12px 14px", borderRadius: 16, color: C.primary, fontWeight: 700, fontSize: 13.5 }}>
                + Add your own concept
              </button>
            )}
          </div>
        </div>

        {removed && (
          <div className="fadeUp" style={{ marginTop: 10, background: C.ink, color: C.card, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Removed "{removed.item.name}"</span>
            <button onClick={undoRemove} style={{ border: "none", background: "transparent", color: C.amber, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Undo</button>
          </div>
        )}

        <button onClick={confirmConcepts} disabled={!pending.length} style={{ marginTop: 14, width: "100%", border: "none", cursor: pending.length ? "pointer" : "default", padding: 16, borderRadius: 16, background: pending.length ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : C.line, color: "#FCEFE4", fontWeight: 800, fontSize: 16 }}>
          {`Plant ${pending.length} ${pending.length === 1 ? "tree" : "trees"}`}
        </button>
        <button onClick={() => setScreen("home")} style={{ marginTop: 8, width: "100%", border: "none", background: "transparent", cursor: "pointer", color: C.sub, fontWeight: 700, fontSize: 14 }}>Back to grove</button>
      </div>
    </Shell>
  );
}
