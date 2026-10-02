"use client";

import React from "react";
import { C } from "../lib/theme";
import { Shell, Logo } from "../components/Shell";
import Icon from "../components/Icon";
import GroveSwitcher from "../components/GroveSwitcher";
import AuthCard from "../components/AuthCard";
import GroveHeader from "../components/home/GroveHeader";
import GroveScene from "../components/home/GroveScene";
import StudyInput from "../components/home/StudyInput";
import TreeCard from "../components/home/TreeCard";

export default function Home({ g }) {
  const { activeGroveId, auth, authCard, clearGrove, concepts, error, exitPreview, grewIds, groves, grovesLoaded, openGrove, preview, saveState, selected, setAuthCard, startPreview, studyEverything, student } = g;
  const [hideSample, setHideSample] = React.useState(false);
  const [switcherOpen, setSwitcherOpen] = React.useState(false);
  const has = concepts.length > 0;

  // With exactly one grove, open it silently: no decision to make, so this
  // just resumes where they left off, matching the original single-grove
  // experience. With none or several, the header below is always a clear,
  // permanent way in; nothing pops open uninvited.
  React.useEffect(() => {
    if (!grovesLoaded || activeGroveId || preview) return;
    if (groves.length === 1) openGrove(groves[0].id);
  }, [grovesLoaded, activeGroveId, preview, groves.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Shell>
      <GroveHeader g={g} setSwitcherOpen={setSwitcherOpen} />

      {preview && (
        <div style={{ margin: "14px 20px 0", background: C.soft, border: `1.5px solid ${C.line}`, borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: C.primaryDeep, lineHeight: 1.45 }}>
            A sample grove, so you can see what one looks like once it has grown. Nothing here is saved.
          </div>
          <button onClick={exitPreview} style={{ border: "none", background: C.card, color: C.primaryDeep, borderRadius: 10, padding: "9px 13px", cursor: "pointer", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>Done</button>
        </div>
      )}

      {grewIds.length > 0 && (
        <div className="fadeUp" style={{ margin: "14px 20px 0", background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 22px rgba(58,42,32,.10)" }}>
          <Icon name="sprout" size={20} color={C.sageDeep} />
          <div style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
            Your grove grew. {grewIds.length} {grewIds.length === 1 ? "tree" : "trees"} stood a little taller.
            {!student && <>{" "}<button onClick={() => setAuthCard("signup")} style={{ border: "none", background: "transparent", padding: 0, color: C.primary, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>Save this grove</button></>}
          </div>
        </div>
      )}

      <GroveScene g={g} />

      <div style={{ padding: "18px 20px 40px" }}>
        {error && <div style={{ marginBottom: 14, background: "#F5E0D2", color: "#9A4A28", padding: "12px 14px", borderRadius: 14, fontSize: 14, fontWeight: 600 }}>{error}</div>}

        {has && (
          <button onClick={studyEverything} style={{ width: "100%", border: "none", cursor: "pointer", padding: 16, borderRadius: 16, background: `linear-gradient(135deg, ${C.amber}, ${C.amberDeep})`, color: "#3A2412", fontWeight: 800, fontSize: 16, marginBottom: 10, boxShadow: "0 12px 26px rgba(199,125,52,.36), 0 2px 5px rgba(150,90,30,.18)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Icon name="drop" size={18} color="#3A2412" /> Tend the whole grove</span>
          </button>
        )}

        {!preview && (
          <>
            <StudyInput g={g} has={has} />

            {!has && !hideSample && g.settings.sample_grove && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={startPreview} style={{ flex: 1, background: "transparent", border: `1.5px dashed ${C.line}`, cursor: "pointer", padding: 12, borderRadius: 14, color: C.primary, fontWeight: 700, fontSize: 13.5 }}>
                  See what a grown grove looks like
                </button>
                <button onClick={() => setHideSample(true)} aria-label="Hide this" style={{ border: "none", background: "transparent", color: C.stone, cursor: "pointer", fontSize: 18, padding: "8px 10px", flexShrink: 0 }}>&times;</button>
              </div>
            )}
          </>
        )}

        <p style={{ textAlign: "center", color: "#B7A489", fontSize: 12, marginTop: 22 }}>
          {preview ? "Sample grove · nothing is being saved" : student ? (saveState === "error" ? "Couldn't save your grove. Check the connection." : activeGroveId ? `Saving${saveState === "saving" ? "…" : ""}` : "") : (<>Guest · <button onClick={() => setAuthCard("signin")} style={{ border: "none", background: "transparent", padding: 0, color: C.primary, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>sign in</button> to keep your grove</>)}
          {has && !preview && <>{" · "}<button onClick={clearGrove} style={{ border: "none", background: "transparent", padding: 0, color: C.primary, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Clear grove</button></>}
        </p>
        {auth.status === "legacy" && (
          <p style={{ textAlign: "center", color: "#B7A489", fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
            You're using a beta link. <button onClick={() => setAuthCard("signup")} style={{ border: "none", background: "transparent", padding: 0, color: C.primary, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Create an account</button> with the username <b>{student}</b> to keep these trees.
          </p>
        )}
      </div>

      {selected && <TreeCard g={g} />}

      {switcherOpen && <GroveSwitcher g={g} onClose={() => setSwitcherOpen(false)} />}
      {authCard && <AuthCard g={g} />}
    </Shell>
  );
}
