"use client";

import React from "react";
import { C } from "../lib/theme";
import TreeArt from "./TreeArt";
import Icon from "./Icon";
import { PopCard, CloseButton } from "./ui/ModalCard";
import PillButton from "./ui/PillButton";
import Field from "./ui/Field";

// A dropdown anchored under the grove name in the header, not a modal: it
// doesn't dim the app, and closes on an outside tap or its own × button.
export default function GroveSwitcher({ g, onClose }) {
  const { activeGroveId, createGrove, deleteGrove, grovesLoaded, groves, newGroveName, openGrove, renameGrove, setNewGroveName, setShowNewGrove, showNewGrove } = g;
  const [editingId, setEditingId] = React.useState(null);
  const [editingName, setEditingName] = React.useState("");

  return (
    <PopCard onClose={onClose} style={{ top: 62, left: 16, width: "min(330px, calc(100% - 32px))", maxHeight: "62vh", padding: "14px 14px 12px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0 }}>
        <div className="disp" style={{ fontSize: 20, fontWeight: 500, paddingLeft: 2 }}>Your groves</div>
        <CloseButton onClick={onClose} />
      </div>

      <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 7, minHeight: 0 }}>
        {!grovesLoaded ? (
          <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: "10px 0" }}>Loading&hellip;</div>
        ) : groves.map((gr) => {
          const isActive = gr.id === activeGroveId;
          return (
            <div key={gr.id} style={{ background: isActive ? C.soft : "rgba(255,255,255,.55)", border: `1px solid ${isActive ? "#7d9860" : C.line}`, borderRadius: 13, padding: "9px 10px", display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ background: C.card, borderRadius: 9, padding: 3, flexShrink: 0 }}><TreeArt stage={gr.treeCount ? 7 : 0} size={32} /></div>
              <button
                onClick={() => (editingId === gr.id ? null : (openGrove(gr.id), onClose()))}
                style={{ flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "transparent", cursor: "pointer", padding: 0, color: C.ink }}
              >
                {editingId === gr.id ? (
                  <Field
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => { if (e.key === "Enter") { renameGrove(gr.id, editingName); setEditingId(null); } if (e.key === "Escape") setEditingId(null); }}
                    onBlur={() => { if (editingName.trim()) renameGrove(gr.id, editingName); setEditingId(null); }}
                    style={{ borderRadius: 8, padding: "5px 8px", fontWeight: 500 }}
                  />
                ) : (
                  <>
                    <div style={{ fontWeight: 500, fontSize: 14, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gr.name}{isActive ? " · open" : ""}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 1 }}>
                      {gr.treeCount === 0 ? "Empty" : `${gr.treeCount} ${gr.treeCount === 1 ? "tree" : "trees"}`}
                    </div>
                  </>
                )}
              </button>
              {editingId !== gr.id && (
                <div style={{ display: "flex", gap: 1, flexShrink: 0 }}>
                  <button onClick={() => { setEditingId(gr.id); setEditingName(gr.name); }} aria-label="Rename" style={{ border: "none", background: "transparent", color: C.sub, cursor: "pointer", padding: 5 }}><Icon name="pencil" size={14} color={C.sub} /></button>
                  <button onClick={() => deleteGrove(gr.id, gr.name)} aria-label="Delete" style={{ border: "none", background: "transparent", color: C.sub, cursor: "pointer", padding: 5 }}><Icon name="trash" size={14} color={C.sub} /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ flexShrink: 0, marginTop: 10 }}>
        {showNewGrove ? (
          <div style={{ display: "flex", gap: 6 }}>
            <Field
              autoFocus
              value={newGroveName}
              onChange={(e) => setNewGroveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createGrove(); if (e.key === "Escape") setShowNewGrove(false); }}
              placeholder="Music theory, Anatomy…"
              style={{ flex: 1, minWidth: 0, width: "auto", padding: "9px 12px" }}
            />
            <PillButton onClick={() => createGrove()} disabled={!newGroveName.trim()} style={{ padding: "0 16px", fontSize: 13, flexShrink: 0 }}>Add</PillButton>
          </div>
        ) : (
          <PillButton variant="outline" size="sm" full onClick={() => setShowNewGrove(true)} style={{ height: 40, border: `1px dashed ${C.stone}`, color: C.primary }}>
            + New grove
          </PillButton>
        )}
      </div>
    </PopCard>
  );
}
