import { C } from "../../lib/theme";

// A short notice on a dark pill. Inline by default, so it sits in the page
// where it is rendered; `floating` pins it above the bottom of the screen for
// a notice that follows an action (an undo). `action` is an optional element,
// usually a button, shown after the message. `tone="warn"` is for something
// that went wrong: same shape, the needs-work brown instead of green.
export default function Toast({ icon, action, floating = false, tone = "plain", className = "", style, children }) {
  const place = floating
    ? { position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: "calc(24px + env(safe-area-inset-bottom))", zIndex: 50, width: "max-content", maxWidth: "calc(100% - 32px)" }
    : null;
  return (
    <div role="status" className={className} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 22, background: tone === "warn" ? C.coral : C.ink, color: "#fff", border: "1px solid rgba(255,255,255,.27)", fontSize: 14, fontWeight: 500, lineHeight: 1.4, ...place, ...style }}>
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {action}
    </div>
  );
}
