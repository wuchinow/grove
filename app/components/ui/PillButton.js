import { C } from "../../lib/theme";

// The one button shape of the redesign: a full pill, flat colour, medium
// weight. `variant` picks the surface, `size` the height; pass size={null}
// when a class has to own the size (the Home bar shrinks below 360px, and an
// inline size would outrank its media query). Everything else (onClick,
// disabled, aria-label, title) passes straight through to the button.
const VARIANTS = {
  primary: { background: C.primary, color: "#fff", border: "1px solid transparent" },
  quiet: { background: C.soft, color: C.primary, border: "1px solid transparent" },
  outline: { background: "rgba(255,255,255,.55)", color: C.ink, border: `1px solid ${C.line}` },
  text: { background: "transparent", color: C.sub, border: "1px solid transparent" },
};
const SIZES = {
  lg: { height: 50, padding: "0 24px", fontSize: 15 },
  md: { height: 44, padding: "0 20px", fontSize: 14 },
  sm: { height: 36, padding: "0 13px", fontSize: 13 },
};

export default function PillButton({ variant = "primary", size = "md", full = false, className = "", style, children, ...rest }) {
  return (
    <button
      className={`uiPill ${className}`.trim()}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 999, fontWeight: 500, lineHeight: 1.15, whiteSpace: "nowrap", width: full ? "100%" : undefined, ...(size ? SIZES[size] : null), ...VARIANTS[variant], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
