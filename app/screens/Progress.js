"use client";

import React from "react";
import { C } from "../lib/theme";
import { statusOf, growthLabel, canopyColor } from "../lib/ai";
import Tree from "../components/Tree";
import { Shell, Logo } from "../components/Shell";
import Icon from "../components/Icon";

export default function Progress({ g }) {
  const { concepts, profile, setScreen, startSession, studyEverything } = g;
    const total = concepts.length;
    const sessions = concepts.reduce((n, c) => n + (c.days || 0), 0);
    const flourishing = concepts.filter((c) => c.mastery >= 85).length;
    const solid = concepts.filter((c) => c.mastery >= 75).length;
    const needs = [...concepts].filter((c) => c.mastery < 40).sort((a, b) => a.mastery - b.mastery);
    const strong = [...concepts].filter((c) => c.mastery >= 60).sort((a, b) => b.mastery - a.mastery).slice(0, 3);
    const young = /^(4|5|6|7|8)/.test((profile && profile.grade) || "");

    const headline = () => {
      if (!total) return young ? "Nothing planted yet" : "Nothing here yet";
      if (sessions === 0) return young ? "Your trees are waiting" : `${total} ${total === 1 ? "concept" : "concepts"} ready to work on`;
      if (solid >= Math.ceil(total * 0.6)) return young ? "You really know this stuff" : "You're on top of most of this";
      if (sessions >= 5) return young ? "Look how much you've done" : `${sessions} sessions in`;
      return young ? "Good start" : "Off to a start";
    };
    const note = () => {
      if (!total) return "Add a photo of what you're studying and Grove will pull out the key ideas.";
      if (sessions === 0) return `You've planted ${total} ${total === 1 ? "concept" : "concepts"}. Tend one to get going.`;
      const parts = [`You've finished ${sessions} ${sessions === 1 ? "session" : "sessions"} across ${total} ${total === 1 ? "concept" : "concepts"}.`];
      if (flourishing) parts.push(`${flourishing} ${flourishing === 1 ? "is" : "are"} flourishing.`);
      if (needs.length) parts.push(`${needs.length} could use another pass, and that's where a few minutes goes furthest.`);
      else if (solid === total) parts.push("Nothing is lagging behind right now.");
      return parts.join(" ");
    };

    const Stat = ({ n, label, color }) => (
      <div style={{ flex: 1, minWidth: 0, background: C.card, borderRadius: 16, padding: "14px 8px", textAlign: "center", border: `1px solid ${C.line}`, boxShadow: "0 4px 14px rgba(58,42,32,.07)" }}>
        <div className="disp" style={{ fontSize: 24, fontWeight: 700, color: color || C.ink }}>{n}</div>
        <div style={{ fontSize: 11.5, color: C.sub, fontWeight: 700, marginTop: 3, lineHeight: 1.3 }}>{label}</div>
      </div>
    );

    return (
      <Shell>
        <div style={{ padding: "20px 20px 44px", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setScreen("home")} style={{ border: "none", background: C.soft, color: C.primaryDeep, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>&larr; My grove</button>
            <Logo small />
          </div>

          <div className="fadeUp" style={{ marginTop: 22, background: `linear-gradient(150deg, ${C.card} 0%, #F4E9D6 100%)`, border: `1px solid ${C.line}`, borderRadius: 20, padding: "20px 20px 22px", boxShadow: "0 14px 30px rgba(58,42,32,.12)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="sprout" size={18} color={C.sageDeep} />
              <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: C.sageDeep }}>Where you are</div>
            </div>
            <div className="disp" style={{ fontSize: 25, fontWeight: 600, marginTop: 8, lineHeight: 1.22 }}>{headline()}</div>
            <div style={{ fontSize: 14.5, color: C.ink, opacity: 0.82, marginTop: 8, lineHeight: 1.55 }}>{note()}</div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Stat n={total} label="Concepts" />
            <Stat n={sessions} label="Sessions" />
            <Stat n={flourishing} label="Flourishing" color={C.sageDeep} />
            <Stat n={needs.length} label="Need work" color={C.coral} />
          </div>

          {strong.length > 0 && (
            <>
              <div style={{ marginTop: 26, fontSize: 14, fontWeight: 800 }}>Going well</div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {strong.map((c) => (
                  <div key={c.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 3px 12px rgba(58,42,32,.05)" }}>
                    <Tree days={c.days} mastery={c.mastery} width={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14.5 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginTop: 1 }}>{growthLabel(c.days, c.mastery)} &middot; {statusOf(c.mastery)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {needs.length > 0 && (
            <>
              <div style={{ marginTop: 24, fontSize: 14, fontWeight: 800 }}>Worth another look</div>
              <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 700, marginTop: 3, lineHeight: 1.5 }}>Tap one to start there.</div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {needs.slice(0, 4).map((c) => (
                  <button key={c.id} onClick={() => { setScreen("home"); startSession([c.id], concepts); }} style={{ textAlign: "left", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", boxShadow: "0 3px 12px rgba(58,42,32,.05)" }}>
                    <Tree days={c.days} mastery={c.mastery} width={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14.5, color: C.ink }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginTop: 1 }}>{statusOf(c.mastery)}</div>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: C.primaryDeep, flexShrink: 0 }}>Tend</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div style={{ flex: 1, minHeight: 18 }} />
          {total > 0 && (
            <button onClick={() => { setScreen("home"); studyEverything(); }} style={{ marginTop: 18, width: "100%", border: "none", cursor: "pointer", padding: 16, borderRadius: 16, background: `linear-gradient(135deg, ${C.amber}, ${C.amberDeep})`, color: "#3A2412", fontWeight: 800, fontSize: 16, boxShadow: "0 12px 26px rgba(199,125,52,.36)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Icon name="drop" size={18} color="#3A2412" /> Tend the whole grove</span>
            </button>
          )}
        </div>
      </Shell>
    );
}
