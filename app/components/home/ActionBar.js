"use client";

import React from "react";
import { C } from "../../lib/theme";
import Icon from "../Icon";
import PillButton from "../ui/PillButton";

// The bar pinned to the bottom of Home, always one row.
//   - An empty grove: the camera ("Share your work") is the primary action,
//     with typing a topic beside it.
//   - A grove with trees: "Tend the whole grove" is the wide primary pill, and
//     a round "+" beside it opens a small sheet holding the two ways to add
//     ("Share your work" and "Type a topic"). One row gives the scene the
//     height a second row used to take.
//   - The sample grove can only be tended, so it shows that pill alone.
//
// Typing a topic opens a card (TopicCard) rather than a field in this bar: a
// text field inside a fixed bottom bar ends up under the iOS keyboard.
// Position, blur, safe-area padding and the sizes that change below 360px are
// the .actionBar rules in ui.css.
export default function ActionBar({ g, has, onTopic }) {
  const { fileRef, preview, studyEverything } = g;
  const [addOpen, setAddOpen] = React.useState(false);
  if (preview && !has) return null;

  const share = () => { setAddOpen(false); if (fileRef.current) fileRef.current.click(); };
  const topic = () => { setAddOpen(false); onTopic(); };
  const shareButton = (cls) => (
    <PillButton size={null} className={cls} onClick={share} title="Photos, PDFs, Word docs, or text files">
      <Icon name="camera" size={18} color="#fff" /> Share your work
    </PillButton>
  );
  const topicButton = (cls) => (
    <PillButton variant="quiet" size={null} className={cls} onClick={topic}>
      <span className="actionBarTopicIcon"><Icon name="pencil" size={15} color={C.primary} /></span> Type a topic
    </PillButton>
  );

  return (
    <>
      {addOpen && (
        <>
          <div onClick={() => setAddOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 11 }} />
          <div className="actionSheet fadeUp" role="dialog" aria-label="Add to your grove">
            {shareButton("actionBarBtn")}
            {topicButton("actionBarBtn")}
          </div>
        </>
      )}
      <div className="actionBar">
        {has ? (
          <div className="actionBarRow">
            <PillButton size={null} className="actionBarBtn grows tall" onClick={studyEverything}>
              <Icon name="drop" size={17} color="#fff" /> Tend the whole grove
            </PillButton>
            {!preview && (
              <PillButton variant="quiet" size={null} className="actionBarAdd" onClick={() => setAddOpen((v) => !v)} aria-label="Add to your grove" aria-expanded={addOpen} title="Add to your grove">
                <Icon name="plus" size={20} color={C.primary} strokeWidth={2.2} />
              </PillButton>
            )}
          </div>
        ) : (
          <div className="actionBarRow">
            {shareButton("actionBarBtn grows")}
            {topicButton("actionBarBtn")}
          </div>
        )}
      </div>
    </>
  );
}
