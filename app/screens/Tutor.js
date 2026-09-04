"use client";

import React from "react";
import { C } from "../lib/theme";
import { statusOf, growthLabel, canopyColor } from "../lib/ai";
import Tree from "../components/Tree";
import { Shell, Logo } from "../components/Shell";
import Icon from "../components/Icon";

export default function Tutor({ g }) {
  const { active, activeId, busy, chat, failed, input, leaveSession, nextConcept, phase, queue, scrollRef, send, sessionPos, sessionTotal, setInput, startConcept } = g;
    const done = phase === "done";
    const lastTutor = [...chat].reverse().find((m) => m.who === "tutor");
    const opts = !done && !busy && lastTutor && Array.isArray(lastTutor.options) ? lastTutor.options : [];
    const twoUp = opts.length === 2;
    return (
      <Shell>
        <div className="fullvh" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 18px 12px", background: C.card, borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={leaveSession} style={{ border: "none", background: C.soft, color: C.primaryDeep, borderRadius: 10, padding: "7px 12px", cursor: "pointer", fontWeight: 800, fontSize: 13 }}>← Back to my grove</button>
              <div style={{ color: C.sub, fontSize: 13, fontWeight: 700, textAlign: "right" }}>
                <div>Tree {sessionPos.current + 1} of {sessionTotal.current}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.stone }}>about 3 to 5 questions</div>
              </div>
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: C.bg, borderRadius: 12, padding: 2 }}><Tree days={active ? active.days : 0} mastery={active ? active.mastery : 0} width={44} /></div>
              <div style={{ flex: 1 }}>
                <div className="disp" style={{ fontSize: 18, fontWeight: 600 }}>{active ? active.name : ""}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginTop: 2 }}>
                  {active ? `${growthLabel(active.days, active.mastery)} · ${statusOf(active.mastery)}` : ""}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 4 }}>
              {[["question", "Question"], ["hint", "Hint"], ["explain", "Explain"], ["check", "Say it back"], ["done", "Done"]].map(([k, label], i) => {
                const order = ["question", "hint", "explain", "check", "done"];
                const cur = order.indexOf(phase), me = order.indexOf(k);
                const on = me <= cur;
                return (
                  <div key={k} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ height: 4, borderRadius: 999, background: on ? C.primary : C.line }} />
                    <div style={{ marginTop: 3, fontSize: 9.5, fontWeight: 800, letterSpacing: ".02em", color: me === cur ? C.primaryDeep : C.sub }}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {chat.map((m, i) =>
              m.who === "tutor" ? (
                <div key={i} className="fadeUp" style={{ alignSelf: "flex-start", maxWidth: "86%", display: "flex", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="tree" size={15} color="#FCEFE4" /></div>
                  <div style={{ background: C.card, padding: "12px 14px", borderRadius: "4px 16px 16px 16px", boxShadow: "0 3px 10px rgba(58,42,32,.06)", fontSize: 15, lineHeight: 1.45 }}>
                    {m.phase && m.phase !== "question" && m.phase !== "done" && (
                      <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: C.primary, marginBottom: 4 }}>{m.phase === "check" ? "your turn" : m.phase}</span>
                    )}
                    <div>{m.text}</div>
                  </div>
                </div>
              ) : (
                <div key={i} className="fadeUp" style={{ alignSelf: "flex-end", maxWidth: "86%", background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", padding: "12px 14px", borderRadius: "16px 4px 16px 16px", fontSize: 15, lineHeight: 1.45 }}>{m.text}</div>
              )
            )}
            {busy && (
              <div style={{ alignSelf: "flex-start", display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, display: "grid", placeItems: "center" }}><Icon name="tree" size={15} color="#FCEFE4" /></div>
                <div style={{ background: C.card, padding: "13px 16px", borderRadius: 16, boxShadow: "0 3px 10px rgba(58,42,32,.06)", color: C.sub, fontSize: 20, letterSpacing: 2 }}>···</div>
              </div>
            )}
          </div>

          <div style={{ padding: "12px 14px", paddingBottom: "max(16px, env(safe-area-inset-bottom))", background: C.card, borderTop: `1px solid ${C.line}` }}>
            {failed ? (
              <button onClick={() => startConcept(activeId)} style={{ width: "100%", border: "none", cursor: "pointer", padding: 16, borderRadius: 16, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", fontWeight: 800, fontSize: 16 }}>
                Try again
              </button>
            ) : done ? (
              <button onClick={nextConcept} className="pop" style={{ width: "100%", border: "none", cursor: "pointer", padding: 16, borderRadius: 16, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", fontWeight: 800, fontSize: 16, boxShadow: "0 8px 20px rgba(120,66,37,.36)" }}>
                {queue.length > 1 ? "Next tree" : "Back to my grove"}
              </button>
            ) : opts.length ? (
              <>
                <div style={{ display: twoUp ? "flex" : "block", gap: 8 }}>
                  {opts.map((o, i) => (
                    <button key={i} onClick={() => send(o)} disabled={busy} style={{ display: "block", width: "100%", marginBottom: twoUp ? 0 : 8, flex: twoUp ? 1 : undefined, border: `1.5px solid ${C.line}`, background: C.bg, borderRadius: 14, padding: "13px 15px", fontWeight: 700, fontSize: 15, color: C.ink, textAlign: twoUp ? "center" : "left", cursor: busy ? "default" : "pointer" }}>{o}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 18, marginTop: 10, justifyContent: "center" }}>
                  <button onClick={() => send("Can I get a hint?")} disabled={busy} style={{ border: "none", background: "transparent", padding: 4, fontWeight: 700, fontSize: 13, color: C.primaryDeep, cursor: busy ? "default" : "pointer", textDecoration: "underline" }}>Hint</button>
                  <button onClick={() => send("I don't know")} disabled={busy} style={{ border: "none", background: "transparent", padding: 4, fontWeight: 700, fontSize: 13, color: C.sub, cursor: busy ? "default" : "pointer", textDecoration: "underline" }}>I don't know</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Type your answer…" disabled={busy} style={{ flex: 1, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "13px 15px", fontSize: 15, outline: "none", fontFamily: "inherit", background: C.bg }} />
                  <button onClick={() => send()} disabled={busy || !input.trim()} style={{ border: "none", cursor: busy || !input.trim() ? "default" : "pointer", width: 50, borderRadius: 14, background: input.trim() && !busy ? C.primary : C.line, color: "#FCEFE4", fontSize: 20, fontWeight: 800, display: "grid", placeItems: "center" }} aria-label="Send"><Icon name="arrowUp" size={19} color="#FCEFE4" /></button>
                </div>
                <div style={{ display: "flex", gap: 18, marginTop: 10, justifyContent: "center" }}>
                  <button onClick={() => send("Can I get a hint?")} disabled={busy} style={{ border: "none", background: "transparent", padding: 4, fontWeight: 700, fontSize: 13, color: C.primaryDeep, cursor: busy ? "default" : "pointer", textDecoration: "underline" }}>Hint</button>
                  <button onClick={() => send("I don't know")} disabled={busy} style={{ border: "none", background: "transparent", padding: 4, fontWeight: 700, fontSize: 13, color: C.sub, cursor: busy ? "default" : "pointer", textDecoration: "underline" }}>I don't know</button>
                </div>
              </>
            )}
          </div>
        </div>
      </Shell>
    );
}
