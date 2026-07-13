import { useState, useEffect } from "react";
import { INK, TEXT, SLATE, SPECTRUM } from "../lib/constants.js";

// Opening animation: the Orbit ring draws itself clockwise, the dot rides the arc
// and settles, then the "life OS" wordmark and tagline fade up. Shows once per
// session (sessionStorage), and is skipped entirely under reduced-motion.
const SEEN_KEY = "lifeos-splash-seen";

export function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState("draw"); // draw -> reveal -> exit

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || sessionStorage.getItem(SEEN_KEY)) { onDone(); return; }
    sessionStorage.setItem(SEEN_KEY, "1");
    const t1 = setTimeout(() => setPhase("reveal"), 1050);
    const t2 = setTimeout(() => setPhase("exit"), 2350);
    const t3 = setTimeout(onDone, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const size = 96, R = 40, C = 2 * Math.PI * R;
  const arc = C * 0.78;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100, background: INK,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18,
      opacity: phase === "exit" ? 0 : 1, transition: "opacity 0.45s ease",
      pointerEvents: phase === "exit" ? "none" : "auto",
    }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <defs>
            <linearGradient id="splashGrad" x1="0" y1="0" x2="1" y2="1">
              {SPECTRUM.map((c, i) => (
                <stop key={c} offset={`${(i / (SPECTRUM.length - 1)) * 100}%`} stopColor={c} />
              ))}
            </linearGradient>
          </defs>
          <circle
            className="splash-ring"
            cx={size / 2} cy={size / 2} r={R} fill="none"
            stroke="url(#splashGrad)" strokeWidth={6} strokeLinecap="round"
            strokeDasharray={`${arc} ${C}`}
          />
        </svg>
        {/* the dot */}
        <span className="splash-dot" style={{
          position: "absolute", top: size / 2 - 4, left: size - 14, width: 8, height: 8,
          borderRadius: "50%", background: SPECTRUM[2],
        }} />
      </div>

      <div style={{
        textAlign: "center",
        opacity: phase === "draw" ? 0 : 1, transform: phase === "draw" ? "translateY(8px)" : "none",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: TEXT }}>life OS</div>
        <div style={{ fontSize: 11, letterSpacing: "0.32em", color: SLATE, textTransform: "uppercase", marginTop: 6 }}>You. Optimized.</div>
      </div>
    </div>
  );
}
