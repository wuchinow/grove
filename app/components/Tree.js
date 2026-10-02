import { stageOf, STAGE_MAX } from "../lib/growth";

// ---- Tree ------------------------------------------------------------------
// One silhouette language across every stage: a soft-shouldered conifer built
// from stacked rounded layers, drawn from a shared baseline and centred on cx,
// so a row of mixed-stage trees reads as one grove standing on one ground line.
//
// Growth is height only: `days` (completed sessions) picks one of eight states,
// a planted seed mark and then seven tree stages. `mastery` is still passed by
// every call site and is ignored here; how well a concept is known shows on
// Progress, not on the tree.
//
// This drawing is a placeholder: one species, one green, until the illustrated
// landscape replaces it.
const CANOPY = { light: "#7FA455", main: "#5F8A3C", dark: "#3F6428" };

export default function Tree({ days, mastery, width = 76 }) {
  const stage = stageOf(days);
  // The proportions below were tuned on a 0-5 scale whose top already fills the
  // grove scene's headroom, so the seven stages are spread across that same
  // range: stage 7 is as tall as the tallest tree ever was.
  const h = stage * (5 / STAGE_MAX);
  const cx = 50, groundY = 120;
  const uid = `t${stage}`;

  const shadow = (
    <ellipse cx={cx} cy={groundY + 1.5} rx={10 + h * 3.2} ry={2.6 + h * 0.45} fill="rgba(74,42,20,0.15)" />
  );

  if (stage === 0) {
    // Planted: centred mound, single sprout rising from its middle.
    return (
      <svg viewBox="0 0 100 132" width={width} height={width * 1.32} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={`${uid}m`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#BCA98D" />
            <stop offset="100%" stopColor="#9B8970" />
          </linearGradient>
        </defs>
        {shadow}
        <path d={`M${cx - 14} ${groundY} a14 7.5 0 0 1 28 0 z`} fill={`url(#${uid}m)`} />
        <path d={`M${cx} ${groundY - 3} q -0.5 -9 0 -16`} stroke="#78894D" strokeWidth="2.1" fill="none" strokeLinecap="round" />
        <path d={`M${cx - 1} ${groundY - 14} c -7 -1.5 -10 -5 -10.5 -8.5 c 5 -0.5 9.5 2 10.5 8.5 z`} fill="#9BAA6A" />
        <path d={`M${cx + 1} ${groundY - 16} c 7 -2 10.5 -5.5 11 -9.5 c -5.5 -0.5 -10.5 2.5 -11 9.5 z`} fill="#8B9A5B" />
      </svg>
    );
  }

  // ---- proportions: a young stem thickens and lifts as it matures -----------
  const trunkH = 14 + h * 12;                 // visible trunk below the canopy
  const baseW = 5.5 + h * 1.15;               // trunk width at the ground
  const topW = baseW * 0.62;
  const top = groundY - trunkH;

  // canopy: taller and broader with each stage, always at its fullest
  const canopyH = 39.5 + h * 9.5;
  const canopyW = 33 + h * 4.2;
  const layers = h <= 1 ? 3 : h <= 3 ? 4 : 5;
  const step = canopyH / (layers + 1.5);      // vertical rise per layer

  // A single rounded-triangle layer: soft shoulders, gently pointed tip.
  const layer = (i) => {
    const t = i / (layers - 1);               // 0 at the base, 1 at the tip
    const w = canopyW * (1 - t * 0.52);
    const lh = step * 2.05;
    const y = top + 3 - i * step;             // base of this layer
    return `M${cx - w / 2} ${y}
            C${cx - w / 2} ${y - lh * 0.55}, ${cx - w * 0.2} ${y - lh * 0.86}, ${cx} ${y - lh}
            C${cx + w * 0.2} ${y - lh * 0.86}, ${cx + w / 2} ${y - lh * 0.55}, ${cx + w / 2} ${y}
            Q${cx} ${y + lh * 0.12} ${cx - w / 2} ${y} Z`;
  };

  return (
    <svg viewBox="0 0 100 132" width={width} height={width * 1.32} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={`${uid}c`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor={CANOPY.light} />
          <stop offset="55%" stopColor={CANOPY.main} />
          <stop offset="100%" stopColor={CANOPY.dark} />
        </linearGradient>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8B5130" />
          <stop offset="48%" stopColor="#6B3821" />
          <stop offset="100%" stopColor="#572C19" />
        </linearGradient>
      </defs>
      {shadow}

      {/* trunk: slight taper, no hard edges */}
      <path d={`M${cx - baseW / 2} ${groundY} Q${cx - baseW * 0.34} ${top + trunkH * 0.35} ${cx - topW / 2} ${top}
                L${cx + topW / 2} ${top} Q${cx + baseW * 0.34} ${top + trunkH * 0.35} ${cx + baseW / 2} ${groundY} Z`}
            fill={`url(#${uid}b)`} />

      {/* canopy: darkest at the base, lit from the upper left */}
      <g>
        {Array.from({ length: layers }, (_, i) => (
          <path key={i} d={layer(i)} fill={`url(#${uid}c)`} />
        ))}
        {Array.from({ length: layers }, (_, i) => (
          <path key={`s${i}`} d={layer(i)} fill="#1F3A1B" opacity={0.1 * (1 - i / layers)} />
        ))}
        {/* warm golden-hour rim on the sunlit side */}
        <path d={layer(layers - 1)} fill="#F3CE86" opacity="0.2" transform="translate(-1.2,-1.2)" />
      </g>
    </svg>
  );
}
