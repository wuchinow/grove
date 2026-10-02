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

  return (
    <Shell>
      <GroveHeader g={g} setSwitcherOpen={setSwitcherOpen} />

      {preview && (
        <div style={{ margin: "14px 16px 0", background: C.soft, borderRadius: 16, padding: "12px 12px 12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: C.ink, lineHeight: 1.45 }}>
            A sample grove, so you can see what one looks like once it has grown. Nothing here is saved.
          </div>
          <PillButton variant="outline" size="sm" onClick={exitPreview} style={{ background: C.card, flexShrink: 0 }}>Done</PillButton>
        </div>
      )}

      {grewIds.length > 0 && (
        <Toast className="fadeUp" icon={<Icon name="sprout" size={20} color="#cfe3a8" />} style={{ margin: "14px 16px 0" }}>
          Your grove grew. {grewIds.length} {grewIds.length === 1 ? "tree" : "trees"} stood a little taller.
          {!student && <>{" "}<button onClick={() => setAuthCard("signup")} style={{ border: "none", background: "transparent", padding: 0, color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>Save this grove</button></>}
        </Toast>
      )}

      <GroveScene g={g} />

      <div style={{ padding: "16px 16px 0" }}>
        {error && <Toast tone="warn" style={{ marginBottom: 14 }}>{error}</Toast>}

        {!preview && (
          <>
            <p style={{ textAlign: "center", color: C.sub, fontSize: 13, lineHeight: 1.5, margin: 0 }}>You can share photos, PDFs, Word docs, or text files.</p>

            {!has && !hideSample && g.settings.sample_grove && (
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <PillButton variant="outline" onClick={startPreview} style={{ flex: 1, minWidth: 0, border: `1px dashed ${C.stone}`, color: C.primary, fontSize: 13.5 }}>
                  See what a grown grove looks like
                </PillButton>
                <button onClick={() => setHideSample(true)} aria-label="Hide this" style={{ border: "none", background: "transparent", color: C.stone, cursor: "pointer", fontSize: 18, padding: "8px 10px", flexShrink: 0 }}>&times;</button>
              </div>
            )}
          </>
        )}

        <p style={{ textAlign: "center", color: C.sub, fontSize: 12, marginTop: 18, marginBottom: 0 }}>
          {preview ? "Sample grove · nothing is being saved" : student ? (saveState === "error" ? "Couldn't save your grove. Check the connection." : activeGroveId ? `Saving${saveState === "saving" ? "…" : ""}` : "") : (<>Guest · <button onClick={() => setAuthCard("signin")} style={footLink}>sign in</button> to keep your grove</>)}
          {has && !preview && <>{" · "}<button onClick={clearGrove} style={footLink}>Clear grove</button></>}
        </p>
        {auth.status === "legacy" && (
          <p style={{ textAlign: "center", color: C.sub, fontSize: 12, marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>
            You're using a beta link. <button onClick={() => setAuthCard("signup")} style={footLink}>Create an account</button> with the username <b>{student}</b> to keep these trees.
          </p>
        )}
        {/* The bar is fixed, so the page ends with room to scroll clear of it. */}
        <div className={has && !preview ? "actionBarClearance" : "actionBarClearance oneRow"} />
      </div>

      <ActionBar g={g} has={has} onTopic={() => setTopicOpen(true)} />

      {selected && <TreeCard g={g} />}

      {topicOpen && <TopicCard g={g} has={has} onClose={() => setTopicOpen(false)} />}
      {switcherOpen && <GroveSwitcher g={g} onClose={() => setSwitcherOpen(false)} />}
      {authCard && <AuthCard g={g} />}
    </Shell>
  );
}
