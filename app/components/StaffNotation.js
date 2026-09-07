import { C } from "../lib/theme";

// ---- StaffNotation -----------------------------------------------------
// Deterministic music staff rendering: the model names a note (letter,
// octave, clef), this component computes exactly where it sits and draws
// it. No language ever has to describe a position, which is the whole
// point - "where a note sits on a staff" is a spatial fact, not a verbal
// one, and a diagram that's always correct beats a description that
// sometimes isn't.
//
// Position is measured in staff steps, 0 at the bottom line, 8 at the top
// line, one step per line-or-space. Verified against known reference
// points for both clefs (treble bottom line E4=0, top line F5=8; bass
// bottom line G2=0, top line A3=8; middle C falls at -2 in treble and +10
// in bass, the standard cross-check that the two clefs agree on itself).
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
function stepOf(letter, octave) { return octave * 7 + LETTERS.indexOf(letter); }
function position(letter, octave, clef) {
  const ref = clef === "bass" ? stepOf("G", 2) : stepOf("E", 4);
  return stepOf(letter, octave) - ref;
}
// Ledger lines only appear where one is actually needed to anchor a note;
// a note in the space just outside the staff (position -1 or 9) floats
// with no line of its own.
function ledgerPositions(p) {
  const lines = [];
  if (p <= -2) for (let x = -2; x >= p; x -= 2) lines.push(x);
  else if (p >= 10) for (let x = 10; x <= p; x += 2) lines.push(x);
  return lines;
}

export default function StaffNotation({ clef = "treble", notes = [], width = 220 }) {
  const step = 7;              // px per staff step
  const padX = 30;             // room for the clef mark
  const noteGap = 34;          // horizontal spacing between notes
  const positions = notes.map((n) => position(n.letter, n.octave, clef));
  const minP = Math.min(0, ...positions);
  const maxP = Math.max(8, ...positions);
  const topPad = (maxP - 8) * step + 14;
  const bottomPad = (0 - minP) * step + 22;
  const svgH = 8 * step + topPad + bottomPad;
  const y = (p) => svgH - bottomPad - p * step;
  const svgW = Math.max(width, padX * 2 + 10 + notes.length * noteGap);

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} width={svgW} height={svgH} style={{ display: "block", overflow: "visible" }}>
      {[0, 2, 4, 6, 8].map((p) => (
        <line key={p} x1={padX - 12} x2={svgW - 10} y1={y(p)} y2={y(p)} stroke={C.ink} strokeWidth="1.1" opacity="0.55" />
      ))}
      {clef === "bass" ? (
        // A thick hook opening left, its bulge sitting on the F3 line, plus the
        // two dots that straddle that same line - sized in step units so it
        // scales with the staff instead of a fixed font size.
        <>
          <path
            d={`M ${padX - 4} ${y(9.5)} C ${padX - step * 1.3} ${y(8.4)}, ${padX - step * 1.3} ${y(6.1)}, ${padX - 5} ${y(5)}`}
            fill="none" stroke={C.ink} strokeWidth={step * 0.42} strokeLinecap="round" opacity="0.75"
          />
          <circle cx={padX + 6} cy={y(7)} r={step * 0.22} fill={C.ink} opacity="0.75" />
          <circle cx={padX + 6} cy={y(5)} r={step * 0.22} fill={C.ink} opacity="0.75" />
        </>
      ) : (
        // A loop centered high on the staff with a stem sweeping down through
        // the G4 line and curling at the bottom - a stylized treble clef, not
        // calligraphy, but properly proportioned to the staff it sits on.
        <path
          d={`M ${padX + 2} ${y(10)}
              C ${padX - step * 1.6} ${y(9.3)}, ${padX - step * 1.6} ${y(7.2)}, ${padX + 1} ${y(6.8)}
              C ${padX + step * 1.9} ${y(6.4)}, ${padX + step * 1.7} ${y(3.6)}, ${padX - 1} ${y(2)}
              C ${padX - step * 1.4} ${y(0.6)}, ${padX - step * 1.4} ${y(-1.6)}, ${padX + 1.5} ${y(-2.2)}`}
          fill="none" stroke={C.ink} strokeWidth={step * 0.38} strokeLinecap="round" strokeLinejoin="round" opacity="0.75"
        />
      )}
      {notes.map((n, i) => {
        const cx = padX + 20 + i * noteGap;
        const p = positions[i];
        const cy = y(p);
        const acc = n.accidental === "sharp" ? "\u266F" : n.accidental === "flat" ? "\u266D" : "";
        return (
          <g key={i}>
            {ledgerPositions(p).map((lp) => (
              <line key={lp} x1={cx - 9} x2={cx + 9} y1={y(lp)} y2={y(lp)} stroke={C.ink} strokeWidth="1.1" opacity="0.55" />
            ))}
            {acc && <text x={cx - 17} y={cy + 5} fontSize="13" fill={C.primaryDeep}>{acc}</text>}
            <ellipse cx={cx} cy={cy} rx="6" ry="4.6" fill={C.primaryDeep} transform={`rotate(-18 ${cx} ${cy})`} />
            {n.label && (
              <text x={cx} y={svgH - 6} fontSize="11" fontWeight="700" textAnchor="middle" fill={C.sub}>{n.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
