"use client";

import React from "react";
import { C } from "../../lib/theme";
import { Card, KPI, H } from "../ui";

// Read-only picture: fixed costs (from settings) + metered Anthropic spend
// (from the existing 30-day estimate in /api/admin/stats) + break-even.
// Editing the numbers happens on the Settings page.
export default function FinancialsPage() {
  const [state, setState] = React.useState("loading"); // loading | ok | error
  const [settings, setSettings] = React.useState(null);
  const [stats, setStats] = React.useState(null);

  React.useEffect(() => {
    Promise.all([fetch("/api/admin/settings", { cache: "no-store" }), fetch("/api/admin/stats", { cache: "no-store" })])
      .then(async ([a, b]) => {
        if (!a.ok || !b.ok) { setState("error"); return; }
        setSettings(await a.json()); setStats(await b.json()); setState("ok");
      })
      .catch(() => setState("error"));
  }, []);

  if (state === "loading") return <div style={{ color: C.sub, fontWeight: 700 }}>Loading</div>;
  if (state === "error") return <div style={{ color: "#9A4A28", fontWeight: 700 }}>Couldn't load financials. Check the server logs.</div>;

  const fixed = settings.fixed_costs || { supabase: 0, vercel: 0, domain: 0 };
  const fixedTotal = (fixed.supabase || 0) + (fixed.vercel || 0) + (fixed.domain || 0);
  const metered = stats.usage ? stats.usage.month.cost : 0;
  const total = fixedTotal + metered;
  const price = settings.price_per_month || 0;
  const breakEven = price > 0 ? Math.ceil(total / price) : null;
  const paying = stats.students || 0;

  return (
    <>
      <div className="disp" style={{ fontSize: 24, fontWeight: 600 }}>Financials</div>
      <H>Monthly cost</H>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5, fontWeight: 700 }}>
          <Row label="Supabase" value={fixed.supabase} />
          <Row label="Vercel" value={fixed.vercel} />
          <Row label="Domain" value={fixed.domain} />
          <Row label="Anthropic (metered, 30-day est.)" value={metered} />
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 4, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
            <span>Total</span><span>${total.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      <H>Break-even</H>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <KPI n={`$${price.toFixed(2)}`} label="Price per month" />
        <KPI n={breakEven ?? "—"} label="Students to break even" sub={price > 0 ? `at $${price.toFixed(2)}/mo` : "set a price in Settings"} />
        <KPI n={paying} label="Current students" sub={breakEven != null ? (paying >= breakEven ? "at or above break-even" : `${breakEven - paying} short`) : undefined} />
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: C.stone, lineHeight: 1.5 }}>
        Fixed costs and price are editable on Settings. Metered cost is an estimate from list pricing, same caveat as the usage section on Overview.
      </div>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: C.sub }}>{label}</span>
      <span>${(value || 0).toFixed(2)}</span>
    </div>
  );
}
