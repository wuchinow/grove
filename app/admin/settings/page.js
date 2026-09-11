"use client";

import React from "react";
import { C } from "../../lib/theme";
import { Card, H } from "../ui";
import { uid } from "../../lib/ai";

const fieldStyle = { border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "9px 11px", fontSize: 14, fontFamily: "inherit", background: C.bg };

export default function SettingsPage() {
  const [state, setState] = React.useState("loading"); // loading | ok | error
  const [costs, setCosts] = React.useState([]);
  const [price, setPrice] = React.useState("4");
  const [saveMsg, setSaveMsg] = React.useState("");

  async function load() {
    try {
      const r = await fetch("/api/admin/settings", { cache: "no-store" });
      if (!r.ok) { setState("error"); return; }
      const j = await r.json();
      setCosts(Array.isArray(j.fixed_costs) ? j.fixed_costs : []);
      setPrice(String(j.price_per_month ?? 4));
      setState("ok");
    } catch { setState("error"); }
  }
  React.useEffect(() => { load(); }, []);

  function updateRow(id, patch) {
    setCosts((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id) {
    setCosts((prev) => prev.filter((r) => r.id !== id));
  }
  function addRow() {
    setCosts((prev) => [...prev, { id: uid(), name: "", amount: 0, group: "Infrastructure", note: "" }]);
  }

  async function save() {
    setSaveMsg("");
    const fixed_costs = costs.map((r) => ({ ...r, amount: Number(r.amount) || 0 }));
    const price_per_month = Number(price) || 0;
    try {
      const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fixed_costs, price_per_month }) });
      const j = await r.json().catch(() => ({}));
      setSaveMsg(r.ok ? "Saved." : (j.error || "Couldn't save."));
      if (r.ok) load();
    } catch { setSaveMsg("Couldn't save."); }
  }

  if (state === "loading") return <div style={{ color: C.sub, fontWeight: 700 }}>Loading</div>;
  if (state === "error") return <div style={{ color: "#9A4A28", fontWeight: 700 }}>Couldn't load settings. Check the server logs.</div>;

  return (
    <>
      <div className="disp" style={{ fontSize: 24, fontWeight: 600 }}>Settings</div>
      <H>Fixed monthly costs</H>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {costs.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input value={r.name} onChange={(e) => updateRow(r.id, { name: e.target.value })} placeholder="Name" style={{ ...fieldStyle, flex: "2 1 160px", minWidth: 0 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "0 0 auto" }}>
                <span style={{ color: C.sub, fontWeight: 700 }}>$</span>
                <input value={r.amount} onChange={(e) => updateRow(r.id, { amount: e.target.value })} inputMode="decimal" style={{ ...fieldStyle, width: 76 }} />
              </div>
              <select value={r.group} onChange={(e) => updateRow(r.id, { group: e.target.value })} style={{ ...fieldStyle, flex: "0 0 auto" }}>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Tooling">Tooling</option>
              </select>
              <input value={r.note} onChange={(e) => updateRow(r.id, { note: e.target.value })} placeholder="Note (optional)" style={{ ...fieldStyle, flex: "3 1 140px", minWidth: 0 }} />
              <button onClick={() => removeRow(r.id)} aria-label={`Remove ${r.name || "row"}`} style={{ border: "none", background: C.soft, color: C.primaryDeep, width: 30, height: 30, borderRadius: 999, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
            </div>
          ))}
          {costs.length === 0 && <div style={{ color: C.sub, fontSize: 13.5 }}>No cost rows yet.</div>}
          <button onClick={addRow} style={{ alignSelf: "flex-start", border: `1.5px dashed ${C.line}`, background: "transparent", cursor: "pointer", padding: "9px 14px", borderRadius: 12, color: C.primary, fontWeight: 700, fontSize: 13.5 }}>+ Add row</button>
        </div>
      </Card>

      <H>Price</H>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>Price per month</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: C.sub, fontWeight: 700 }}>$</span>
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" style={{ ...fieldStyle, width: 120 }} />
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={save} style={{ border: "none", cursor: "pointer", padding: "10px 20px", borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>Save</button>
        {saveMsg && <span style={{ fontSize: 13, fontWeight: 700, color: saveMsg === "Saved." ? C.sageDeep : "#9A4A28" }}>{saveMsg}</span>}
      </div>
    </>
  );
}
