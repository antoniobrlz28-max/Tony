import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { SAGE, RUST, VIOLET, AMBER, CORAL, LIME, MAGENTA, SLATE, TEXT, CARD, INK_SOFT, PAPER_DIM } from "../lib/constants.js";
import { OrbitScore } from "./Orbit.jsx";

const DOMAIN_COLORS = { health: CORAL, finances: AMBER, mind: VIOLET, energy: LIME, purpose: MAGENTA };

export function LifeScoreCard({ result }) {
  const [open, setOpen] = useState(false);
  if (!result) return null;

  if (!result.ready) {
    return (
      <div className="fade-up" style={{ marginBottom: 20, background: CARD, borderRadius: 22, padding: "18px 16px", border: `1px solid ${INK_SOFT}18`, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${VIOLET}1f`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Sparkles size={17} color={VIOLET} />
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: TEXT }}>Your system is learning</div>
          <div style={{ fontSize: 11.5, color: SLATE, marginTop: 2 }}>
            Log a few days of money and habits to establish your first Life Score baseline.
          </div>
        </div>
      </div>
    );
  }

  const { score, delta, domains, contributions, signals, totalSignals } = result;

  return (
    <div className="fade-up" style={{ marginBottom: 20, background: CARD, borderRadius: 22, padding: "18px 16px", border: `1px solid ${INK_SOFT}18` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <OrbitScore score={score} size={116} />
          {delta !== null && delta !== 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 9px", borderRadius: 999, fontSize: 10.5, fontWeight: 700,
              color: delta > 0 ? SAGE : RUST, background: delta > 0 ? `${SAGE}1a` : `${RUST}1a`,
              border: `1px solid ${delta > 0 ? SAGE : RUST}40`
            }}>
              {delta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {delta > 0 ? "+" : ""}{delta} this week
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {domains.map(d => (
            <div key={d.key} style={{ marginBottom: 7, opacity: d.score === null ? 0.45 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                <span style={{ fontWeight: 600, color: TEXT }}>{d.label}</span>
                <span style={{ color: SLATE, fontVariantNumeric: "tabular-nums", fontSize: d.score === null ? 9.5 : 11 }}>
                  {d.score ?? "learning"}
                </span>
              </div>
              <div style={{ height: 5, background: PAPER_DIM, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${d.score ?? 0}%`, background: DOMAIN_COLORS[d.key], borderRadius: 3, transition: "width 0.5s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
        background: "none", border: "none", cursor: "pointer", padding: "10px 0 0", marginTop: 4,
        borderTop: `1px solid ${INK_SOFT}18`, color: SLATE, fontSize: 11.5, fontWeight: 600
      }}>
        <span>Why this score · based on {signals} of {totalSignals} signals</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div style={{ marginTop: 8 }}>
          {contributions.slice(0, 6).map(c => (
            <div key={c.label} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: `1px solid ${INK_SOFT}12` }}>
              <span style={{
                flexShrink: 0, minWidth: 34, textAlign: "center", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "2px 6px",
                color: c.impact > 0 ? SAGE : RUST, background: c.impact > 0 ? `${SAGE}1a` : `${RUST}1a`
              }}>{c.impact > 0 ? "+" : ""}{c.impact}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{c.label}</div>
                <div style={{ fontSize: 10.5, color: SLATE }}>{c.reason}</div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 10, color: SLATE, marginTop: 8, fontStyle: "italic" }}>
            A self-management score from your last 7 days — not a medical measure.
          </div>
        </div>
      )}
    </div>
  );
}
