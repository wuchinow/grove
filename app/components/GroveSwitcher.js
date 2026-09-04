"use client";

import React from "react";
import { C } from "../lib/theme";
import Tree from "./Tree";
import Icon from "./Icon";

export default function GroveSwitcher({ g, onClose }) {
  const { activeGroveId, createGrove, deleteGrove, grovesLoaded, groves, newGroveName, openGrove, renameGrove, setNewGroveName, setShowNewGrove, showNewGrove } = g;
  const [editingId, setEditingId] = React.useState(null);
  const [editingName, setEditingName] = React.useState("");

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(45,28,16,.42)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="fadeUp" style={{ width: "100%", maxWidth: 460, maxHeight: "80vh", background: C.card, borderRadius: "24px 24px 0 0", padding: "10px 22px 22px", boxShadow: "0 -10px 40px rgba(40,24,12,.25)", display: "flex", flexDirection: "column" }}>
        <div style={{ width: 40, height: 4, background: C.line, borderRadius: 999, margin: "0 auto 14px", flexShrink: 0 }} />
        <div className="disp" style={{ fontSize: 20, fontWeight: 600, marginBottom: 10, flexShrink: 0 }}>Switch grove</div>

        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
          {!grovesLoaded ? (
            <div style={{ textAlign: "center", color: C.sub, fontSize: 13.5, fontWeight: 700, padding: "14px 0" }}>Loading&hellip;</div>
          ) : groves.map((gr) => {
            const isActive = gr.id === activeGroveId;
            return (
              <div key={gr.id} style={{ background: isActive ? C.soft : C.bg, border: `1.5px solid ${isActive ? C.primary : C.line}`, borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ background: C.card, borderRadius: 10, padding: 3, flexShrink: 0 }}><Tree days={Math.min(5, gr.treeCount)} mastery={gr.treeCount ? 60 : 0} width={30} /></div>
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
                      style={{ width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 9, padding: "6px 9px", fontSize: 14, fontWeight: 800, outline: "none", fontFamily: "inherit", background: C.card }}
                    />
                  ) : (
                    <>
                      <div style={{ fontWeight: 800, fontSize: 14.5, color: C.ink }}>{gr.name}{isActive ? " \u00b7 open" : ""}</div>
                      <div style={{ fontSize: 11.5, color: C.sub, fontWeight: 700, marginTop: 1 }}>
                        {gr.treeCount === 0 ? "Empty" : `${gr.treeCount} ${gr.treeCount === 1 ? "tree" : "trees"}`}
                      </div>
                    </>
                  )}
                </button>
                {editingId !== gr.id && (
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <button onClick={() => { setEditingId(gr.id); setEditingName(gr.name); }} aria-label="Rename" style={{ border: "none", background: "transparent", color: C.sub, cursor: "pointer", padding: 6 }}><Icon name="pencil" size={15} color={C.sub} /></button>
                    <button onClick={() => deleteGrove(gr.id, gr.name)} aria-label="Delete" style={{ border: "none", background: "transparent", color: C.sub, cursor: "pointer", padding: 6 }}><Icon name="trash" size={15} color={C.sub} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ flexShrink: 0, marginTop: 12 }}>
          {showNewGrove ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                autoFocus
                value={newGroveName}
                onChange={(e) => setNewGroveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createGrove(); if (e.key === "Escape") setShowNewGrove(false); }}
                placeholder="Music theory, Anatomy…"
                style={{ flex: 1, minWidth: 0, border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "11px 13px", fontSize: 14, outline: "none", fontFamily: "inherit", background: C.bg }}
              />
              <button onClick={() => createGrove()} disabled={!newGroveName.trim()} style={{ border: "none", cursor: newGroveName.trim() ? "pointer" : "default", padding: "0 16px", borderRadius: 12, background: newGroveName.trim() ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : C.line, color: "#FCEFE4", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>Add</button>
            </div>
          ) : (
            <button onClick={() => setShowNewGrove(true)} style={{ width: "100%", border: `1.5px dashed ${C.line}`, background: "transparent", cursor: "pointer", padding: 12, borderRadius: 14, color: C.primary, fontWeight: 700, fontSize: 13.5 }}>
              + New grove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
