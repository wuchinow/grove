"use client";

import React from "react";
import { C } from "../lib/theme";
import { Shell, Logo } from "../components/Shell";
import Icon from "../components/Icon";
import Card from "../components/ui/Card";
import PillButton from "../components/ui/PillButton";
import { STAGE_NAMES } from "../lib/growth";

// A full screen rather than a sheet, so it matches Progress: back top-left, room
// to read, and no button stranded at the bottom of a scrolling panel.
export default function Help({ g }) {
  const { student, profile, setEditingProfile, setFeedbackOpen, setScreen, setSetupAvatar, setSetupGrade, setSetupInterests } = g;

  const Step = ({ title, children }) => (
    <Card style={{ padding: "15px 16px" }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.6 }}>{children}</div>
    </Card>
  );

  return (
    <Shell>
      <div style={{ padding: "18px 18px 40px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <PillButton variant="quiet" size="sm" onClick={() => setScreen("home")} style={{ flexShrink: 0 }}>&larr; My grove</PillButton>
          <Logo small />
        </div>

        <div className="fadeUp" style={{ marginTop: 22 }}>
          <div className="disp" style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.2 }}>How Grove works</div>
          <div style={{ color: C.sub, fontSize: 14.5, marginTop: 8, lineHeight: 1.55 }}>Grove asks you questions instead of handing you answers. That's the whole idea.</div>
        </div>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          <Step title="1. Add what you're studying">
            Share a photo of your work, a PDF, a Word doc or a text file, or type a topic or paste a link. Grove finds the key ideas and plants a tree for each.
          </Step>
          <Step title="2. Tend a tree">
            Tap a tree to start a session on that one idea, about four or five questions. Grove asks rather than tells, gives a hint if you're stuck, then has you explain it back.
          </Step>
          <Step title="3. Finish to grow it">
            Every completed session makes that tree one stage taller: {STAGE_NAMES.slice(1).map((s) => s.toLowerCase()).join(", ")}. Seven sessions gets it to full size.
          </Step>
          <Step title="A hint costs nothing">
            Progress shows how well you know each concept: right answers raise it, wrong ones lower it slightly. A hint or an honest &ldquo;I don't know&rdquo; costs nothing, so there's no reason to guess.
          </Step>
          <Step title="No streaks, no daily quota">
            Do six sessions today and none tomorrow. The grove just reflects the work you've done.
          </Step>
          <Step title="Your original files aren't kept">
            Photos are read once to find the concepts, then discarded. For a document or a link, we keep the text we pulled out (never the original file) so you can come back and study a different part of it later.
          </Step>
        </div>

        <div style={{ flex: 1, minHeight: 20 }} />

        {student && profile && (
          <PillButton onClick={() => {
            setSetupGrade(profile.grade || "");
            const existing = Array.isArray(profile.interests) ? profile.interests : [];
            setSetupInterests([existing[0] || "", existing[1] || "", existing[2] || ""]);
            setSetupAvatar(profile.avatar || "");
            setScreen("home"); setEditingProfile(true);
          }} variant="outline" size="lg" full style={{ marginTop: 18 }}>
            <Icon name="sprout" size={16} color={C.primary} /> Edit my grade &amp; interests
          </PillButton>
        )}
        <PillButton variant="outline" size="lg" full onClick={() => setFeedbackOpen(true)} style={{ marginTop: 10 }}>
          <Icon name="feedback" size={16} color={C.primary} /> Send feedback
        </PillButton>
      </div>
    </Shell>
  );
}
