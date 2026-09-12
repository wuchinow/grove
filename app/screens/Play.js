"use client";

import React from "react";
import { C } from "../lib/theme";
import { Shell } from "../components/Shell";
import Icon from "../components/Icon";
import { soundEnabled, playSnakeEat, playSnakeOver } from "../lib/sound";

const GRID = 16;
const START_TICK_MS = 200;
const MIN_TICK_MS = 120;
const SPEEDUP_MS = 4;

function randCell(exclude) {
  let cell;
  do {
    cell = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (exclude.some((c) => c.x === cell.x && c.y === cell.y));
  return cell;
}

// A break, not a reward engine - no tie to mastery or trees. D-pad is the
// primary control (a left-edge swipe would fight Safari's back gesture);
// arrow keys/WASD work too for desktop testing.
export default function Play({ g }) {
  const { profile, reportGameScore, setScreen, student } = g;
  const best = (profile && profile.snakeBest) || 0;

  const wrapRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [size, setSize] = React.useState(320);
  const [score, setScore] = React.useState(0);
  const [gameOver, setGameOver] = React.useState(false);
  // "start" (pre-play, Play button + best score) | "playing" | "paused".
  // gameOver is kept separate - a terminal outcome of play, not a mode -
  // so the three overlay conditions (phase==="start", phase==="paused",
  // gameOver) are always mutually exclusive.
  const [phase, setPhase] = React.useState("start");

  const snakeRef = React.useRef([]);
  const dirRef = React.useRef({ x: 1, y: 0 });
  const nextDirRef = React.useRef({ x: 1, y: 0 });
  const foodRef = React.useRef({ x: 12, y: 8 });
  const scoreRef = React.useRef(0);
  const speedRef = React.useRef(START_TICK_MS);
  const reportedRef = React.useRef(false);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize(Math.max(180, Math.min(360, el.clientWidth)));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Resets the board only - phase is set by whichever caller invokes this,
  // since mount, Play, and Restart each want a different resulting phase.
  function reset() {
    snakeRef.current = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    foodRef.current = randCell(snakeRef.current);
    scoreRef.current = 0;
    speedRef.current = START_TICK_MS;
    reportedRef.current = false;
    setScore(0);
    setGameOver(false);
  }
  // Seeds a valid board under the start overlay on first paint; phase stays
  // "start" until Play is tapped.
  React.useEffect(reset, []);

  function handlePlay() { reset(); setPhase("playing"); }
  function handlePause() { setPhase("paused"); }
  function handleResume() { setPhase("playing"); }
  function handleRestart() { reset(); setPhase("playing"); }

  function turn(dx, dy) {
    if (phase !== "playing") return; // ignore input queued from an idle overlay
    const d = dirRef.current;
    if (d.x === -dx && d.y === -dy) return; // ignore reversing into yourself
    nextDirRef.current = { x: dx, y: dy };
  }

  // Keyboard, for desktop testing - the d-pad is the primary control.
  React.useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") turn(0, -1);
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") turn(0, 1);
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") turn(-1, 0);
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") turn(1, 0);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Pause the loop when the tab/app is backgrounded - never auto-resume,
  // that's the user's own Resume tap.
  React.useEffect(() => {
    function onVis() { if (document.hidden) setPhase((p) => (p === "playing" ? "paused" : p)); }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Self-scheduling game loop (setTimeout, not setInterval) so the tick
  // period can change mid-game as speedRef ramps up - torn down and rebuilt
  // whenever size/pause/over changes so it never ticks while paused or
  // after a collision.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cell = size / GRID;
    let timeoutId = null;

    function draw() {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = C.card;
      ctx.fillRect(0, 0, size, size);
      const f = foodRef.current;
      ctx.fillStyle = C.amber;
      ctx.beginPath();
      ctx.arc((f.x + 0.5) * cell, (f.y + 0.5) * cell, cell * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.sageDeep;
      snakeRef.current.forEach((s, i) => {
        const r = i === 0 ? 6 : 4;
        const px = s.x * cell + 1, py = s.y * cell + 1, w = cell - 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(px, py, w, w, r); else ctx.rect(px, py, w, w);
        ctx.fill();
      });
    }

    function step() {
      dirRef.current = nextDirRef.current;
      const head = snakeRef.current[0];
      const next = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };
      const hitWall = next.x < 0 || next.y < 0 || next.x >= GRID || next.y >= GRID;
      const hitSelf = snakeRef.current.some((s) => s.x === next.x && s.y === next.y);
      if (hitWall || hitSelf) {
        if (soundEnabled(student, profile)) playSnakeOver();
        setGameOver(true);
        return;
      }
      const ate = next.x === foodRef.current.x && next.y === foodRef.current.y;
      const body = [next, ...snakeRef.current];
      if (!ate) body.pop();
      else {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        foodRef.current = randCell(body);
        speedRef.current = Math.max(MIN_TICK_MS, speedRef.current - SPEEDUP_MS);
        if (soundEnabled(student, profile)) playSnakeEat();
      }
      snakeRef.current = body;
      draw();
      timeoutId = setTimeout(step, speedRef.current);
    }

    draw();
    if (phase !== "playing" || gameOver) return;
    timeoutId = setTimeout(step, speedRef.current);
    return () => clearTimeout(timeoutId);
  }, [size, gameOver, phase, student, profile]);

  React.useEffect(() => {
    if (gameOver && !reportedRef.current) {
      reportedRef.current = true;
      reportGameScore(scoreRef.current);
    }
  }, [gameOver, reportGameScore]);

  const DPad = ({ dir, dx, dy, name }) => (
    <button
      onClick={() => turn(dx, dy)}
      aria-label={`Move ${dir}`}
      style={{ gridArea: dir, border: "none", background: C.card, borderRadius: 12, boxShadow: "0 2px 8px rgba(58,42,32,.08)", display: "grid", placeItems: "center", width: 52, height: 52, cursor: "pointer" }}
    >
      <Icon name={name} size={20} color={C.primaryDeep} />
    </button>
  );

  return (
    <Shell>
      <div style={{ padding: "20px 20px 30px", flex: 1, display: "flex", flexDirection: "column", overscrollBehavior: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setScreen("home")} style={{ border: "none", background: C.soft, color: C.primaryDeep, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 800, fontSize: 13 }}>&larr; My grove</button>
            {phase === "playing" && (
              <button onClick={handlePause} style={{ border: "none", background: C.soft, color: C.primaryDeep, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 800, fontSize: 13 }}>Pause</button>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>Score {score}</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.sub }}>Best {Math.max(best, score)}</div>
          </div>
        </div>

        <div className="disp" style={{ fontSize: 22, fontWeight: 600, marginTop: 14 }}>Take a break</div>

        <div ref={wrapRef} style={{ marginTop: 16, width: "100%", maxWidth: 360, marginLeft: "auto", marginRight: "auto", position: "relative" }}>
          <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size, borderRadius: 18, boxShadow: "0 8px 24px rgba(58,42,32,.12)", touchAction: "none" }} />
          {phase === "start" && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(45,28,16,.5)", borderRadius: 18, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div className="disp" style={{ color: "#FCEFE4", fontSize: 20, fontWeight: 600 }}>Take a break</div>
              <div style={{ color: "#FCEFE4", fontSize: 13, fontWeight: 700 }}>Best {best}</div>
              <button onClick={handlePlay} style={{ marginTop: 6, border: "none", cursor: "pointer", padding: "10px 20px", borderRadius: 14, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", fontWeight: 800, fontSize: 14 }}>Play</button>
            </div>
          )}
          {phase === "paused" && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(45,28,16,.5)", borderRadius: 18, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div className="disp" style={{ color: "#FCEFE4", fontSize: 20, fontWeight: 600 }}>Paused</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button onClick={handleResume} style={{ border: "none", cursor: "pointer", padding: "10px 20px", borderRadius: 14, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", fontWeight: 800, fontSize: 14 }}>Resume</button>
                <button onClick={handleRestart} style={{ border: "none", cursor: "pointer", padding: "10px 20px", borderRadius: 14, background: C.soft, color: C.primaryDeep, fontWeight: 800, fontSize: 14 }}>Restart</button>
              </div>
            </div>
          )}
          {gameOver && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(45,28,16,.5)", borderRadius: 18, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div className="disp" style={{ color: "#FCEFE4", fontSize: 20, fontWeight: 600 }}>Game over</div>
              <div style={{ color: "#FCEFE4", fontSize: 13, fontWeight: 700 }}>Score {score} · Best {Math.max(best, score)}</div>
              <button onClick={handleRestart} style={{ marginTop: 6, border: "none", cursor: "pointer", padding: "10px 20px", borderRadius: 14, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", fontWeight: 800, fontSize: 14 }}>Play again</button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 16 }} />

        <div style={{ display: "grid", gridTemplateAreas: `". up ." "left . right" ". down ."`, gridTemplateColumns: "52px 52px 52px", gridTemplateRows: "52px 52px 52px", gap: 8, justifyContent: "center", margin: "0 auto" }}>
          <DPad dir="up" dx={0} dy={-1} name="arrowUp" />
          <DPad dir="left" dx={-1} dy={0} name="chevronLeft" />
          <DPad dir="right" dx={1} dy={0} name="chevronRight" />
          <DPad dir="down" dx={0} dy={1} name="chevronDown" />
        </div>
      </div>
    </Shell>
  );
}
