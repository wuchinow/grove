"use client";

import { C } from "../../lib/theme";
import Icon from "../Icon";

// Two equal ways in. Typing suits "I want to understand X"; a photo
// suits "here is my worksheet". Neither is the fallback.
export default function StudyInput({ g, has }) {
  const { fileRef, handleStudy, setTopicText, topicText } = g;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 14, boxShadow: "0 10px 26px rgba(58,42,32,.10)" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 9 }}>{has ? "Study something else" : "What do you want to study?"}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={topicText}
          onChange={(e) => setTopicText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleStudy(); }}
          placeholder="A topic, or paste a URL"
          style={{ flex: 1, minWidth: 0, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "13px 15px", fontSize: 16, outline: "none", fontFamily: "inherit", background: C.bg }}
        />
        <button onClick={() => handleStudy()} disabled={!topicText.trim()} aria-label="Study this" style={{ border: "none", cursor: topicText.trim() ? "pointer" : "default", width: 50, flexShrink: 0, borderRadius: 14, background: topicText.trim() ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : C.line, color: "#FCEFE4", display: "grid", placeItems: "center" }}><Icon name="arrowUp" size={19} color="#FCEFE4" /></button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "13px 2px 12px" }}>
        <div style={{ flex: 1, height: 1, background: C.line }} />
        <div style={{ fontSize: 11, fontWeight: 800, color: C.stone, letterSpacing: ".06em" }}>OR</div>
        <div style={{ flex: 1, height: 1, background: C.line }} />
      </div>

      <button onClick={() => fileRef.current && fileRef.current.click()} style={{ width: "100%", border: `1.5px solid ${C.line}`, cursor: "pointer", textAlign: "left", padding: "13px 14px", borderRadius: 14, background: C.bg, color: C.ink, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 10, background: C.soft, flexShrink: 0 }}><Icon name="file" size={18} color={C.primaryDeep} /></span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 800 }}>Share your work</span>
          <span style={{ display: "block", fontSize: 12.5, color: C.sub, fontWeight: 700, marginTop: 1 }}>Photos, PDFs, Word docs, or text files</span>
        </span>
      </button>
    </div>
  );
}
