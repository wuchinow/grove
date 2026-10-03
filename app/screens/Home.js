"use client";

import React from "react";
import { C } from "../lib/theme";
import { Shell, Logo } from "../components/Shell";
import Icon from "../components/Icon";
import GroveSwitcher from "../components/GroveSwitcher";
import AuthCard from "../components/AuthCard";
import GroveHeader from "../components/home/GroveHeader";
import GroveScene from "../components/home/GroveScene";
import ActionBar from "../components/home/ActionBar";
import TopicCard from "../components/home/TopicCard";
import TreeCard from "../components/home/TreeCard";
import PillButton from "../components/ui/PillButton";
import Toast from "../components/ui/Toast";

export default function Home({ g }) {
  const { activeGroveId, auth, authCard, clearGrove, concepts, error, exitPreview, grewIds, groves, grovesLoaded, openGrove, preview, saveState, selected, setAuthCard, startPreview, student } = g;
  const [hideSample, setHideSample] = React.useState(false);
  const [switcherOpen, setSwitcherOpen] = React.useState(false);
  const [topicOpen, setTopicOpen] = React.useState(false);
  const has = concepts.length > 0;

  // With exactly one grove, open it silently: no decision to make, so this
  // just resumes where they left off, matching the original single-grove
  // experience. With none or several, the header below is always a clear,
  // permanent way in; nothing pops open uninvited.
  React.useEffect(() => {
    if (!grovesLoaded || activeGroveId || preview) return;
    if (groves.length === 1) openGrove(groves[0].id);
  }, [grovesLoaded, activeGroveId, preview, groves.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const footLink = { border: "none", background: "transparent", padding: 0, color: C.primary, fontWeight: 500, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" };

  // The status line that used to sit under the scene: save state or the guest
  // nudge, and Clear grove. Not shown in the sample grove, whose banner
  // already says nothing is saved.
  const status = !preview && (
    <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.5 }}>
      {student ? (saveState === "error" ? <span style={{ color: C.coral }}>Couldn't save your grove. Check the connection.</span> : activeGroveId ? `Saving${saveState === "saving" ? "…" : ""}` : "") : (<>Guest · <button onClick={() => setAuthCard("signin")} style={footLink}>sign in</button> to keep your grove</>)}
      {has && <>{" · "}<button onClick={clearGrove} style={footLink}>Clear grove</button></>}
    </div>
  );
  const legacy = auth.status === "legacy" && (
    <div style={{ fontSize: 12, color: C.sub, marginTop: 4, lineHeight: 1.5 }}>
      You're using a beta link. <button onClick={() => setAuthCard("signup")} style={footLink}>Create an account</button> with the username <b>{student}</b> to keep these trees.
    </div>
  );

  // The scene fills the screen behind everything else here. The header, the
  // notices under it and the bar float over it; the column between them lets
  // taps through to the scene (see .sceneTopStack in ui.css).
  return (
    <Shell>
      <GroveScene g={g} />

      <div className="homeOverlay">
        <GroveHeader g={g} setSwitcherOpen={setSwitcherOpen} />

        <div className="sceneTopStack">
          {preview && (
            <div style={{ alignSelf: "stretch", background: "rgba(228,234,217,.95)", borderRadius: 16, padding: "12px 12px 12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 6px 20px rgba(31,56,36,.12)" }}>
              <div style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: C.ink, lineHeight: 1.45 }}>
                A sample grove, so you can see what one looks like once it has grown. Nothing here is saved.
              </div>
              <PillButton variant="outline" size="sm" onClick={exitPreview} style={{ background: C.card, flexShrink: 0 }}>Done</PillButton>
            </div>
          )}

          {grewIds.length > 0 && (
            <Toast className="fadeUp" icon={<Icon name="sprout" size={20} color="#cfe3a8" />} style={{ alignSelf: "stretch" }}>
              Your grove grew. {grewIds.length} {grewIds.length === 1 ? "tree" : "trees"} stood a little taller.
              {!student && <>{" "}<button onClick={() => setAuthCard("signup")} style={{ border: "none", background: "transparent", padding: 0, color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>Save this grove</button></>}
            </Toast>
          )}

          {has ? (
            <div className="sceneChip">
              <div style={{ fontSize: 12.5, fontWeight: 500, color: C.ink }}>{concepts.length} planted &middot; Taller = more sessions</div>
              {status}
              {legacy}
            </div>
          ) : (
            <div className="sceneCard">
              <div className="disp" style={{ fontSize: 24, fontWeight: 500, color: C.ink, lineHeight: 1.2 }}>A quiet, empty grove</div>
              <div style={{ fontSize: 14, color: C.sub, marginTop: 6, lineHeight: 1.55 }}>Add what you're studying below. Grove asks you questions instead of handing over answers, which is what makes it stick.</div>
              {!preview && <div style={{ fontSize: 13, color: C.sub, marginTop: 8, lineHeight: 1.5 }}>You can share photos, PDFs, Word docs, or text files.</div>}
              {!preview && !hideSample && g.settings.sample_grove && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <PillButton variant="outline" onClick={startPreview} style={{ flex: 1, minWidth: 0, border: `1px dashed ${C.stone}`, color: C.primary, fontSize: 13.5 }}>
                    See what a grown grove looks like
                  </PillButton>
                  <button onClick={() => setHideSample(true)} aria-label="Hide this" style={{ border: "none", background: "transparent", color: C.stone, cursor: "pointer", fontSize: 18, padding: "8px 10px", flexShrink: 0 }}>&times;</button>
                </div>
              )}
              {status && <div style={{ marginTop: 12 }}>{status}</div>}
              {legacy}
            </div>
          )}
        </div>
      </div>

      {/* Just above the bar, which is two rows tall when there are trees to tend. */}
      {error && <Toast tone="warn" floating style={{ bottom: `calc(${has ? 136 : 84}px + env(safe-area-inset-bottom))` }}>{error}</Toast>}

      <ActionBar g={g} has={has} onTopic={() => setTopicOpen(true)} />

      {selected && <TreeCard g={g} />}

      {topicOpen && <TopicCard g={g} has={has} onClose={() => setTopicOpen(false)} />}
      {switcherOpen && <GroveSwitcher g={g} onClose={() => setSwitcherOpen(false)} />}
      {authCard && <AuthCard g={g} />}
    </Shell>
  );
}
