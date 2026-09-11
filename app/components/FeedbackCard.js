"use client";

import React from "react";
import { C } from "../lib/theme";

// Same overlay pattern as AuthCard: one centred card, closes on an outside
// tap. Guests get an optional email field since they have no other identity
// on the row; signed-in/legacy students are already identified by student_id.
const field = { width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", fontSize: 16, outline: "none", fontFamily: "inherit", background: C.bg, boxSizing: "border-box" };
const primary = (on) => ({ width: "100%", border: "none", cursor: on ? "pointer" : "default", padding: 15, borderRadius: 15, background: on ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : C.line, color: "#FCEFE4", fontWeight: 800, fontSize: 15 });

export default function FeedbackCard({ g }) {
  const { screen, setFeedbackOpen, student } = g;
  const [message, setMessage] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState("idle"); // idle | sending | sent | error

  function close() {
    setFeedbackOpen(false);
    setMessage(""); setEmail(""); setStatus("idle");
  }

  async function submit() {
    const text = message.trim();
    if (!text || status === "sending") return;
    setStatus("sending");
    try {
      const r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student, email: email.trim(), message: text, page: screen }),
      });
      if (!r.ok) throw new Error("failed");
      setStatus("sent");
      setTimeout(close, 1200);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(45,28,16,.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 40 }}>
      <div onClick={(e) => e.stopPropagation()} className="fadeUp" style={{ width: "100%", maxWidth: 400, maxHeight: "88vh", overflowY: "auto", background: C.card, borderRadius: 20, padding: "20px 22px 24px", boxShadow: "0 24px 56px rgba(40,24,12,.32)" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -8, height: 26 }}>
          <button onClick={close} aria-label="Close" style={{ border: "none", background: "transparent", color: C.sub, cursor: "pointer", padding: 4, fontSize: 18, lineHeight: 1 }}>&times;</button>
        </div>

        {status === "sent" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div className="disp" style={{ fontSize: 20, fontWeight: 600 }}>Thanks, got it</div>
          </div>
        ) : (
          <>
            <div className="disp" style={{ fontSize: 22, fontWeight: 600 }}>Send feedback</div>
            <div style={{ color: C.sub, fontSize: 13.5, fontWeight: 700, marginTop: 6, lineHeight: 1.5 }}>
              Anything that felt off, or an idea worth trying. We read every one.
            </div>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                style={{ ...field, resize: "vertical", fontFamily: "inherit" }}
              />
              {!student && (
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional, if you want a reply)"
                  type="email"
                  style={field}
                />
              )}
              {status === "error" && <div style={{ color: "#9A4A28", fontSize: 13, fontWeight: 700 }}>Couldn't send that. Try again?</div>}
              <button onClick={submit} disabled={!message.trim() || status === "sending"} style={primary(!!message.trim() && status !== "sending")}>
                {status === "sending" ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
