"use client";

import React from "react";
import { C } from "../../lib/theme";
import { Card, H, ago } from "../ui";

const STATUSES = ["open", "archived"];

export default function FeedbackPage() {
  const [state, setState] = React.useState("loading"); // loading | ok | error
  const [items, setItems] = React.useState([]);

  async function load() {
    try {
      const r = await fetch("/api/admin/feedback", { cache: "no-store" });
      if (!r.ok) { setState("error"); return; }
      const j = await r.json();
      setItems(Array.isArray(j.items) ? j.items : []);
      setState("ok");
    } catch { setState("error"); }
  }
  React.useEffect(() => { load(); }, []);

  function patchLocal(id, fields) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...fields } : it)));
  }
  async function save(id, fields) {
    try {
      await fetch("/api/admin/feedback", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...fields }) });
    } catch {}
  }

  if (state === "loading") return <div style={{ color: C.sub, fontWeight: 700 }}>Loading</div>;
  if (state === "error") return <div style={{ color: "#9A4A28", fontWeight: 700 }}>Couldn't load feedback. Check the server logs.</div>;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="disp" style={{ fontSize: 24, fontWeight: 600 }}>Feedback</div>
        <button onClick={load} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 13px", borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.card, color: C.primaryDeep, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Refresh</button>
      </div>
      <H>{items.length} {items.length === 1 ? "submission" : "submissions"}</H>
      {items.length === 0 ? (
        <Card><div style={{ color: C.sub, fontSize: 13.5 }}>No feedback yet.</div></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((it) => (
            <Card key={it.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ fontSize: 14, lineHeight: 1.5, flex: 1 }}>{it.message}</div>
                <select
                  value={it.status || "open"}
                  onChange={(e) => { patchLocal(it.id, { status: e.target.value }); save(it.id, { status: e.target.value }); }}
                  style={{ border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "6px 8px", fontSize: 12.5, fontFamily: "inherit", background: C.bg, flexShrink: 0 }}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12, color: C.sub, fontWeight: 700, marginTop: 8 }}>
                <span>{it.student_id || (it.email ? it.email : "guest")}</span>
                {it.page && <span>on {it.page}</span>}
                <span>{ago(it.created_at)}</span>
              </div>
              <textarea
                defaultValue={it.notes || ""}
                placeholder="Internal notes…"
                rows={2}
                onBlur={(e) => { patchLocal(it.id, { notes: e.target.value }); save(it.id, { notes: e.target.value }); }}
                style={{ width: "100%", boxSizing: "border-box", marginTop: 10, border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", background: C.bg, resize: "vertical" }}
              />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
