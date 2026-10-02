"use client";

import { C } from "../../lib/theme";
import Icon from "../Icon";
import AccountMenu from "../AccountMenu";

// The Home header: the grove name (which opens the switcher), Progress, Help,
// and the account menu. The switcher's open state lives in Home, which also
// renders it, so the setter comes in as a prop.
export default function GroveHeader({ g, setSwitcherOpen }) {
  const { activeGroveId, activeGroveName, groves, setScreen, setShowNewGrove } = g;
  return (
    <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
      {(() => {
        const label = activeGroveId ? (activeGroveName || "Grove") : groves.length > 0 ? "Choose a grove" : "New grove";
        const hint = activeGroveId ? "Switch or add a grove" : groves.length > 0 ? "Choose or add a grove" : "Create your first grove";
        const icon = activeGroveId || groves.length > 0 ? "chevronDown" : "plus";
        return (
          <button
            onClick={() => { setSwitcherOpen(true); if (!activeGroveId && groves.length === 0) setShowNewGrove(true); }}
            title={hint} aria-label={hint}
            style={{ display: "flex", alignItems: "center", gap: 7, border: "none", background: "transparent", cursor: "pointer", padding: 0, minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}
          >
            <div className="groveHeaderIcon" style={{ width: 34, height: 34, borderRadius: 11, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, flexShrink: 0, boxShadow: "0 4px 12px rgba(120,66,37,.24)" }}><Icon name="tree" size={17} color="#FCEFE4" /></div>
            <span className="disp groveHeaderName" style={{ fontWeight: 600, letterSpacing: "-.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
            <span className="groveHeaderChevron" style={{ display: "inline-flex", flexShrink: 0 }}><Icon name={icon} size={15} color={C.stone} strokeWidth={2.4} /></span>
          </button>
        );
      })()}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        <button onClick={() => setScreen("progress")} title="Progress" aria-label="Progress" className="groveHeaderPill" style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.card, color: C.primaryDeep, fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(58,42,32,.07)" }}><Icon name="chart" size={15} color={C.primaryDeep} /> <span className="groveHeaderPillLabel">Progress</span></button>
        <button onClick={() => setScreen("help")} title="Help" aria-label="Help" className="groveHeaderPill" style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.card, color: C.primaryDeep, fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(58,42,32,.07)" }}><Icon name="help" size={15} color={C.primaryDeep} /> <span className="groveHeaderPillLabel">Help</span></button>
        <AccountMenu g={g} />
      </div>
    </div>
  );
}
