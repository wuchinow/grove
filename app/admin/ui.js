"use client";

import { C } from "../lib/theme";

// Shared building blocks for every /admin/* page - extracted from the
// original single-file dashboard so Feedback/Financials/Settings can match
// its visual language instead of duplicating it.

export function Card({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: "16px 18px", boxShadow: "0 6px 18px rgba(58,42,32,.07)", ...style }}>{children}</div>;
}

// Four headline numbers, sans-serif (the disp/Fraunces treatment stays
// reserved for page titles, not repeated fifteen times down the page).
export function KPI({ n, label, sub }) {
  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ fontSize: 30, fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>{n}</div>
      <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 700, marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 11.5, color: C.stone, fontWeight: 700, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

// A ratio against a known ceiling (active-today out of total students, etc).
export function Meter({ label, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
        <span style={{ color: C.sub }}>{label}</span>
        <span>{value} of {max}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: C.line, overflow: "hidden", marginTop: 4 }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: C.primary }} />
      </div>
    </div>
  );
}

// Proportional status bar. Segments with value 0 just don't render, so a
// student with no concepts yet doesn't get a phantom sliver of every color.
export function Segbar({ segments, height = 10 }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  if (total === 0) return <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 700 }}>No concepts yet</span>;
  return (
    <div style={{ display: "flex", gap: 2, height, borderRadius: 999, overflow: "hidden", background: C.line }}>
      {segments.filter((s) => s.value > 0).map((s, i) => (
        <div key={i} style={{ flex: `${s.value} 1 0%`, background: s.color }} />
      ))}
    </div>
  );
}

export function H({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: C.sageDeep, margin: "26px 0 10px" }}>{children}</div>;
}

// Same three bands the student app uses, so a number reads the same here as
// it does on a tree: pale under 40, mid green to 84, deep green at 85+.
export const bandColor = (m) => (m < 40 ? C.coral : m < 85 ? C.sage : C.sageDeep);

export const ago = (iso) => {
  if (!iso) return "never";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} hr ago`;
  return `${Math.round(h / 24)} days ago`;
};
