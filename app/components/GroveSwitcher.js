"use client";

import React from "react";
import { C } from "../lib/theme";
import Tree from "./Tree";
import Icon from "./Icon";

// A dropdown anchored under the grove name in the header, not a modal: it
// doesn't dim the app, and closes on an outside tap or its own × button.
export default function GroveSwitcher({ g, onClose }) {
  const { activeGroveId, createGrove, deleteGrove, grovesLoaded, groves, newGroveName, openGrove, renameGrove, setNewGroveName, setShowNewGrove, showNewGrove } = g;
  const [editingId, setEditingId] = React.useState(null);
  const [editingName, setEditingName] = React.useState("");

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
      <div className="fadeUp" style={{ position: "absolute", top: 64, left: 20, zIndex: 30, width: "min(320px, calc(100% - 40px))", maxHeight: "62vh", background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, boxShadow: "0 18px 40px rgba(40,24,12,.28)", padding: "14px 14px 12px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0 }}>
          <div className="disp" style={{ fontSize: 17, fontWeight: 600 }}>Your groves</div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", color: C.sub, cursor: "pointer", padding: 4, fontSize: 18, lineHeight: 1 }}>&times;</button>
        </div>

        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 7, minHeight: 0 }}>
          {!grovesLoaded ? (
            <div style={{ textAlign: "center", color: C.sub, fontSize: 13, fontWeight: 700, padding: "10px 0" }}>Loading&hellip;</div>
          ) : groves.map((gr) => {
            const isActive = gr.id === activeGroveId;
            return (
              <div key={gr.id} style={{ background: isActive ? C.soft : C.bg, border: `1.5px solid ${isActive ? C.primary : C.line}`, borderRadius: 13, padding: "9px 10px", display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ background: C.card, borderRadius: 9, padding: 3, flexShrink: 0 }}><Tree days={Math.min(5, gr.treeCount)} mastery={gr.treeCount ? 60 : 0} width={26} /></div>
                <button
                  onClick={() => (editingId === gr.id ? null : (openGrove(gr.id), onClose()))}
                  style={{ flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
                >
                  {editingId === gr.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => { if (e.key === "Enter") { renameGrove(gr.id, editingName); setEditingId(null); } if (e.key === "Escape") setEditingId(null); }}
                      onBlur={() => { if (editingName.trim()) renameGrove(gr.id, editingName); setEditingId(null); }}
                      style={{ width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 8, padding: "5px 8px", fontSize: 13.5, fontWeight: 800, outline: "none", fontFamily: "inherit", background: C.card }}
                    />
                  ) : (
                    <>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gr.name}{isActive ? " \u00b7 open" : ""}</div>
                      <div style={{ fontSize: 11, color: C.sub, fontWeight: 700, marginTop: 1 }}>
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
              <input
                autoFocus
                value={newGroveName}
                onChange={(e) => setNewGroveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createGrove(); if (e.key === "Escape") setShowNewGrove(false); }}
                placeholder="Music theory, Anatomy…"
                style={{ flex: 1, minWidth: 0, border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "9px 10px", fontSize: 13, outline: "none", fontFamily: "inherit", background: C.bg }}
              />
              <button onClick={() => createGrove()} disabled={!newGroveName.trim()} style={{ border: "none", cursor: newGroveName.trim() ? "pointer" : "default", padding: "0 13px", borderRadius: 10, background: newGroveName.trim() ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : C.line, color: "#FCEFE4", fontWeight: 800, fontSize: 12.5, flexShrink: 0 }}>Add</button>
            </div>
          ) : (
            <button onClick={() => setShowNewGrove(true)} style={{ width: "100%", border: `1.5px dashed ${C.line}`, background: "transparent", cursor: "pointer", padding: 10, borderRadius: 12, color: C.primary, fontWeight: 700, fontSize: 12.5 }}>
              + New grove
            </button>
          )}
        </div>
      </div>
    </>
  );
}
