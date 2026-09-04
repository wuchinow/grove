// ---- Grove backdrop --------------------------------------------------------
// A redwood cathedral with light breaking through. Deliberately low-contrast and
// low-detail: it is a setting for the trees, never competition for them.
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
          <stop offset="0%" stopColor="#4A3720" />
          <stop offset="32%" stopColor="#B98C4E" />
          <stop offset="54%" stopColor="#EBCA88" />
          <stop offset="78%" stopColor="#C99E5C" />
          <stop offset="100%" stopColor="#8E6639" />
        </linearGradient>
        <radialGradient id="gvSun" cx="50%" cy="24%" r="50%">
          <stop offset="0%" stopColor="#FFF8E1" stopOpacity="0.95" />
          <stop offset="38%" stopColor="#FBE7B0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FBE7B0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gvGrass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4C7A3A" />
          <stop offset="100%" stopColor="#2C5324" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={W} height={groundTop + 26} fill="url(#gvSky)" />

      {/* distant trunks, hazy */}
      {trunk(150, 22, 12, "#6E4E32", 0.34, "#A47E52")}
      {trunk(62, 34, 20, "#7A5A3A", 0.46, "#B08A5A")}
      {trunk(372, 42, 24, "#775638", 0.5, "#B08654")}

      {/* light breaking through the canopy */}
      <rect x="0" y="0" width={W} height={groundTop} fill="url(#gvSun)" />
      <polygon points="215,26 148,208 204,208" fill="#FFF6DC" opacity="0.09" />
      <polygon points="215,26 252,208 308,208" fill="#FFF6DC" opacity="0.075" />

      {/* near framing trunks */}
      {trunk(20, 58, 32, "#59351F", 0.9, "#89512F")}
      {trunk(414, 64, 34, "#53321D", 0.92, "#834D2B")}
      {trunk(302, 28, 17, "#5D391F", 0.78, "#8D562F")}

      {/* ground: a single soft band of grass, no decorative detail */}
      <path d={`M0 ${groundTop + 4} Q ${W * 0.28} ${groundTop - 8} ${W * 0.56} ${groundTop + 5} T ${W} ${groundTop + 1} L ${W} ${H} L0 ${H} Z`} fill="url(#gvGrass)" />
      <path d={`M0 ${groundTop + 4} Q ${W * 0.28} ${groundTop - 8} ${W * 0.56} ${groundTop + 5} T ${W} ${groundTop + 1}`} stroke="#5C8C43" strokeWidth="2" fill="none" opacity="0.5" />
    </svg>
  );
}
