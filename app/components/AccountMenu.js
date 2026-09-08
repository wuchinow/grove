"use client";

import React from "react";
import { C } from "../lib/theme";
import Icon from "./Icon";

// The small circle at the right of the Home header. For a guest it's a way
// in; for a signed-in student it opens a short menu. Same dropdown pattern
// as GroveSwitcher: no dim, closes on an outside tap.
export default function AccountMenu({ g }) {
  const { auth, child, profile, setAuthCard, setEditingProfile, setScreen, setSetupGrade, setSetupInterests, signOut } = g;
  const [open, setOpen] = React.useState(false);
  const signedIn = auth.status === "account";
  const initial = (auth.username || child || "?").slice(0, 1).toUpperCase();

  if (!signedIn && auth.status !== "legacy") {
    return (
      <button onClick={() => setAuthCard("welcome")} title="Sign in" aria-label="Sign in" style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 13px", borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.card, color: C.primaryDeep, fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(58,42,32,.07)" }}>
        Sign in
      </button>
    );
  }

  const Item = ({ onClick, icon, children, muted }) => (
    <button onClick={() => { setOpen(false); onClick(); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", border: "none", background: "transparent", cursor: "pointer", padding: "10px 10px", borderRadius: 10, color: muted ? C.sub : C.ink, fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>
      {icon && <Icon name={icon} size={16} color={muted ? C.sub : C.primaryDeep} />}{children}
    </button>
  );

  return (
    <>
      <button onClick={() => setOpen((v) => !v)} title={auth.username || child} aria-label="Account" style={{ width: 36, height: 36, borderRadius: 999, border: `1.5px solid ${C.line}`, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 2px 8px rgba(58,42,32,.12)", display: "grid", placeItems: "center", fontFamily: "'Fraunces',Georgia,serif" }}>
        {initial}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
          <div className="fadeUp" style={{ position: "absolute", top: 64, right: 20, zIndex: 30, width: 220, background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, boxShadow: "0 18px 40px rgba(40,24,12,.28)", padding: 8 }}>
            <div style={{ padding: "6px 10px 8px", borderBottom: `1px solid ${C.line}`, marginBottom: 4 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{auth.username || child}</div>
              <div style={{ fontSize: 11.5, color: C.sub, fontWeight: 700 }}>{signedIn ? "Signed in" : "Using a beta link"}</div>
            </div>
            {profile && (
              <Item icon="sprout" onClick={() => {
                setSetupGrade(profile.grade || "");
                const ex = Array.isArray(profile.interests) ? profile.interests : [];
                setSetupInterests([ex[0] || "", ex[1] || "", ex[2] || ""]);
                setScreen("home"); setEditingProfile(true);
              }}>Edit grade &amp; interests</Item>
            )}
            {auth.role === "admin" && <Item icon="chart" onClick={() => window.location.assign("/admin")}>Dashboard</Item>}
            {signedIn
              ? <Item muted onClick={signOut}>Sign out</Item>
              : <Item icon="plus" onClick={() => setAuthCard("signup")}>Create an account</Item>}
          </div>
        </>
      )}
    </>
  );
}
