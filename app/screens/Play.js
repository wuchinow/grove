"use client";

import React from "react";
import { C } from "../lib/theme";
import { Shell } from "../components/Shell";
import Icon from "../components/Icon";

const GRID = 16;
const TICK_MS = 140;

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
  const { profile, reportGameScore, setScreen } = g;
  const best = (profile && profile.snakeBest) || 0;

  const wrapRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [size, setSize] = React.useState(320);
  const [score, setScore] = React.useState(0);
  const [gameOver, setGameOver] = React.useState(false);
  const [paused, setPaused] = React.useState(false);

  const snakeRef = React.useRef([]);
  const dirRef = React.useRef({ x: 1, y: 0 });
  const nextDirRef = React.useRef({ x: 1, y: 0 });
  const foodRef = React.useRef({ x: 12, y: 8 });
  const scoreRef = React.useRef(0);
  const reportedRef = React.useRef(false);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize(Math.max(180, Math.min(360, el.clientWidth)));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function reset() {
    snakeRef.current = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    foodRef.current = randCell(snakeRef.current);
    scoreRef.current = 0;
    reportedRef.current = false;
    setScore(0);
    setGameOver(false);
    setPaused(false);
  }
  React.useEffect(reset, []);

  function turn(dx, dy) {
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

  // Pause the loop when the tab/app is backgrounded.
  React.useEffect(() => {
    function onVis() { setPaused(document.hidden); }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Fixed-tick game loop, torn down and rebuilt whenever size/pause/over
  // changes so it never ticks while paused or after a collision.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cell = size / GRID;

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
      if (hitWall || hitSelf) { setGameOver(true); return; }
      const ate = next.x === foodRef.current.x && next.y === foodRef.current.y;
      const body = [next, ...snakeRef.current];
      if (!ate) body.pop();
      else { scoreRef.current += 1; setScore(scoreRef.current); foodRef.current = randCell(body); }
      snakeRef.current = body;
      draw();
    }

    draw();
    if (gameOver || paused) return;
    const id = setInterval(step, TICK_MS);
    return () => clearInterval(id);
  }, [size, gameOver, paused]);

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
          <button onClick={() => setScreen("home")} style={{ border: "none", background: C.soft, color: C.primaryDeep, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 800, fontSize: 13 }}>&larr; My grove</button>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>Score {score}</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.sub }}>Best {Math.max(best, score)}</div>
          </div>
        </div>

        <div className="disp" style={{ fontSize: 22, fontWeight: 600, marginTop: 14 }}>Take a break</div>

        <div ref={wrapRef} style={{ marginTop: 16, width: "100%", maxWidth: 360, marginLeft: "auto", marginRight: "auto", position: "relative" }}>
          <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size, borderRadius: 18, boxShadow: "0 8px 24px rgba(58,42,32,.12)", touchAction: "none" }} />
          {gameOver && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(45,28,16,.5)", borderRadius: 18, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div className="disp" style={{ color: "#FCEFE4", fontSize: 20, fontWeight: 600 }}>Game over</div>
              <div style={{ color: "#FCEFE4", fontSize: 13, fontWeight: 700 }}>Score {score} · Best {Math.max(best, score)}</div>
              <button onClick={reset} style={{ marginTop: 6, border: "none", cursor: "pointer", padding: "10px 20px", borderRadius: 14, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color: "#FCEFE4", fontWeight: 800, fontSize: 14 }}>Play again</button>
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
