"use client";

import React from "react";
import { C } from "../lib/theme";
import TreeArt from "../components/TreeArt";
import { Shell } from "../components/Shell";

// A long document's local extraction and section-grouping steps can take a
// few seconds longer than a single model call, so this names the stage
// rather than sitting on the same caption the whole time. The tree stands
// still and the busy dots are the only thing that moves: they're the one
// looping animation the app allows (UX rule 8), and the reduced-motion rule
// stops them too. (The tree used to sway on an inline loop that rule never
// reached.)
function caption(sourceMode, processingStage) {
  if (sourceMode === "topic") return { title: "Thinking it through…", sub: "Finding concepts to plant" };
  if (sourceMode === "photo") return { title: "Reading your work…", sub: "Finding concepts to plant" };
  if (processingStage === "structuring") return { title: "Finding the sections…", sub: "This one's long, so you can pick where to start" };
  if (processingStage === "extracting") return { title: "Finding the concepts…", sub: "Finding concepts to plant" };
  return { title: "Reading your document…", sub: "Getting the text out" };
}

export default function Processing({ g }) {
  const { processingStage, sourceMode } = g;
  const { title, sub } = caption(sourceMode, processingStage);
  return (
    <Shell>
      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 30 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-block", background: C.soft, borderRadius: 999, padding: 18 }}><TreeArt stage={7} size={104} /></div>
          <div className="disp" style={{ fontSize: 24, fontWeight: 500, marginTop: 16 }}>{title}</div>
          <div style={{ color: C.sub, marginTop: 6, fontSize: 14.5, display: "inline-flex", alignItems: "baseline", gap: 7 }}>
            <span>{sub}</span>
            <span style={{ display: "inline-flex", gap: 3 }} aria-hidden="true">
              <span className="dotPulse" style={{ animationDelay: "0s" }} />
              <span className="dotPulse" style={{ animationDelay: "0.15s" }} />
              <span className="dotPulse" style={{ animationDelay: "0.3s" }} />
            </span>
          </div>
        </div>
      </div>
    </Shell>
  );
}
