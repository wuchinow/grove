"use client";

import React from "react";
import { C } from "../lib/theme";
import { statusOf, growthLabel, canopyColor } from "../lib/ai";
import { stageOf, STAGE_MAX, STAGE_NAMES } from "../lib/growth";
import Tree from "../components/Tree";
import { Shell, Logo } from "../components/Shell";
import Icon from "../components/Icon";
import Card from "../components/ui/Card";
import PillButton from "../components/ui/PillButton";
import { Eyebrow } from "../components/ui/ModalCard";

export default function Progress({ g }) {
  const { concepts, profile, setScreen, startSession, studyEverything } = g;
    const total = concepts.length;
    const sessions = concepts.reduce((n, c) => n + (c.days || 0), 0);
    // Trees at the top stage, named by growth.js so the label follows the stage list.
    const topStage = STAGE_NAMES[STAGE_MAX];
    const fullGrown = concepts.filter((c) => stageOf(c.days) === STAGE_MAX).length;
    const solid = concepts.filter((c) => c.mastery >= 75).length;
    const needs = [...concepts].filter((c) => c.mastery < 40).sort((a, b) => a.mastery - b.mastery);
    const strong = [...concepts].filter((c) => c.mastery >= 60).sort((a, b) => b.mastery - a.mastery).slice(0, 3);
    const young = /^(4|5|6|7|8)/.test((profile && profile.grade) || "");

    const headline = () => {
      if (!total) return young ? "Nothing planted yet" : "Nothing here yet";
      if (sessions === 0) return young ? "Your trees are waiting" : `${total} ${total === 1 ? "concept" : "concepts"} ready to work on`;
      if (solid >= Math.ceil(total * 0.6)) return young ? "You really know this stuff" : "You're on top of most of this";
      if (sessions >= 5) return young ? "Look how much you've done" : `${sessions} sessions in`;
      return young ? "Good start" : "A good start";
    };
    const note = () => {
      if (!total) return "Add a photo of what you're studying and Grove will pull out the key ideas.";
      if (sessions === 0) return `You've planted ${total} ${total === 1 ? "concept" : "concepts"}. Tend one to get going.`;
      const parts = [`You've finished ${sessions} ${sessions === 1 ? "session" : "sessions"} across ${total} ${total === 1 ? "concept" : "concepts"}.`];
      if (fullGrown) parts.push(`${fullGrown} ${fullGrown === 1 ? "is" : "are"} ${topStage.toLowerCase()}.`);
      if (needs.length) parts.push(`${needs.length} could use another pass. A few minutes there goes furthest.`);
      else if (solid === total) parts.push("Nothing is lagging behind right now.");
      return parts.join(" ");
    };

    const Stat = ({ n, label, color }) => (
      <Card style={{ flex: 1, minWidth: 0, padding: "14px 6px 12px", textAlign: "center" }}>
        <div className="disp" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.1, color: color || C.ink }}>{n}</div>
        <div style={{ fontSize: 11.5, color: C.sub, marginTop: 4, lineHeight: 1.3, whiteSpace: "nowrap" }}>{label}</div>
      </Card>
    );

    return (
      <Shell>
        <div style={{ padding: "18px 18px 40px", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PillButton variant="quiet" size="sm" onClick={() => setScreen("home")} style={{ flexShrink: 0 }}>&larr; My grove</PillButton>
            <Logo small />
          </div>

          <Card className="fadeUp" style={{ marginTop: 22, borderRadius: 20, padding: "20px 20px 22px", background: `linear-gradient(160deg, ${C.card} 30%, ${C.soft} 140%)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="sprout" size={16} color={C.sageDeep} />
              <Eyebrow style={{ color: C.sageDeep }}>Where you are</Eyebrow>
            </div>
            <div className="disp" style={{ fontSize: 28, fontWeight: 500, marginTop: 10, lineHeight: 1.2 }}>{headline()}</div>
            <div style={{ fontSize: 14.5, color: C.sub, marginTop: 8, lineHeight: 1.6 }}>{note()}</div>
          </Card>

          <div className="progressStats" style={{ marginTop: 14 }}>
            <Stat n={total} label="Concepts" />
            <Stat n={sessions} label="Sessions" />
            <Stat n={fullGrown} label={topStage} color={C.sageDeep} />
            <Stat n={needs.length} label="Need work" color={C.coral} />
          </div>

          {strong.length > 0 && (
            <>
              <div style={{ marginTop: 26, fontSize: 14.5, fontWeight: 600 }}>Going well</div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {strong.map((c) => (
                  <Card key={c.id} style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <Tree days={c.days} mastery={c.mastery} width={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 15 }}>{c.name}</div>
                      <div style={{ fontSize: 12.5, color: C.sub, marginTop: 2 }}>{growthLabel(c.days)} &middot; {statusOf(c.mastery)}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {needs.length > 0 && (
            <>
              <div style={{ marginTop: 24, fontSize: 14.5, fontWeight: 600 }}>Worth another look</div>
              <div style={{ fontSize: 13, color: C.sub, marginTop: 3, lineHeight: 1.5 }}>Tap one to start there.</div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {needs.slice(0, 4).map((c) => (
                  <Card as="button" key={c.id} onClick={() => { setScreen("home"); startSession([c.id], concepts); }} style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <Tree days={c.days} mastery={c.mastery} width={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 15, color: C.ink }}>{c.name}</div>
                      <div style={{ fontSize: 12.5, color: C.sub, marginTop: 2 }}>{statusOf(c.mastery)}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.primary, flexShrink: 0 }}>Tend</span>
                  </Card>
                ))}
              </div>
            </>
          )}

          <div style={{ flex: 1, minHeight: 18 }} />
          {total > 0 && (
            <PillButton size="lg" full onClick={() => { setScreen("home"); studyEverything(); }} style={{ marginTop: 18 }}>
              <Icon name="drop" size={18} color="#fff" /> Tend the whole grove
            </PillButton>
          )}
        </div>
      </Shell>
    );
}
