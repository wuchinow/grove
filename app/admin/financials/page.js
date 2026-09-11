"use client";

import React from "react";
import { C } from "../../lib/theme";
import { Card, H } from "../ui";

// Read-only picture: fixed costs (from settings, grouped Infrastructure /
// Tooling) + metered Anthropic spend (from the existing 30-day estimate in
// /api/admin/stats) + break-even, shown both with and without Tooling.
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

  const costs = Array.isArray(settings.fixed_costs) ? settings.fixed_costs : [];
  const infra = costs.filter((r) => r.group !== "Tooling");
  const tooling = costs.filter((r) => r.group === "Tooling");
  const sum = (rows) => rows.reduce((n, r) => n + (Number(r.amount) || 0), 0);
  const infraTotal = sum(infra);
  const toolingTotal = sum(tooling);
  const metered = stats.usage ? stats.usage.month.cost : 0;
  const totalWithoutTooling = infraTotal + metered;
  const totalWithTooling = totalWithoutTooling + toolingTotal;
  const price = settings.price_per_month || 0;
  const paying = stats.students || 0;

  return (
    <>
      <div className="disp" style={{ fontSize: 24, fontWeight: 600 }}>Financials</div>
      <H>Monthly cost</H>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5, fontWeight: 700 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.sub, textTransform: "uppercase", letterSpacing: ".04em" }}>Infrastructure</div>
          {infra.map((r) => <Row key={r.id} label={r.name} value={r.amount} />)}
          <SubtotalRow value={infraTotal} />

          <div style={{ fontSize: 12, fontWeight: 800, color: C.sub, textTransform: "uppercase", letterSpacing: ".04em", marginTop: 6 }}>Tooling</div>
          {tooling.length === 0 ? <div style={{ color: C.sub, fontWeight: 700 }}>No tooling costs yet.</div> : tooling.map((r) => <Row key={r.id} label={r.name} value={r.amount} />)}
          <SubtotalRow value={toolingTotal} />

          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 2, paddingTop: 8 }}>
            <Row label="Anthropic (metered, 30-day est.)" value={metered} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
            <span>Total, without Tooling</span><span>${totalWithoutTooling.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
            <span>Total, with Tooling</span><span>${totalWithTooling.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      <H>Break-even</H>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <BreakEvenCard title="Without Tooling" total={totalWithoutTooling} price={price} paying={paying} />
        <BreakEvenCard title="With Tooling" total={totalWithTooling} price={price} paying={paying} />
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
function SubtotalRow({ value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.line}`, paddingTop: 6, fontWeight: 800 }}>
      <span>Subtotal</span><span>${value.toFixed(2)}</span>
    </div>
  );
}

// Two facts, per the feedback item: how many students there are right now,
// and how far above (or below) break-even that puts them - not a third
// "students to break even" number to reconcile in your head.
function BreakEvenCard({ title, total, price, paying }) {
  const breakEven = price > 0 ? Math.ceil(total / price) : null;
  const diff = breakEven != null ? paying - breakEven : null;
  return (
    <Card>
      <div style={{ fontWeight: 800, fontSize: 14 }}>{title}</div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 700 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: C.sub }}>Current students</span><span>{paying}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: C.sub }}>Above break-even</span>
          <span style={{ color: diff == null ? C.sub : diff >= 0 ? C.sageDeep : C.coral }}>{diff == null ? "—" : diff >= 0 ? `+${diff}` : diff}</span>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: C.stone, fontWeight: 700, marginTop: 8 }}>{breakEven != null ? `Break-even is ${breakEven} at $${price.toFixed(2)}/mo` : "Set a price in Settings"}</div>
    </Card>
  );
}
