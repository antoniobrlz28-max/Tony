import { SPECTRUM, PAPER_DIM, TEXT, SLATE } from "../lib/constants.js";

// The Orbit: LifeOS's signature open ring with a traveling dot. One shape, used
// as the logo, the loading indicator, and the score ring, so progress reads as
// one visual language everywhere. The spectrum gradient lives here and in hero
// moments only — never on buttons.

let uidCounter = 0;

export function Orbit({ size = 24, mode = "logo", progress = null, stroke = null, children }) {
  const id = `orbit-${mode}-${size}-${++uidCounter % 1000}`;
  const strokeW = Math.max(2.5, size * 0.085);
  const R = (size - strokeW) / 2 - 1;
  const c = size / 2;
  const C = 2 * Math.PI * R;
  // The brand ring is an open arc (~86%) with a dot at the gap
  const arc = mode === "score" && progress !== null ? C * Math.max(0.02, Math.min(1, progress)) : C * 0.78;
  const dotAngle = mode === "score" && progress !== null
    ? -90 + 360 * Math.min(1, progress)
    : -38;
  const dotR = strokeW * 0.62;
  const dotX = c + (R) * Math.cos((dotAngle * Math.PI) / 180);
  const dotY = c + (R) * Math.sin((dotAngle * Math.PI) / 180);

  return (
    <div className={mode === "spin" ? "spinner" : undefined} style={{ position: "relative", width: size, height: size, flexShrink: 0, display: "inline-flex" }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
            {SPECTRUM.map((color, i) => (
              <stop key={color} offset={`${(i / (SPECTRUM.length - 1)) * 100}%`} stopColor={color} />
            ))}
          </linearGradient>
        </defs>
        {mode === "score" && (
          <circle cx={c} cy={c} r={R} fill="none" stroke={PAPER_DIM} strokeWidth={strokeW} />
        )}
        <circle
          cx={c} cy={c} r={R} fill="none"
          stroke={stroke || `url(#${id})`} strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={`${arc} ${C}`}
          transform={`rotate(-90 ${c} ${c})`}
          style={mode === "score" ? { transition: "stroke-dasharray 0.6s ease" } : undefined}
        />
        <circle cx={dotX} cy={dotY} r={dotR} fill={SPECTRUM[2]} />
      </svg>
      {children && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function OrbitScore({ score, size = 116 }) {
  return (
    <Orbit mode="score" size={size} progress={Math.max(0, Math.min(1, score / 100))}>
      <div style={{ fontSize: size * 0.29, fontWeight: 700, color: TEXT, lineHeight: 1, letterSpacing: "-0.02em" }}>{score}</div>
      <div style={{ fontSize: Math.max(7.5, size * 0.072), color: SLATE, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 3 }}>Life Score</div>
    </Orbit>
  );
}
