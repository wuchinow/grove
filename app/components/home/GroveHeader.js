"use client";

import { C } from "../../lib/theme";
import Icon from "../Icon";
import AccountMenu from "../AccountMenu";
import PillButton from "../ui/PillButton";

// The Home header: the grove name (which opens the switcher), Progress, Help,
// and the account menu. The switcher's open state lives in Home, which also
// renders it, so the setter comes in as a prop.
//
// The name's font and size, and the chevron's display, are class rules in
// theme.js rather than inline styles: both change below 360px, and a media
// query can't override an inline style. (The chevron's inline display used to
// keep it on screen at every width.)
export default function GroveHeader({ g, setSwitcherOpen }) {
  const { activeGroveId, activeGroveName, groves, setScreen, setShowNewGrove } = g;
  return (
    <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
      {(() => {
        const label = activeGroveId ? (activeGroveName || "Grove") : groves.length > 0 ? "Choose a grove" : "New grove";
        const hint = activeGroveId ? "Switch or add a grove" : groves.length > 0 ? "Choose or add a grove" : "Create your first grove";
        const icon = activeGroveId || groves.length > 0 ? "chevronDown" : "plus";
        return (
          <button
            onClick={() => { setSwitcherOpen(true); if (!activeGroveId && groves.length === 0) setShowNewGrove(true); }}
            title={hint} aria-label={hint}
            style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: "pointer", padding: 0, minWidth: 0, flex: "1 1 auto", overflow: "hidden", color: C.ink }}
          >
            <div className="groveHeaderIcon" style={{ width: 34, height: 34, borderRadius: 999, background: C.primary, flexShrink: 0 }}><Icon name="tree" size={17} color="#fff" /></div>
            <span className="groveHeaderName" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>{label}</span>
            <span className={icon === "plus" ? "groveHeaderChevron isPlus" : "groveHeaderChevron"}><Icon name={icon} size={14} color={C.sub} strokeWidth={2.2} /></span>
          </button>
        );
      })()}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        <PillButton variant="outline" size={null} onClick={() => setScreen("progress")} title="Progress" aria-label="Progress" className="groveHeaderPill" style={{ height: 36, fontSize: 13, gap: 6 }}><Icon name="chart" size={15} color={C.primary} /> <span className="groveHeaderPillLabel">Progress</span></PillButton>
        <PillButton variant="outline" size={null} onClick={() => setScreen("help")} title="Help" aria-label="Help" className="groveHeaderPill" style={{ height: 36, fontSize: 13, gap: 6 }}><Icon name="help" size={15} color={C.primary} /> <span className="groveHeaderPillLabel">Help</span></PillButton>
        <AccountMenu g={g} />
      </div>
    </div>
  );
}
