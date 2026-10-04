import { C, FONTS, FONT_BODY } from "../lib/theme";
import Icon from "./Icon";

// ---- Layout shells (module-level so they don't remount on every keystroke) -
export function Shell({ children }) {
  return (
    <div className="minvh" style={{ background: C.bg, color: C.ink, display: "flex", justifyContent: "center", fontFamily: FONT_BODY }}>
      <style dangerouslySetInnerHTML={{ __html: FONTS }} />
      <div className="minvh" style={{ width: "100%", maxWidth: 600, display: "flex", flexDirection: "column", position: "relative" }}>{children}</div>
    </div>
  );
}
export function Logo({ small }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{ width: small ? 30 : 38, height: small ? 30 : 38, borderRadius: 999, background: C.primary, display: "grid", placeItems: "center" }}>
        <Icon name="tree" size={small ? 16 : 19} color="#fff" />
      </div>
      <span className="disp" style={{ fontWeight: 500, fontSize: small ? 22 : 26, letterSpacing: "-.03em" }}>Grove</span>
    </div>
  );
}
