"use client";

import React from "react";
import { C } from "../../lib/theme";
import { Card, H, ago } from "../ui";
import { uid } from "../../lib/ai";
import { DEFAULT_SETTINGS, MODELS } from "../../lib/settings";

const fieldStyle = { border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "9px 11px", fontSize: 14, fontFamily: "inherit", background: C.bg };

// Segmented control: a row of pill buttons, one active at a time. Used for
// every Tuning lever except starting_trees (a stepper instead - ten pills
// don't fit a phone-width row).
function Pills({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            style={{
              border: active ? "none" : `1.5px solid ${C.line}`,
              cursor: "pointer",
              padding: "7px 14px",
              borderRadius: 999,
              background: active ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : "transparent",
              color: active ? "#FCEFE4" : C.ink,
              fontWeight: 800,
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({ value, min, max, onChange }) {
  const btnStyle = (disabled) => ({
    border: `1.5px solid ${C.line}`,
    background: disabled ? C.soft : C.card,
    color: disabled ? C.stone : C.primaryDeep,
    width: 32,
    height: 32,
    borderRadius: 999,
    fontSize: 16,
    fontWeight: 800,
    cursor: disabled ? "default" : "pointer",
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} style={btnStyle(value <= min)} aria-label="Decrease">−</button>
      <span style={{ fontSize: 18, fontWeight: 800, minWidth: 20, textAlign: "center" }}>{value}</span>
      <button disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} style={btnStyle(value >= max)} aria-label="Increase">+</button>
    </div>
  );
}

function TuningRow({ label, caption, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>{label}</span>
        {children}
      </div>
      {caption && <div style={{ fontSize: 12, color: C.sub }}>{caption}</div>}
    </div>
  );
}

export default function SettingsPage() {
  const [state, setState] = React.useState("loading"); // loading | ok | error
  const [costs, setCosts] = React.useState([]);
  const [price, setPrice] = React.useState("4");
  const [tuning, setTuning] = React.useState(DEFAULT_SETTINGS);
  // The last-loaded/saved snapshot, kept separate from the live-editing
  // `tuning` state above so a diff against it can drive the sticky Save bar
  // below - a pill or stepper tap changes `tuning` instantly, but nothing
  // persists until that diff is actually saved.
  const [savedTuning, setSavedTuning] = React.useState(DEFAULT_SETTINGS);
  const [changeLog, setChangeLog] = React.useState([]);
  const [saveMsg, setSaveMsg] = React.useState("");
  const [tuningSaveMsg, setTuningSaveMsg] = React.useState("");

  async function load() {
    try {
      const r = await fetch("/api/admin/settings", { cache: "no-store" });
      if (!r.ok) { setState("error"); return; }
      const j = await r.json();
      setCosts(Array.isArray(j.fixed_costs) ? j.fixed_costs : []);
      setPrice(String(j.price_per_month ?? 4));
      setTuning(j.tuning || DEFAULT_SETTINGS);
      setSavedTuning(j.tuning || DEFAULT_SETTINGS);
      setChangeLog(Array.isArray(j.changeLog) ? j.changeLog : []);
      setState("ok");
    } catch { setState("error"); }
  }
  React.useEffect(() => { load(); }, []);

  function setTuningField(key, value) {
    setTuning((prev) => ({ ...prev, [key]: value }));
  }
  const tuningDirty = Object.keys(DEFAULT_SETTINGS).some((k) => tuning[k] !== savedTuning[k]);

  async function saveTuning() {
    setTuningSaveMsg("");
    try {
      const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tuning }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setTuningSaveMsg("Saved."); load(); }
      else setTuningSaveMsg(j.error || "Couldn't save.");
    } catch { setTuningSaveMsg("Couldn't save."); }
  }
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
      const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fixed_costs, price_per_month, tuning }) });
      const j = await r.json().catch(() => ({}));
      setSaveMsg(r.ok ? "Saved." : (j.error || "Couldn't save."));
      if (r.ok) load();
    } catch { setSaveMsg("Couldn't save."); }
  }

  if (state === "loading") return <div style={{ color: C.sub, fontWeight: 700 }}>Loading</div>;
  if (state === "error") return <div style={{ color: "#9A4A28", fontWeight: 700 }}>Couldn't load settings. Check the server logs.</div>;

  const liveModel = MODELS.find((m) => m.id === tuning.model);

  return (
    <>
      <div className="disp" style={{ fontSize: 24, fontWeight: 600 }}>Settings</div>

      <H>Tuning</H>
      <Card>
        <TuningRow label="Model" caption={liveModel ? `Live string: ${liveModel.id}` : ""}>
          <Pills options={MODELS.map((m) => ({ value: m.id, label: m.label }))} value={tuning.model} onChange={(v) => setTuningField("model", v)} />
        </TuningRow>
        <TuningRow label="Effort" caption="Applies to tutor turns only - extraction and topic breakdown always run at the API default.">
          <Pills options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]} value={tuning.effort} onChange={(v) => setTuningField("effort", v)} />
        </TuningRow>
        <TuningRow label="Starting trees" caption="How many concepts a new grove starts with. The student can still add or remove after.">
          <Stepper value={tuning.starting_trees} min={3} max={12} onChange={(v) => setTuningField("starting_trees", v)} />
        </TuningRow>
        <TuningRow label="Mastery threshold" caption="Sessions before a tree advances a stage. Mastery is derived from session count at read time, so changing this re-stages every existing tree immediately - including shrinking ones that were already mature.">
          <Pills options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))} value={tuning.mastery_threshold} onChange={(v) => setTuningField("mastery_threshold", v)} />
        </TuningRow>
        <TuningRow label="Interest analogies">
          <Pills options={[{ value: true, label: "On" }, { value: false, label: "Off" }]} value={tuning.interest_analogies} onChange={(v) => setTuningField("interest_analogies", v)} />
        </TuningRow>
        <TuningRow label="Sample grove preview">
          <Pills options={[{ value: true, label: "On" }, { value: false, label: "Off" }]} value={tuning.sample_grove} onChange={(v) => setTuningField("sample_grove", v)} />
        </TuningRow>
        {tuningDirty && (
          <div style={{ position: "sticky", bottom: 12, marginTop: 14, display: "flex", alignItems: "center", gap: 12, background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "10px 14px", boxShadow: "0 10px 26px rgba(40,24,12,.2)" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.sub, flex: 1 }}>Unsaved Tuning changes</span>
            <button onClick={saveTuning} style={{ border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", fontWeight: 800, fontSize: 13.5, fontFamily: "inherit" }}>Save</button>
            {tuningSaveMsg && <span style={{ fontSize: 12.5, fontWeight: 700, color: tuningSaveMsg === "Saved." ? C.sageDeep : "#9A4A28" }}>{tuningSaveMsg}</span>}
          </div>
        )}
      </Card>

      <H>Change log</H>
      <Card>
        {changeLog.length === 0 && <div style={{ color: C.sub, fontSize: 13.5 }}>No tuning changes yet.</div>}
        {changeLog.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {changeLog.map((row, i) => (
              <div key={i} style={{ fontSize: 13, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "baseline" }}>
                <span style={{ fontWeight: 800 }}>{row.setting}</span>
                <span style={{ color: C.sub }}>{row.old_value ?? "—"} &rarr; {row.new_value}</span>
                <span style={{ color: C.stone }}>&middot; {row.changed_by || "unknown"} &middot; {ago(row.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

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
