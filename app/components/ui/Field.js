import React from "react";
import { C } from "../../lib/theme";

// One text field for the redesign: an input, or a textarea with as="textarea".
// 16px always: below that iOS Safari zooms the page on focus. The focus ring is
// a class rule in ui.css; every other prop (value, onChange, placeholder,
// autoComplete, onKeyDown) passes straight through.
const base = { width: "100%", boxSizing: "border-box", border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", fontSize: 16, lineHeight: 1.35, outline: "none", fontFamily: "inherit", color: C.ink, background: C.card };

const Field = React.forwardRef(function Field({ as: Tag = "input", className = "", style, ...rest }, ref) {
  return <Tag ref={ref} className={`uiField ${className}`.trim()} style={{ ...base, ...(Tag === "textarea" ? { resize: "vertical" } : null), ...style }} {...rest} />;
});

export default Field;

// What went wrong with a form, shown under its fields.
export function FieldError({ style, children }) {
  return <div style={{ background: "rgba(148,91,59,.10)", color: C.coral, padding: "10px 12px", borderRadius: 12, fontSize: 13.5, fontWeight: 500, lineHeight: 1.4, ...style }}>{children}</div>;
}
