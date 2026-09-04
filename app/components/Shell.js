import { C, FONTS } from "../lib/theme";
import Icon from "./Icon";

// ---- Layout shells (module-level so they don't remount on every keystroke) -
export function Shell({ children }) {
  return (
    <div className="nunito minvh" style={{ background: `linear-gradient(175deg, #FBF3E5 0%, #F3E7D3 38%, ${C.bg} 68%, #E2D2B8 100%)`, backgroundAttachment: "fixed", color: C.ink, display: "flex", justifyContent: "center", fontFamily: "'Nunito',sans-serif" }}>
      <style>{FONTS}</style>
      <div className="minvh" style={{ width: "100%", maxWidth: 600, display: "flex", flexDirection: "column", position: "relative" }}>{children}</div>
    </div>
  );
}
export function Logo({ small }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{ width: small ? 30 : 38, height: small ? 30 : 38, borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, display: "grid", placeItems: "center", boxShadow: "0 6px 16px rgba(120,66,37,.26)" }}>
        <Icon name="tree" size={small ? 16 : 19} color="#FCEFE4" />
      </div>
      <span className="disp" style={{ fontWeight: 600, fontSize: small ? 21 : 25, letterSpacing: "-.01em" }}>Grove</span>
    </div>
  );
}
