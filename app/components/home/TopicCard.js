"use client";

import Icon from "../Icon";
import ModalCard from "../ui/ModalCard";
import PillButton from "../ui/PillButton";
import Field from "../ui/Field";

// The card behind "Type a topic" in the Home bar: one field that takes a topic
// or a URL. Submitting leaves Home for the processing screen, which unmounts
// this card, so it never has to close itself.
export default function TopicCard({ g, has, onClose }) {
  const { handleStudy, setTopicText, topicText } = g;
  return (
    <ModalCard onClose={onClose}>
      <div className="disp" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.2 }}>{has ? "Study something else" : "What do you want to study?"}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Field
          autoFocus
          value={topicText}
          onChange={(e) => setTopicText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleStudy(); }}
          placeholder="A topic, or paste a URL"
          style={{ flex: 1, minWidth: 0, width: "auto" }}
        />
        <PillButton onClick={() => handleStudy()} disabled={!topicText.trim()} aria-label="Study this" style={{ width: 48, height: 48, padding: 0, flexShrink: 0 }}>
          <Icon name="arrowUp" size={19} color="#fff" />
        </PillButton>
      </div>
    </ModalCard>
  );
}
