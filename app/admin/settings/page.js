"use client";

import React from "react";
import { C } from "../../lib/theme";
import { Card, H } from "../ui";

const fieldStyle = { border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", background: C.bg, width: 120 };

export default function SettingsPage() {
  const [state, setState] = React.useState("loading"); // loading | ok | error
  const [supabase, setSupabase] = React.useState("0");
  const [vercel, setVercel] = React.useState("0");
  const [domain, setDomain] = React.useState("0");
  const [price, setPrice] = React.useState("4");
  const [saveMsg, setSaveMsg] = React.useState("");

  async function load() {
    try {
      const r = await fetch("/api/admin/settings", { cache: "no-store" });
      if (!r.ok) { setState("error"); return; }
      const j = await r.json();
      const fixed = j.fixed_costs || {};
      setSupabase(String(fixed.supabase ?? 0));
      setVercel(String(fixed.vercel ?? 0));
      setDomain(String(fixed.domain ?? 0));
      setPrice(String(j.price_per_month ?? 4));
      setState("ok");
    } catch { setState("error"); }
  }
  React.useEffect(() => { load(); }, []);

  async function save() {
    setSaveMsg("");
    const fixed_costs = { supabase: Number(supabase) || 0, vercel: Number(vercel) || 0, domain: Number(domain) || 0 };
    const price_per_month = Number(price) || 0;
    try {
      const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fixed_costs, price_per_month }) });
      setSaveMsg(r.ok ? "Saved." : "Couldn't save.");
    } catch { setSaveMsg("Couldn't save."); }
  }

  if (state === "loading") return <div style={{ color: C.sub, fontWeight: 700 }}>Loading</div>;
  if (state === "error") return <div style={{ color: "#9A4A28", fontWeight: 700 }}>Couldn't load settings. Check the server logs.</div>;

  return (
    <>
      <div className="disp" style={{ fontSize: 24, fontWeight: 600 }}>Settings</div>
      <H>Fixed monthly costs</H>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Supabase" value={supabase} onChange={setSupabase} />
          <Field label="Vercel" value={vercel} onChange={setVercel} />
          <Field label="Domain" value={domain} onChange={setDomain} />
        </div>
      </Card>

      <H>Price</H>
      <Card>
        <Field label="Price per month" value={price} onChange={setPrice} />
      </Card>

      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={save} style={{ border: "none", cursor: "pointer", padding: "10px 20px", borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>Save</button>
        {saveMsg && <span style={{ fontSize: 13, fontWeight: 700, color: saveMsg === "Saved." ? C.sageDeep : "#9A4A28" }}>{saveMsg}</span>}
      </div>
    </>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: C.sub, fontWeight: 700 }}>$</span>
        <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" style={fieldStyle} />
      </div>
    </div>
  );
}
