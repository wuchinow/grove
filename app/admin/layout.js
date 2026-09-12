"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { C, FONTS } from "../lib/theme";
import Icon from "../components/Icon";

// Gated server-side by /api/admin/whoami (same requireAdmin() every other
// /api/admin/* route uses) - checked once here so none of the five pages
// need their own 404 handling. The sidebar collapses into a drawer under
// 768px (Stage 1, Sept 12) - see the scoped <style> below.
const NAV = [
  { href: "/admin", label: "Overview", icon: "chart" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/feedback", label: "Feedback", icon: "feedback" },
  { href: "/admin/financials", label: "Financials", icon: "dollar" },
  { href: "/admin/settings", label: "Settings", icon: "gear" },
];

// position/top/width/flexShrink live here, not in the div's inline style
// below: an inline style attribute always outranks a class rule, so a media
// query here could never override an inline position:"sticky" - it would
// silently stay sticky (in-flow) at every width, reserving its 200px flex
// slot even while transformed off-screen, squeezing all page content into a
// sliver and clipping it via the site-wide overflow-x:hidden safeguard.
const DRAWER_CSS = `
.adminSidebar { position: sticky; top: 22px; width: 200px; flex-shrink: 0; }
.adminMenuBtn, .adminBackdrop { display: none; }
@media (max-width: 768px) {
  .adminSidebar {
    position: fixed; top: 0; left: 0; z-index: 40;
    height: 100vh; height: 100dvh;
    transform: translateX(-104%);
    transition: transform .25s ease;
    overflow-y: auto;
    padding: 22px 20px;
  }
  /* box-shadow only while open - applied at all times it would bleed its
     blur radius past the closed drawer's off-screen transform, showing as
     a persistent sliver at the left edge even when closed. */
  .adminSidebar.open { transform: translateX(0); box-shadow: 0 18px 40px rgba(40,24,12,.28); }
  .adminMenuBtn { display: inline-flex; }
  .adminBackdrop {
    display: block; position: fixed; inset: 0; z-index: 39;
    background: rgba(20,12,6,.35);
  }
}
`;

export default function AdminLayout({ children }) {
  const [state, setState] = React.useState("loading"); // loading | ok | notfound | error
  const [me, setMe] = React.useState(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    fetch("/api/admin/whoami", { cache: "no-store" })
      .then((r) => {
        if (r.status === 404) { setState("notfound"); return null; }
        if (!r.ok) { setState("error"); return null; }
        return r.json();
      })
      .then((j) => { if (j) { setMe(j.me); setState("ok"); } })
      .catch(() => setState("error"));
  }, []);

  const shell = (inner) => (
    <div className="nunito minvh" style={{ background: C.bg, color: C.ink, fontFamily: "'Nunito',sans-serif" }}>
      {/* <style> is an HTML raw-text element: it never decodes entities, so
          React's JSX-text escaping of FONTS/DRAWER_CSS (' -> &#x27;, etc.)
          would land in the served HTML literally and force a full client
          re-render on every load - the same bug fixed in Shell.js (9c014f5),
          never applied here. dangerouslySetInnerHTML sidesteps the escaping. */}
      <style dangerouslySetInnerHTML={{ __html: FONTS }} />
      <style dangerouslySetInnerHTML={{ __html: DRAWER_CSS }} />
      {inner}
    </div>
  );

  if (state === "loading") return shell(<div style={{ padding: 22, color: C.sub, fontWeight: 700 }}>Loading</div>);
  if (state === "notfound") return shell(<div className="disp" style={{ padding: 22, fontSize: 22 }}>Not found</div>);
  if (state === "error") return shell(<div style={{ padding: 22, color: "#9A4A28", fontWeight: 700 }}>Couldn't load the dashboard. Check the server logs.</div>);

  return shell(
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 20px 60px", display: "flex", gap: 24, alignItems: "flex-start" }}>
      {mobileOpen && <div className="adminBackdrop" onClick={() => setMobileOpen(false)} />}
      <div className={"adminSidebar" + (mobileOpen ? " open" : "")} style={{ background: C.bg }}>
        <a href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 13px", borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.card, color: C.primaryDeep, fontWeight: 800, fontSize: 13 }}>&larr; Back to Grove</a>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 11, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="tree" size={16} color="#FCEFE4" /></div>
          <div style={{ minWidth: 0 }}>
            <div className="disp" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.1 }}>Grove</div>
            <div style={{ fontSize: 11, color: C.sub, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me ? `${me.username || me.student_id} · admin` : "admin"}</div>
          </div>
        </div>
        <nav style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 11, color: active ? "#FCEFE4" : C.ink, background: active ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : "transparent", fontWeight: 800, fontSize: 13.5 }}>
                <Icon name={n.icon} size={15} color={active ? "#FCEFE4" : C.primaryDeep} /> {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <button onClick={() => setMobileOpen(true)} className="adminMenuBtn" aria-label="Open menu" style={{ border: `1.5px solid ${C.line}`, background: C.card, color: C.primaryDeep, width: 36, height: 36, borderRadius: 10, cursor: "pointer", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <Icon name="menu" size={17} />
        </button>
        {children}
      </div>
    </div>
  );
}
