"use client";

import React from "react";
import { C } from "../lib/theme";
import Tree from "./Tree";
import Icon from "./Icon";

// One centred card, three states: welcome (guest / sign in / create account),
// sign in, and create account. Same surface, radius, and shadow as the
// tree-detail modal in Home, so it reads as part of the app rather than a
// gate in front of it. Closing it always means "continue as guest".

const field = { width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "inherit", background: C.bg, boxSizing: "border-box" };
const primary = (on) => ({ width: "100%", border: "none", cursor: on ? "pointer" : "default", padding: 15, borderRadius: 15, background: on ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : C.line, color: "#FCEFE4", fontWeight: 800, fontSize: 15 });
const quiet = { width: "100%", border: `1.5px solid ${C.line}`, background: C.card, cursor: "pointer", padding: 13, borderRadius: 15, color: C.primaryDeep, fontWeight: 800, fontSize: 14.5 };
const link = { border: "none", background: "transparent", padding: 4, fontWeight: 700, fontSize: 13, color: C.primaryDeep, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" };

// Google's mark, inline so there's no image request and no dependency.
function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" style={{ display: "block", flexShrink: 0 }}>
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.3z" />
      <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41.1 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.6 28.2c-.4-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H4.3C2.8 17 2 20.4 2 24s.8 7 2.3 9.9l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.7c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 6.9 4.3 14.1l7.3 5.7c1.7-5.2 6.6-9.1 12.4-9.1z" />
    </svg>
  );
}

function GoogleButton({ onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: "100%", border: `1.5px solid ${C.line}`, background: C.card, cursor: disabled ? "default" : "pointer", padding: 13, borderRadius: 15, color: C.ink, fontWeight: 800, fontSize: 14.5, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, fontFamily: "inherit" }}>
      <GoogleMark /> Continue with Google
    </button>
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "13px 2px" }}>
      <div style={{ flex: 1, height: 1, background: C.line }} />
      <div style={{ fontSize: 11, fontWeight: 800, color: C.stone, letterSpacing: ".06em" }}>OR</div>
      <div style={{ flex: 1, height: 1, background: C.line }} />
    </div>
  );
}

export default function AuthCard({ g }) {
  const { auth, authBusy, authCard, authError, claimUsername, setAuthCard, setAuthError, signIn, signInWithGoogle, signUp } = g;
  const [identifier, setIdentifier] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [claimName, setClaimName] = React.useState("");
  if (!authCard) return null;

  const go = (card) => { setAuthError(""); setAuthCard(card); };
  // Claim is the one state holding a real session with no username attached.
  // Letting it be dismissed would strand the person mid-signup, so it isn't.
  const mustFinish = authCard === "claim";
  const close = () => { if (mustFinish) return; setAuthError(""); setAuthCard(null); };
  const canSignIn = identifier.trim() && password;
  const canSignUp = username.trim().length >= 3 && email.includes("@") && password.length >= 8;
  const canClaim = claimName.trim().length >= 3;

  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(45,28,16,.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 40 }}>
      <div onClick={(e) => e.stopPropagation()} className="fadeUp" style={{ width: "100%", maxWidth: 400, maxHeight: "88vh", overflowY: "auto", background: C.card, borderRadius: 20, padding: "20px 22px 24px", boxShadow: "0 24px 56px rgba(40,24,12,.32)" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -8, height: 26 }}>
          {!mustFinish && <button onClick={close} aria-label="Close" style={{ border: "none", background: "transparent", color: C.sub, cursor: "pointer", padding: 4, fontSize: 18, lineHeight: 1 }}>&times;</button>}
        </div>

        {authCard === "welcome" && (
          <>
            <div style={{ display: "flex", justifyContent: "center" }}><Tree days={3} mastery={80} width={72} /></div>
            <div className="disp" style={{ fontSize: 24, fontWeight: 600, textAlign: "center", marginTop: 6 }}>Welcome to Grove</div>
            <div style={{ color: C.sub, fontSize: 14, fontWeight: 700, textAlign: "center", marginTop: 6, lineHeight: 1.5 }}>
              Sign in to keep your grove between visits, or look around first.
            </div>
            <div style={{ marginTop: 18 }}>
              <GoogleButton onClick={signInWithGoogle} disabled={authBusy} />
              <Divider />
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <button onClick={() => go("signin")} style={primary(true)}>Sign in with a password</button>
                <button onClick={() => go("signup")} style={quiet}>Create an account</button>
                <button onClick={close} style={{ ...link, marginTop: 4 }}>Continue as a guest</button>
              </div>
            </div>
            {authError && <div style={{ marginTop: 12, background: "#F5E0D2", color: "#9A4A28", padding: "10px 12px", borderRadius: 12, fontSize: 13.5, fontWeight: 700 }}>{authError}</div>}
          </>
        )}

        {authCard === "signin" && (
          <>
            <div className="disp" style={{ fontSize: 22, fontWeight: 600 }}>Sign in</div>
            <div style={{ marginTop: 14 }}><GoogleButton onClick={signInWithGoogle} disabled={authBusy} /></div>
            <Divider />
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Username or email" autoCapitalize="none" autoComplete="username" style={field} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && canSignIn && !authBusy) signIn(identifier, password); }} placeholder="Password" type="password" autoComplete="current-password" style={field} />
            </div>
            {authError && <div style={{ marginTop: 10, background: "#F5E0D2", color: "#9A4A28", padding: "10px 12px", borderRadius: 12, fontSize: 13.5, fontWeight: 700 }}>{authError}</div>}
            <button onClick={() => signIn(identifier, password)} disabled={!canSignIn || authBusy} style={{ ...primary(canSignIn && !authBusy), marginTop: 12 }}>{authBusy ? "Signing in" : "Sign in"}</button>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 10 }}>
              <button onClick={() => go("signup")} style={link}>Create an account</button>
              <button onClick={close} style={{ ...link, color: C.sub }}>Continue as a guest</button>
            </div>
          </>
        )}

        {authCard === "signup" && (
          <>
            <div className="disp" style={{ fontSize: 22, fontWeight: 600 }}>Create an account</div>
            <div style={{ color: C.sub, fontSize: 13, fontWeight: 700, marginTop: 4, lineHeight: 1.5 }}>Your username is what you'll sign in with. The email is only for getting back in if you forget your password.</div>
            <div style={{ marginTop: 14 }}><GoogleButton onClick={signInWithGoogle} disabled={authBusy} /></div>
            <Divider />
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40))} placeholder="Username" autoCapitalize="none" autoComplete="username" style={field} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" autoCapitalize="none" autoComplete="email" style={field} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && canSignUp && !authBusy) signUp(username, email, password); }} placeholder="Password (8 or more characters)" type="password" autoComplete="new-password" style={field} />
            </div>
            {auth.status === "guest" && g.groves.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, color: C.sageDeep, fontSize: 13, fontWeight: 700 }}>
                <Icon name="sprout" size={15} color={C.sageDeep} /> The grove you started will be saved to this account.
              </div>
            )}
            {authError && <div style={{ marginTop: 10, background: "#F5E0D2", color: "#9A4A28", padding: "10px 12px", borderRadius: 12, fontSize: 13.5, fontWeight: 700 }}>{authError}</div>}
            <button onClick={() => signUp(username, email, password)} disabled={!canSignUp || authBusy} style={{ ...primary(canSignUp && !authBusy), marginTop: 12 }}>{authBusy ? "Creating" : "Create account"}</button>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 10 }}>
              <button onClick={() => go("signin")} style={link}>I already have one</button>
              <button onClick={close} style={{ ...link, color: C.sub }}>Continue as a guest</button>
            </div>
          </>
        )}
        {authCard === "claim" && (
          <>
            <div className="disp" style={{ fontSize: 22, fontWeight: 600 }}>Pick a username</div>
            <div style={{ color: C.sub, fontSize: 13, fontWeight: 700, marginTop: 4, lineHeight: 1.5 }}>
              You're signed in with Google. Choose the name your grove lives under. If you've been using a beta link, enter that same name and your trees come with you.
            </div>
            <div style={{ marginTop: 14 }}>
              <input
                value={claimName}
                onChange={(e) => setClaimName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40))}
                onKeyDown={(e) => { if (e.key === "Enter" && canClaim && !authBusy) claimUsername(claimName); }}
                placeholder="Username"
                autoCapitalize="none"
                autoComplete="username"
                style={field}
              />
            </div>
            {authError && <div style={{ marginTop: 10, background: "#F5E0D2", color: "#9A4A28", padding: "10px 12px", borderRadius: 12, fontSize: 13.5, fontWeight: 700 }}>{authError}</div>}
            <button onClick={() => claimUsername(claimName)} disabled={!canClaim || authBusy} style={{ ...primary(canClaim && !authBusy), marginTop: 12 }}>{authBusy ? "Saving" : "Continue"}</button>
          </>
        )}
      </div>
    </div>
  );
}
