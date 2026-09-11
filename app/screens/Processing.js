"use client";

import React from "react";
import { C } from "../lib/theme";
import Tree from "../components/Tree";
import { Shell, Logo } from "../components/Shell";

// A long document's local extraction and section-grouping steps can take a
// few seconds longer than a single model call, so this names the stage
// rather than sitting on the same caption the whole time - the same swaying
// Tree throughout, never a spinner.
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
          <div style={{ animation: "sway 2.4s ease-in-out infinite", transformOrigin: "50% 100%" }}><Tree days={3} mastery={60} width={96} /></div>
          <div className="disp" style={{ fontSize: 20, fontWeight: 600, marginTop: 12 }}>{title}</div>
          <div style={{ color: C.sub, marginTop: 6, fontSize: 14, fontWeight: 700 }}>{sub}</div>
        </div>
      </div>
    </Shell>
  );
}
