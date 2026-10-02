"use client";

import React from "react";
import { C, FONT_DISPLAY } from "../lib/theme";
import Icon from "./Icon";
import { PopCard } from "./ui/ModalCard";
import PillButton from "./ui/PillButton";
import { soundEnabled, setSoundEnabled } from "../lib/sound";

// The small circle at the right of the Home header. For a guest it's a way
// in; for a signed-in student it opens a short menu. Same dropdown pattern
// as GroveSwitcher: no dim, closes on an outside tap.
export default function AccountMenu({ g }) {
  const { auth, profile, setAuthCard, setEditingProfile, setFeedbackOpen, setProfile, setScreen, setSetupAvatar, setSetupGrade, setSetupInterests, signOut, student } = g;
  const [open, setOpen] = React.useState(false);
  // Guests have no profile, so their sound preference lives in localStorage;
  // this local state just mirrors it for the icon's on/off color.
  const [guestSoundOn, setGuestSoundOn] = React.useState(true);
  React.useEffect(() => { setGuestSoundOn(soundEnabled(null, null)); }, []);
  const signedIn = auth.status === "account";
  const initial = (auth.username || student || "?").slice(0, 1).toUpperCase();

  if (!signedIn && auth.status !== "legacy") {
    return (
      <div className="groveHeaderGuest" style={{ display: "flex", alignItems: "center" }}>
        <PillButton
          variant="outline" size="sm"
          onClick={() => { const next = !guestSoundOn; setGuestSoundOn(next); setSoundEnabled(null, null, null, next); }}
          title={guestSoundOn ? "Mute sounds" : "Unmute sounds"}
          aria-label={guestSoundOn ? "Mute sounds" : "Unmute sounds"}
          style={{ width: 36, padding: 0, flexShrink: 0 }}
        >
          <Icon name="sound" size={16} color={guestSoundOn ? C.primary : C.stone} />
        </PillButton>
        {/* Below 360px this collapses to a person icon so the grove name keeps
            its room; the label and icon swap by class (theme.js). */}
        <PillButton variant="outline" size={null} onClick={() => setAuthCard("welcome")} title="Sign in" aria-label="Sign in" className="groveHeaderSignIn" style={{ height: 36, fontSize: 13, flexShrink: 0 }}>
          <span className="groveHeaderSignInIcon"><Icon name="user" size={16} color={C.primary} /></span>
          <span className="groveHeaderSignInLabel">Sign in</span>
        </PillButton>
      </div>
    );
  }

  const Item = ({ onClick, icon, children, muted }) => (
    <button onClick={() => { setOpen(false); onClick(); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", border: "none", background: "transparent", cursor: "pointer", padding: "10px 10px", borderRadius: 10, color: muted ? C.sub : C.ink, fontWeight: 500, fontSize: 14, fontFamily: "inherit" }}>
      {icon && <Icon name={icon} size={16} color={muted ? C.sub : C.primary} />}{children}
    </button>
  );

  const soundOn = soundEnabled(student, profile);

  return (
    <>
      <button onClick={() => setOpen((v) => !v)} title={auth.username || student} aria-label="Account" className="uiPill" style={{ width: 36, height: 36, borderRadius: 999, border: `1px solid ${C.line}`, background: "#f6f6e8", color: C.ink, fontWeight: 400, fontSize: 20, lineHeight: 1, display: "grid", placeItems: "center", fontFamily: FONT_DISPLAY, overflow: "hidden", padding: 0, flexShrink: 0 }}>
        {profile && profile.avatar ? <img src={profile.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
      </button>
      {open && (
        <PopCard onClose={() => setOpen(false)} style={{ top: 62, right: 16, width: 224, padding: 8 }}>
          <div style={{ padding: "6px 10px 9px", borderBottom: `1px solid ${C.line}`, marginBottom: 4 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{auth.username || student}</div>
            <div style={{ fontSize: 12, color: C.sub }}>{signedIn ? (auth.role === "admin" ? "Signed in · admin" : "Signed in") : "Using a beta link"}</div>
          </div>
          {profile && (
            <Item icon="sprout" onClick={() => {
              setSetupGrade(profile.grade || "");
              const ex = Array.isArray(profile.interests) ? profile.interests : [];
              setSetupInterests([ex[0] || "", ex[1] || "", ex[2] || ""]);
              setSetupAvatar(profile.avatar || "");
              setScreen("home"); setEditingProfile(true);
            }}>Edit grade &amp; interests</Item>
          )}
          <Item icon="sound" onClick={() => setSoundEnabled(student, profile, setProfile, !soundOn)}>{soundOn ? "Sound: on" : "Sound: off"}</Item>
          <Item icon="snake" onClick={() => setScreen("play")}>Take a break</Item>
          <Item icon="feedback" onClick={() => setFeedbackOpen(true)}>Send feedback</Item>
          {auth.role === "admin" && <Item icon="chart" onClick={() => window.location.assign("/admin")}>Dashboard</Item>}
          {signedIn
            ? <Item muted onClick={signOut}>Sign out</Item>
            : <Item icon="plus" onClick={() => setAuthCard("signup")}>Create an account</Item>}
        </PopCard>
      )}
    </>
  );
}
