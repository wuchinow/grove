"use client";

import React from "react";
import { C } from "../lib/theme";
import ModalCard from "./ui/ModalCard";
import PillButton from "./ui/PillButton";
import Field from "./ui/Field";

// Same overlay pattern as AuthCard: one centred card, closes on an outside
// tap. Guests get an optional email field since they have no other identity
// on the row; signed-in/legacy students are already identified by student_id.
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
    <ModalCard onClose={close}>
      {status === "sent" ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div className="disp" style={{ fontSize: 24, fontWeight: 500 }}>Thanks, got it</div>
        </div>
      ) : (
        <>
          <div className="disp" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.2 }}>Send feedback</div>
          <div style={{ color: C.sub, fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>
            Anything that felt off, or an idea worth trying. We read every one.
          </div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <Field
              as="textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
            />
            {!student && (
              <Field
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional, if you want a reply)"
                type="email"
              />
            )}
            {status === "error" && <div style={{ color: C.coral, fontSize: 13, fontWeight: 500 }}>Couldn't send that. Try again?</div>}
            <PillButton size="lg" full onClick={submit} disabled={!message.trim() || status === "sending"}>
              {status === "sending" ? "Sending…" : "Send"}
            </PillButton>
          </div>
        </>
      )}
    </ModalCard>
  );
}
