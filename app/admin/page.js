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

function Card({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: "16px 18px", boxShadow: "0 6px 18px rgba(58,42,32,.07)", ...style }}>{children}</div>;
}
function Stat({ n, label, color }) {
  return (
    <Card style={{ flex: "1 1 120px", minWidth: 120, textAlign: "center", padding: "14px 10px" }}>
      <div className="disp" style={{ fontSize: 28, fontWeight: 700, color: color || C.ink }}>{n}</div>
      <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginTop: 2 }}>{label}</div>
    </Card>
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
            <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 700 }}>Admin · live from Supabase</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 13px", borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.card, color: C.primaryDeep, fontWeight: 800, fontSize: 13 }}>&larr; Back to Grove</a>
          <button onClick={load} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 13px", borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.card, color: C.primaryDeep, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Refresh</button>
        </div>
      </div>

      <H>Right now</H>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Stat n={stats.students} label="Students" />
        <Stat n={stats.claimed} label="With accounts" color={C.sageDeep} />
        <Stat n={stats.newThisWeek} label="New this week" />
        <Stat n={stats.activeToday} label="Active today" />
        <Stat n={stats.activeWeek} label="Active 7 days" />
        <Stat n={stats.activeMonth} label="Active 30 days" />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <Stat n={stats.groves} label="Groves" />
        <Stat n={stats.concepts} label="Concepts planted" />
        <Stat n={stats.sessions} label="Sessions finished" />
        <Stat n={stats.mastery.flourishing} label="Flourishing" color={C.sageDeep} />
        <Stat n={stats.mastery.needsWork} label="Need work" color={C.coral} />
        <Stat n={stats.mastery.untouched} label="Never tended" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginTop: 12 }}>
        <Card>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Mastery across every concept</div>
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
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: C.soft, color: C.sub, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".04em" }}>
                {["Student", "Account", "Grade", "Groves", "Concepts", "Sessions", "Flourishing", "Need work", "Last active", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 800 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <React.Fragment key={s.student_id}>
                  <tr style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ padding: "10px 12px", fontWeight: 800 }}>{s.username || s.student_id}{s.role === "admin" && <span style={{ marginLeft: 6, fontSize: 10.5, background: C.soft, color: C.primaryDeep, padding: "2px 7px", borderRadius: 999 }}>admin</span>}</td>
                    <td style={{ padding: "10px 12px", color: s.claimed ? C.sageDeep : C.sub, fontWeight: 700 }}>{s.claimed ? "Signed up" : "Beta link"}</td>
                    <td style={{ padding: "10px 12px" }}>{s.grade || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>{s.groves.length}</td>
                    <td style={{ padding: "10px 12px" }}>{s.concepts}</td>
                    <td style={{ padding: "10px 12px" }}>{s.sessions}</td>
                    <td style={{ padding: "10px 12px", color: C.sageDeep, fontWeight: 700 }}>{s.flourishing}</td>
                    <td style={{ padding: "10px 12px", color: C.coral, fontWeight: 700 }}>{s.needsWork}</td>
                    <td style={{ padding: "10px 12px", color: C.sub }}>{ago(s.lastActive || s.updated_at)}</td>
                    <td style={{ padding: "10px 12px" }}><button onClick={() => setOpen(open === s.student_id ? null : s.student_id)} style={{ border: "none", background: "transparent", color: C.primaryDeep, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>{open === s.student_id ? "Hide" : "Details"}</button></td>
                  </tr>
                  {open === s.student_id && (
                    <tr>
                      <td colSpan={10} style={{ padding: "6px 12px 16px", background: C.bg }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: C.sub, marginBottom: 6 }}>GROVES</div>
                            {s.groves.length === 0 && <div style={{ fontSize: 13, color: C.sub }}>None yet.</div>}
                            {s.groves.map((g) => (
                              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13 }}>
                                <Tree days={Math.min(5, g.sessions)} mastery={g.concepts ? 60 : 0} width={22} />
                                <span style={{ fontWeight: 700, flex: 1 }}>{g.name}</span>
                                <span style={{ color: C.sub }}>{g.concepts} concepts · {g.sessions} sessions · {ago(g.updated_at)}</span>
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
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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
        Traffic (page views, referrers, devices) lives in Vercel Analytics. Per-turn metrics arrive with the turns table in Build 2.
      </div>
    </>
  );
}
