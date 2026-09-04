"use client";

import React from "react";
import { C } from "../lib/theme";
import Tree from "../components/Tree";
import { Shell, Logo } from "../components/Shell";
import Icon from "../components/Icon";

export default function Processing({ g }) {
  const { concepts } = g;
    return (
      <Shell>
        <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 30 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ animation: "sway 2.4s ease-in-out infinite", transformOrigin: "50% 100%" }}><Tree days={3} mastery={60} width={96} /></div>
            <div className="disp" style={{ fontSize: 20, fontWeight: 600, marginTop: 12 }}>Reading your work…</div>
            <div style={{ color: C.sub, marginTop: 6, fontSize: 14, fontWeight: 700 }}>Finding concepts to plant</div>
          </div>
        </div>
      </Shell>
    );
}
