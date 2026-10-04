import { C } from "../../lib/theme";

// The redesign's card surfaces. ModalCard is the centred card over a dimmed
// page (sign-in, feedback, the tree card, typing a topic); PopCard is the same
// surface without the dim, for the two dropdowns under the Home header. Both
// close on an outside tap. No blur on the scrim: blur is kept to the Home bar.
const SCRIM = "rgba(20,46,39,.34)";
const SURFACE = { background: C.bg, border: "1px solid #fff" };

export function CloseButton({ onClick, style }) {
  return (
    <button onClick={onClick} aria-label="Close" className="uiClose" style={{ width: 32, height: 32, borderRadius: 999, border: "none", background: "#eef0e6", color: C.ink, display: "grid", placeItems: "center", padding: 0, fontSize: 19, lineHeight: 1, flexShrink: 0, ...style }}>&times;</button>
  );
}

// The small uppercase line above a heading.
export function Eyebrow({ children, style }) {
  return <div style={{ fontSize: 11, letterSpacing: "2.2px", textTransform: "uppercase", fontWeight: 600, color: C.sub, ...style }}>{children}</div>;
}

export default function ModalCard({ onClose, dismissable = true, maxWidth = 400, zIndex = 40, children }) {
  const close = () => { if (dismissable && onClose) onClose(); };
  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: SCRIM, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex }}>
      <div onClick={(e) => e.stopPropagation()} className="fadeUp" style={{ ...SURFACE, width: "100%", maxWidth, maxHeight: "88vh", overflowY: "auto", borderRadius: 25, padding: "16px 22px 24px", boxShadow: "0 30px 80px rgba(20,44,57,.30)" }}>
        {/* The row keeps its height when the card can't be dismissed, so the
            content starts at the same place either way. */}
        <div style={{ display: "flex", justifyContent: "flex-end", height: 32, marginRight: -6 }}>
          {dismissable && <CloseButton onClick={close} />}
        </div>
        {children}
      </div>
    </div>
  );
}

export function PopCard({ onClose, style, children }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
      <div className="fadeUp" style={{ ...SURFACE, position: "absolute", zIndex: 30, borderRadius: 20, boxShadow: "0 18px 50px rgba(20,44,57,.22), 0 0 0 1px rgba(35,72,48,.08)", ...style }}>
        {children}
      </div>
    </>
  );
}
