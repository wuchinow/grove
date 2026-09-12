"use client";

import React from "react";
import { C } from "../../lib/theme";
import Tree from "../../components/Tree";
import Icon from "../../components/Icon";
import { Card, Segbar, bandColor, ago } from "../ui";

const LS_KEY = "grove_admin_users_density";
// Default when nothing is stored yet: large on desktop, compact under
// 768px. One innerWidth check at mount is enough - no resize listener.
function readDensity() {
  try {
    const v = window.localStorage.getItem(LS_KEY);
    if (v === "large" || v === "compact") return v;
    return window.innerWidth < 768 ? "compact" : "large";
  } catch { return "large"; }
}
function writeDensity(v) {
  try { window.localStorage.setItem(LS_KEY, v); } catch {}
}

const SORTS = [
  { value: "lastActive", label: "Last active" },
  { value: "username", label: "Username" },
  { value: "groves", label: "Groves" },
  { value: "concepts", label: "Concepts" },
  { value: "mastery", label: "Mastery" },
];

function Avatar({ s, size = 36 }) {
  const initial = (s.username || s.student_id || "?").charAt(0).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: 999, flexShrink: 0, background: s.avatar ? C.card : `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", display: "grid", placeItems: "center", fontWeight: 800, fontSize: size * 0.4, fontFamily: "'Fraunces',Georgia,serif", overflow: "hidden", border: `1px solid ${C.line}` }}>
      {s.avatar ? <img src={s.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
    </div>
  );
}

export default function UsersPage() {
  const [state, setState] = React.useState("loading"); // loading | ok | error
  const [data, setData] = React.useState({ students: [], orphans: [] });
  const [open, setOpen] = React.useState(null);
  const [query, setQuery] = React.useState("");
  const [sortField, setSortField] = React.useState("lastActive");
  const [sortDir, setSortDir] = React.useState("desc");
  const [density, setDensity] = React.useState("large");

  React.useEffect(() => { setDensity(readDensity()); }, []);

  async function load() {
    try {
      const r = await fetch("/api/admin/students", { cache: "no-store" });
      if (!r.ok) { setState("error"); return; }
      setData(await r.json());
      setState("ok");
    } catch { setState("error"); }
  }
  React.useEffect(() => { load(); }, []);

  function setDensityAndStore(v) {
    setDensity(v);
    writeDensity(v);
  }

  if (state === "loading") return <div style={{ color: C.sub, fontWeight: 700 }}>Loading</div>;
  if (state === "error") return <div style={{ color: "#9A4A28", fontWeight: 700 }}>Couldn't load users. Check the server logs.</div>;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? data.students.filter((s) => (s.username || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q))
    : data.students;

  const masteryScore = (s) => (s.concepts > 0 ? (s.flourishing * 100 + s.gettingThere * 50) / s.concepts : -1);
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === "username") cmp = (a.username || a.student_id).localeCompare(b.username || b.student_id);
    else if (sortField === "groves") cmp = a.groves.length - b.groves.length;
    else if (sortField === "concepts") cmp = a.concepts - b.concepts;
    else if (sortField === "mastery") cmp = masteryScore(a) - masteryScore(b);
    else cmp = new Date(a.lastActive || a.updated_at || 0) - new Date(b.lastActive || b.updated_at || 0);
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div className="disp" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.1 }}>Users ({data.students.length})</div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setDensityAndStore("large")} aria-label="Large rows" style={{ border: `1.5px solid ${C.line}`, background: density === "large" ? C.soft : "transparent", color: C.primaryDeep, width: 34, height: 34, borderRadius: 10, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="grid" size={16} /></button>
          <button onClick={() => setDensityAndStore("compact")} aria-label="Compact rows" style={{ border: `1.5px solid ${C.line}`, background: density === "compact" ? C.soft : "transparent", color: C.primaryDeep, width: 34, height: 34, borderRadius: 10, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="list" size={16} /></button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, alignItems: "center" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or email"
          style={{ border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", background: C.bg, flex: "1 1 200px", minWidth: 0 }}
        />
        <select value={sortField} onChange={(e) => setSortField(e.target.value)} style={{ border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "9px 11px", fontSize: 13.5, fontFamily: "inherit", background: C.bg }}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} style={{ border: `1.5px solid ${C.line}`, background: "transparent", color: C.primaryDeep, borderRadius: 12, padding: "9px 12px", cursor: "pointer", fontWeight: 800, fontSize: 13 }}>{sortDir === "asc" ? "↑ Asc" : "↓ Desc"}</button>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {sorted.length === 0 && <div style={{ padding: "16px 18px", color: C.sub, fontSize: 13.5 }}>No users match.</div>}
          {sorted.map((s, idx) => (
            <div key={s.student_id} style={{ padding: density === "compact" ? "10px 16px" : "14px 18px", borderTop: idx === 0 ? "none" : `1px solid ${C.line}` }}>
              {density === "compact" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar s={s} size={28} />
                  <span style={{ fontWeight: 800, fontSize: 13.5, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.username || s.student_id}</span>
                  <span style={{ fontSize: 12, color: C.sub, fontWeight: 700, whiteSpace: "nowrap" }}>{ago(s.lastActive || s.updated_at)}</span>
                  <button onClick={() => setOpen(open === s.student_id ? null : s.student_id)} style={{ border: "none", background: "transparent", color: C.primaryDeep, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, padding: 0, whiteSpace: "nowrap" }}>{open === s.student_id ? "Hide" : "Details"}</button>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <Avatar s={s} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 14.5 }}>{s.username || s.student_id}</span>
                        {s.role === "admin" && <span style={{ fontSize: 10.5, background: C.soft, color: C.primaryDeep, padding: "2px 7px", borderRadius: 999, fontWeight: 800 }}>admin</span>}
                      </div>
                      {s.email && <div style={{ fontSize: 12, color: C.sub }}>{s.email}</div>}
                    </div>
                    <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 800, color: s.claimed ? C.sageDeep : C.sub, background: s.claimed ? C.soft : "transparent", border: s.claimed ? "none" : `1px solid ${C.line}`, padding: "3px 9px", borderRadius: 999 }}>{s.claimed ? "Signed up" : "Beta link"}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 12.5, color: C.sub, fontWeight: 700, marginTop: 8 }}>
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
                </>
              )}
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
                            <span style={{ color: C.sub }}>{g.concepts} concepts &middot; {g.sessions} sessions &middot; {ago(g.updated_at)}</span>
                          </div>
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
                      {s.email && density === "compact" && <div style={{ fontSize: 12.5, color: C.sub, marginTop: 4 }}>{s.email}</div>}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.sub, marginBottom: 6 }}>INSIGHTS THE TUTOR HAS SAVED</div>
                      {s.insights.length === 0 && <div style={{ fontSize: 13, color: C.sub }}>None yet.</div>}
                      {[...s.insights].reverse().slice(0, 6).map((x, i) => (
                        <div key={i} style={{ fontSize: 12.5, padding: "5px 0", borderBottom: `1px solid ${C.line}` }}>
                          <span style={{ fontWeight: 800 }}>{x.concept}</span> <span style={{ color: C.sub }}>&middot; {ago(x.at)}</span>
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
      </div>
    </>
  );
}
