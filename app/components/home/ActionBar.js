"use client";

import { C } from "../../lib/theme";
import Icon from "../Icon";
import PillButton from "../ui/PillButton";

// The bar pinned to the bottom of Home. The camera is the primary action, with
// typing a topic beside it; "Tend the whole grove" takes its own row once there
// are trees, because the three labels don't fit one row on a phone. The sample
// grove can only be tended, so it shows that row alone.
//
// Typing a topic opens a card (TopicCard) rather than a field in this bar: a
// text field inside a fixed bottom bar ends up under the iOS keyboard.
// Position, blur, safe-area padding and the sizes that change below 360px are
// the .actionBar rules in ui.css.
export default function ActionBar({ g, has, onTopic }) {
  const { fileRef, preview, studyEverything } = g;
  if (preview && !has) return null;
  return (
    <div className="actionBar">
      {!preview && (
        <div className="actionBarRow">
          <PillButton size={null} className="actionBarBtn grows" onClick={() => fileRef.current && fileRef.current.click()} title="Photos, PDFs, Word docs, or text files">
            <Icon name="camera" size={18} color="#fff" /> Share your work
          </PillButton>
          <PillButton variant="quiet" size={null} className="actionBarBtn" onClick={onTopic}>
            <span className="actionBarTopicIcon"><Icon name="pencil" size={15} color={C.primary} /></span> Type a topic
          </PillButton>
        </div>
      )}
      {has && (
        <PillButton variant={preview ? "primary" : "outline"} size={null} full className="actionBarBtn" onClick={studyEverything}>
          <Icon name="drop" size={17} color={preview ? "#fff" : C.primary} /> Tend the whole grove
        </PillButton>
      )}
    </div>
  );
}
