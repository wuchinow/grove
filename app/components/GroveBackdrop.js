// ---- Grove backdrop --------------------------------------------------------
// Tall trunks in morning haze with light breaking through. Deliberately
// low-contrast and low-detail: it is a setting for the trees, never competition
// for them. A placeholder in the redesign's greens until the illustrated
// landscape replaces it; the drawing is the same, only the colours changed.
export default function GroveBackdrop() {
  const W = 430, H = 300, groundTop = 208;
  // Trunks run past the horizon so the grass band, which rises and falls across
  // the width, always overlaps them. Ending them exactly at groundTop left a
  // sliver of sky wherever the grass dipped below it.
  const foot = groundTop + 26;
  const trunk = (x, wB, wT, fill, op, lit) => (
    <g opacity={op}>
      <path d={`M${x - wB / 2} ${foot} L${x - wT / 2} 0 L${x + wT / 2} 0 L${x + wB / 2} ${foot} Z`} fill={fill} />
      <path d={`M${x - wB / 2} ${foot} L${x - wT / 2} 0 L${x - wT / 2 + wT * 0.32} 0 L${x - wB / 2 + wB * 0.32} ${foot} Z`} fill={lit} opacity="0.45" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" width="100%" height="100%" style={{ position: "absolute", inset: 0, display: "block" }}>
      <defs>
        <linearGradient id="gvSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dfe8d2" />
          <stop offset="32%" stopColor="#e9efdf" />
          <stop offset="54%" stopColor="#f1f5e8" />
          <stop offset="78%" stopColor="#e3ebd3" />
          <stop offset="100%" stopColor="#d3dfbf" />
        </linearGradient>
        <radialGradient id="gvSun" cx="50%" cy="24%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="38%" stopColor="#fbfdf3" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fbfdf3" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gvGrass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b7cc95" />
          <stop offset="100%" stopColor="#95b170" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={W} height={groundTop + 26} fill="url(#gvSky)" />

      {/* distant trunks, hazy */}
      {trunk(150, 22, 12, "#a9bb9c", 0.34, "#c6d3bb")}
      {trunk(62, 34, 20, "#a3b796", 0.46, "#c3d1b8")}
      {trunk(372, 42, 24, "#a3b796", 0.5, "#c3d1b8")}

      {/* light breaking through the canopy */}
      <rect x="0" y="0" width={W} height={groundTop} fill="url(#gvSun)" />
      <polygon points="215,26 148,208 204,208" fill="#ffffff" opacity="0.16" />
      <polygon points="215,26 252,208 308,208" fill="#ffffff" opacity="0.13" />

      {/* near framing trunks */}
      {trunk(20, 58, 32, "#8ea587", 0.9, "#b1c2a8")}
      {trunk(414, 64, 34, "#8aa283", 0.92, "#adbfa4")}
      {trunk(302, 28, 17, "#97ac8e", 0.78, "#b7c7ad")}

      {/* ground: a single soft band of grass, no decorative detail */}
      <path d={`M0 ${groundTop + 4} Q ${W * 0.28} ${groundTop - 8} ${W * 0.56} ${groundTop + 5} T ${W} ${groundTop + 1} L ${W} ${H} L0 ${H} Z`} fill="url(#gvGrass)" />
      <path d={`M0 ${groundTop + 4} Q ${W * 0.28} ${groundTop - 8} ${W * 0.56} ${groundTop + 5} T ${W} ${groundTop + 1}`} stroke="#c9dbab" strokeWidth="2" fill="none" opacity="0.7" />
    </svg>
  );
}
