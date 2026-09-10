"use client";

import React from "react";
import { C, FONTS } from "../lib/theme";
import Tree from "../components/Tree";
import Icon from "../components/Icon";

// The admin dashboard. Gated server-side: every /api/admin route returns 404
// for anyone who isn't an admin, and this page shows a plain "not found" on
// that response, so nothing here reveals the dashboard exists. Wider than the
// student app on purpose; it's a desk screen, not a phone one.

const ago = (iso) => {
  if (!iso) return "never";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} hr ago`;
  return `${Math.round(h / 24)} days ago`;
};

// Same three bands the student app uses, so a number reads the same here as it
// does on a tree: pale under 40, mid green to 84, deep green at 85 and up.
const bandColor = (m) => (m < 40 ? C.coral : m < 85 ? C.sage : C.sageDeep);

function Card({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: "16px 18px", boxShadow: "0 6px 18px rgba(58,42,32,.07)", ...style }}>{children}</div>;
}
// Four headline numbers, sans-serif (the disp/Fraunces treatment stays
// reserved for the page title, not repeated fifteen times down the page).
function KPI({ n, label, sub }) {
  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ fontSize: 30, fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>{n}</div>
      <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 700, marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 11.5, color: C.stone, fontWeight: 700, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}
// A ratio against a known ceiling (active-today out of total students, etc).
function Meter({ label, value, max }) {
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
function Segbar({ segments, height = 10 }) {
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
function H({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: C.sageDeep, margin: "26px 0 10px" }}>{children}</div>;
}

export default function Admin() {
  const [state, setState] = React.useState("loading");   // loading | ok | notfound | error
  const [stats, setStats] = React.useState(null);
  const [data, setData] = React.useState({ students: [], orphans: [] });
  const [open, setOpen] = React.useState(null);
  const [linkFrom, setLinkFrom] = React.useState("");
  const [linkTo, setLinkTo] = React.useState("");
  const [linkMsg, setLinkMsg] = React.useState("");

  async function load() {
    try {
      const [a, b] = await Promise.all([fetch("/api/admin/stats", { cache: "no-store" }), fetch("/api/admin/students", { cache: "no-store" })]);
      if (a.status === 404 || b.status === 404) { setState("notfound"); return; }
      if (!a.ok || !b.ok) { setState("error"); return; }
      setStats(await a.json()); setData(await b.json()); setState("ok");
    } catch { setState("error"); }
  }
  React.useEffect(() => { load(); }, []);

  async function link() {
    setLinkMsg("");
    const r = await fetch("/api/admin/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: linkFrom, to: linkTo }) });
    const j = await r.json().catch(() => ({}));
    setLinkMsg(r.ok ? `Moved ${linkFrom} into ${linkTo}.` : (j.error || "Couldn't link."));
    if (r.ok) { setLinkFrom(""); setLinkTo(""); load(); }
  }

  const shell = (inner) => (
    <div className="nunito minvh" style={{ background: C.bg, color: C.ink, fontFamily: "'Nunito',sans-serif" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 20px 60px" }}>{inner}</div>
    </div>
  );

  if (state === "loading") return shell(<div style={{ color: C.sub, fontWeight: 700 }}>Loading</div>);
  if (state === "notfound") return shell(<div className="disp" style={{ fontSize: 22 }}>Not found</div>);
  if (state === "error") return shell(<div style={{ color: "#9A4A28", fontWeight: 700 }}>Couldn't load the dashboard. Check the server logs.</div>);

  const unclaimed = data.students.filter((s) => !s.claimed);
  const claimedIds = data.students.filter((s) => s.claimed).map((s) => s.student_id);
  const b = stats.mastery.buckets, maxB = Math.max(1, ...b);

  return shell(
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, display: "grid", placeItems: "center" }}><Icon name="chart" size={18} color="#FCEFE4" /></div>
          <div>
            <div className="disp" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.1 }}>Grove dashboard</div>
            <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 700 }}>{stats.me ? `Signed in as ${stats.me.username || stats.me.student_id} · admin` : "Admin"} · live from Supabase</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 13px", borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.card, color: C.primaryDeep, fontWeight: 800, fontSize: 13 }}>&larr; Back to Grove</a>
          <button onClick={load} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 13px", borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.card, color: C.primaryDeep, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Refresh</button>
        </div>
      </div>

      <H>Right now</H>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <KPI n={stats.students} label="Students" sub={`${stats.claimed} with accounts`} />
        <KPI n={stats.groves} label="Groves" />
        <KPI n={stats.concepts} label="Concepts planted" sub={`${stats.mastery.untouched} never tended`} />
        <KPI n={stats.sessions} label="Sessions finished" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 12 }}>
        <Card>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Engagement</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
            <Meter label="Active today" value={stats.activeToday} max={stats.students} />
            <Meter label="Active last 7 days" value={stats.activeWeek} max={stats.students} />
            <Meter label="Active last 30 days" value={stats.activeMonth} max={stats.students} />
          </div>
          <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginTop: 12 }}>{stats.newThisWeek} of {stats.students} students joined this week.</div>
        </Card>
        <Card>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Concept health</div>
          <div style={{ marginTop: 14 }}>
            <Segbar height={14} segments={[
              { value: stats.mastery.flourishing, color: C.sageDeep },
              { value: stats.mastery.gettingThere, color: C.sage },
              { value: stats.mastery.needsWork, color: C.coral },
            ]} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 10, fontSize: 12.5, fontWeight: 700 }}>
            <span style={{ color: C.sageDeep }}>Flourishing {stats.mastery.flourishing}</span>
            <span style={{ color: C.sage }}>Getting there {stats.mastery.gettingThere}</span>
            <span style={{ color: C.coral }}>Need work {stats.mastery.needsWork}</span>
          </div>
          <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginTop: 10 }}>{stats.mastery.untouched} of those {stats.concepts} concepts have never had a session. Some overlap with need work above.</div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginTop: 12 }}>
        <Card>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Mastery across every concept</div>
          <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginTop: 2 }}>All {stats.concepts} concepts, tended and untended</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 110, marginTop: 14 }}>
            {b.map((n, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.sub }}>{n}</div>
                <div style={{ height: Math.max(3, Math.round((n / maxB) * 80)), background: i >= 4 ? C.sageDeep : i >= 2 ? C.sage : C.stone, borderRadius: "6px 6px 2px 2px", marginTop: 4 }} />
                <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 700, marginTop: 4 }}>{["0-19", "20-39", "40-59", "60-79", "80+"][i]}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Tended but still struggling</div>
          <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginTop: 2 }}>Concepts with at least one session and mastery under 40</div>
          {stats.struggling.length === 0 ? <div style={{ color: C.sub, fontSize: 13, marginTop: 12 }}>None right now.</div> : (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {stats.struggling.map((x, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</span>
                  <span style={{ color: C.coral, flexShrink: 0, marginLeft: 10 }}>{x.mastery} · {x.reviews} {x.reviews === 1 ? "session" : "sessions"}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <H>Students</H>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {data.students.map((s, idx) => (
          <div key={s.student_id} style={{ padding: "14px 18px", borderTop: idx === 0 ? "none" : `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 14.5 }}>{s.username || s.student_id}</span>
              {s.role === "admin" && <span style={{ fontSize: 10.5, background: C.soft, color: C.primaryDeep, padding: "2px 7px", borderRadius: 999, fontWeight: 800 }}>admin</span>}
              {stats.me && s.student_id === stats.me.student_id && <span style={{ fontSize: 10.5, background: C.sageDeep, color: "#FCEFE4", padding: "2px 7px", borderRadius: 999, fontWeight: 800 }}>you</span>}
              <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 800, color: s.claimed ? C.sageDeep : C.sub, background: s.claimed ? C.soft : "transparent", border: s.claimed ? "none" : `1px solid ${C.line}`, padding: "3px 9px", borderRadius: 999 }}>{s.claimed ? "Signed up" : "Beta link"}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 12.5, color: C.sub, fontWeight: 700, marginTop: 6 }}>
              {s.grade && <span>Grade {s.grade}</span>}
              <span>{s.groves.length} {s.groves.length === 1 ? "grove" : "groves"}</span>
              <span>{s.concepts} concepts</span>
              <span>{s.sessions} {s.sessions === 1 ? "session" : "sessions"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 9 }}>
              <div style={{ flex: 1, minWidth: 80 }}>
                <Segbar segments={[
                  { value: s.flourishing, color: C.sageDeep },
                  { value: s.gettingThere, color: C.sage },
                  { value: s.needsWork, color: C.coral },
                ]} />
              </div>
              <span style={{ fontSize: 12, color: C.sub, fontWeight: 700, whiteSpace: "nowrap" }}>{ago(s.lastActive || s.updated_at)}</span>
              <button onClick={() => setOpen(open === s.student_id ? null : s.student_id)} style={{ border: "none", background: "transparent", color: C.primaryDeep, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, padding: 0, whiteSpace: "nowrap" }}>{open === s.student_id ? "Hide" : "Details"}</button>
            </div>
            {open === s.student_id && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.sub, marginBottom: 6 }}>GROVES</div>
                    {s.groves.length === 0 && <div style={{ fontSize: 13, color: C.sub }}>None yet.</div>}
                    {s.groves.map((g) => (
                      <div key={g.id} style={{ padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                          <Tree days={Math.min(5, g.sessions)} mastery={g.concepts ? 60 : 0} width={22} />
                          <span style={{ fontWeight: 700, flex: 1 }}>{g.name}</span>
                          <span style={{ color: C.sub }}>{g.concepts} concepts · {g.sessions} sessions · {ago(g.updated_at)}</span>
                        </div>
                        {/* Weakest first: the ones worth looking at are at the top. */}
                        {(g.items || []).length > 0 && (
                          <div style={{ marginTop: 5, marginLeft: 30, display: "flex", flexDirection: "column", gap: 3 }}>
                            {g.items.map((c, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5 }}>
                                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                                <span style={{ color: C.stone, flexShrink: 0 }}>{c.days === 0 ? "never tended" : `${c.days} ${c.days === 1 ? "session" : "sessions"}`}</span>
                                <span style={{ color: bandColor(c.mastery), fontWeight: 800, flexShrink: 0, minWidth: 26, textAlign: "right" }}>{c.mastery}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {s.interests.length > 0 && <div style={{ fontSize: 12.5, color: C.sub, marginTop: 8 }}>Into: {s.interests.join(", ")}</div>}
                    {s.email && <div style={{ fontSize: 12.5, color: C.sub, marginTop: 4 }}>{s.email}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.sub, marginBottom: 6 }}>INSIGHTS THE TUTOR HAS SAVED</div>
                    {s.insights.length === 0 && <div style={{ fontSize: 13, color: C.sub }}>None yet.</div>}
                    {[...s.insights].reverse().slice(0, 6).map((x, i) => (
                      <div key={i} style={{ fontSize: 12.5, padding: "5px 0", borderBottom: `1px solid ${C.line}` }}>
                        <span style={{ fontWeight: 800 }}>{x.concept}</span> <span style={{ color: C.sub }}>· {ago(x.at)}</span>
                        <div style={{ marginTop: 2, lineHeight: 1.45 }}>{x.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>

      {stats.usage && (
        <>
          <H>API usage &amp; cost</H>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <KPI n={stats.usage.today.calls} label="Calls today" sub={`$${stats.usage.today.cost.toFixed(2)} est.`} />
            <KPI n={stats.usage.week.calls} label="Calls, 7 days" sub={`$${stats.usage.week.cost.toFixed(2)} est.`} />
            <KPI n={stats.usage.month.calls} label="Calls, 30 days" sub={`$${stats.usage.month.cost.toFixed(2)} est.`} />
            <KPI n={stats.usage.failedCalls} label="Failed calls" sub="last 30 days" />
          </div>
          <div style={{ marginTop: 12 }}>
            <Card>
              <div style={{ fontWeight: 800, fontSize: 14 }}>By call type, last 30 days</div>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginTop: 2 }}>Estimated from Haiku 4.5 list pricing ($1 / $5 per million input / output tokens); actual billing may run a little lower with caching.</div>
              {Object.keys(stats.usage.byKind).length === 0 ? (
                <div style={{ color: C.sub, fontSize: 13, marginTop: 12 }}>No calls logged yet.</div>
              ) : (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {Object.entries(stats.usage.byKind).map(([kind, v]) => (
                    <div key={kind} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                      <span style={{ textTransform: "capitalize" }}>{kind}</span>
                      <span style={{ color: C.sub }}>{v.calls} {v.calls === 1 ? "call" : "calls"} &middot; ${v.cost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {(unclaimed.length > 0 || data.orphans.length > 0) && (
        <>
          <H>Attach an old grove to an account</H>
          <Card>
            <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.5 }}>
              A beta user who signs up with their old name gets their trees automatically. If they picked a different name, move the old record into the new account here. The old record goes away.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
              <select value={linkFrom} onChange={(e) => setLinkFrom(e.target.value)} style={{ border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", background: C.bg }}>
                <option value="">Old record</option>
                {unclaimed.map((s) => <option key={s.student_id} value={s.student_id}>{s.student_id} ({s.groves.length} groves)</option>)}
                {data.orphans.map((s) => <option key={s.student_id} value={s.student_id}>{s.student_id} (orphaned, {s.groves.length} groves)</option>)}
              </select>
              <span style={{ color: C.sub, fontWeight: 800 }}>&rarr;</span>
              <select value={linkTo} onChange={(e) => setLinkTo(e.target.value)} style={{ border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", background: C.bg }}>
                <option value="">Account</option>
                {claimedIds.map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
              <button onClick={link} disabled={!linkFrom || !linkTo} style={{ border: "none", cursor: linkFrom && linkTo ? "pointer" : "default", padding: "10px 16px", borderRadius: 12, background: linkFrom && linkTo ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : C.line, color: "#FCEFE4", fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>Attach</button>
              {linkMsg && <span style={{ fontSize: 13, fontWeight: 700, color: linkMsg.startsWith("Moved") ? C.sageDeep : "#9A4A28" }}>{linkMsg}</span>}
            </div>
          </Card>
        </>
      )}

      <div style={{ marginTop: 28, fontSize: 12, color: C.stone, lineHeight: 1.5 }}>
        Traffic (page views, referrers, devices) lives in Vercel Analytics.
      </div>
    </>
  );
}
