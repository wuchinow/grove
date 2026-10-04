import { C } from "../../lib/theme";

// Peter's card surface: white, a hairline edge, a soft corner and the faintest
// shadow. A list row, a stat, a help step or an answer choice is one of these.
// `as="button"` makes it a tappable row (left-aligned, full width); every
// other prop passes straight through.
export const CARD = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, boxShadow: "0 3px 10px rgba(31,56,36,.05)" };

export default function Card({ as: Tag = "div", style, children, ...rest }) {
  const tappable = Tag === "button" ? { display: "block", width: "100%", textAlign: "left", cursor: "pointer", color: C.ink, fontSize: "inherit" } : null;
  return <Tag style={{ ...CARD, ...tappable, ...style }} {...rest}>{children}</Tag>;
}

// The small rounded label that names what a screen is about (a subject, a page count).
export function Chip({ children, style }) {
  return <span style={{ display: "inline-block", background: C.soft, color: C.primary, padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 500, ...style }}>{children}</span>;
}
