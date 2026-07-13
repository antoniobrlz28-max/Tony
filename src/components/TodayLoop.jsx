import { Sparkles, Plus, Check, X, RotateCcw, Circle } from "lucide-react";
import { ACCENT, SAGE, RUST, VIOLET, SLATE, TEXT, CARD, INK_SOFT, PAPER_DIM } from "../lib/constants.js";
import { todayStr } from "../lib/helpers.js";

// The closed loop, on Home (Blueprint §4, §13): one recommendation, explained,
// that converts to a Today task; tasks complete/skip; completing asks "did this
// help?" so the recommendation engine can learn. No action is irreversible.

export function RecommendationCard({ rec, onAccept, onDismiss }) {
  if (!rec) return null;
  return (
    <div className="fade-up" style={{ marginBottom: 20, background: CARD, borderRadius: 22, padding: "16px", border: `1px solid ${ACCENT}44` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Sparkles size={14} color={ACCENT} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.06em" }}>Recommended action</span>
        <span style={{ marginLeft: "auto", fontSize: 9.5, fontWeight: 700, color: VIOLET, textTransform: "uppercase", letterSpacing: "0.04em" }}>{rec.confidence}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, letterSpacing: "-0.01em" }}>{rec.title}</div>
      <div style={{ fontSize: 12, color: SLATE, marginTop: 5, lineHeight: 1.5 }}>{rec.detail}</div>
      <div style={{ fontSize: 11, color: SLATE, marginTop: 8, paddingLeft: 10, borderLeft: `2px solid ${INK_SOFT}44`, lineHeight: 1.45 }}>
        {rec.reason}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {rec.domains.map(dm => (
          <span key={dm} style={{ fontSize: 9.5, fontWeight: 700, color: SLATE, background: PAPER_DIM, borderRadius: 999, padding: "3px 9px" }}>{dm}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={() => onAccept(rec)} style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          background: ACCENT, color: "#fff", border: "none", borderRadius: 999, padding: "10px 0",
          fontSize: 12.5, fontWeight: 700, cursor: "pointer"
        }}>
          <Plus size={13} /> Add to Today
        </button>
        <button onClick={() => onDismiss(rec)} aria-label="Dismiss" style={{
          background: "transparent", color: SLATE, border: `1px solid ${INK_SOFT}55`, borderRadius: 999,
          padding: "10px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer"
        }}>
          Not now
        </button>
      </div>
    </div>
  );
}

export function TodayCard({ tasks, onComplete, onSkip, onReopen, onFeedback }) {
  const today = todayStr();
  const todays = tasks.filter(t => t.date === today);
  if (todays.length === 0) return null;
  const open = todays.filter(t => t.status === "planned");
  const done = todays.filter(t => t.status !== "planned");

  return (
    <div className="fade-up" style={{ marginBottom: 20, background: CARD, borderRadius: 22, padding: "18px 16px", border: `1px solid ${INK_SOFT}18` }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, color: TEXT, margin: 0, fontWeight: 600 }}>Today</h2>
        <span style={{ fontSize: 11, color: SLATE }}>{done.length}/{todays.length} done</span>
      </div>

      {open.length === 0 && done.length > 0 && (
        <div style={{ fontSize: 12, color: SAGE, marginBottom: 10 }}>Everything you set out to do is done.</div>
      )}

      {todays.map(t => (
        <div key={t.id} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: PAPER_DIM }}>
            <button onClick={() => (t.status === "planned" ? onComplete(t) : onReopen(t))} aria-label="Toggle done" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}>
              {t.status === "completed" ? <Check size={19} color={SAGE} /> : t.status === "skipped" ? <RotateCcw size={17} color={SLATE} /> : <Circle size={19} color={SLATE} />}
            </button>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textDecoration: t.status === "completed" ? "line-through" : "none", opacity: t.status === "skipped" ? 0.5 : 1 }}>{t.title}</div>
              {t.domains && <div style={{ fontSize: 10.5, color: SLATE, marginTop: 1 }}>{t.domains.join(" · ")}</div>}
            </div>
            {t.status === "planned" && (
              <button onClick={() => onSkip(t)} aria-label="Skip" style={{ background: "none", border: "none", cursor: "pointer", color: SLATE, padding: 4, display: "flex", flexShrink: 0 }}>
                <X size={15} />
              </button>
            )}
          </div>

          {t.status === "completed" && t.helped === undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px 2px 42px" }}>
              <span style={{ fontSize: 11, color: SLATE }}>Did this help?</span>
              {[["yes", "Yes", SAGE], ["some", "Somewhat", VIOLET], ["no", "No", RUST]].map(([v, label, color]) => (
                <button key={v} onClick={() => onFeedback(t, v)} style={{
                  fontSize: 11, fontWeight: 600, color, background: `${color}1a`, border: `1px solid ${color}44`,
                  borderRadius: 999, padding: "3px 10px", cursor: "pointer"
                }}>{label}</button>
              ))}
            </div>
          )}
          {t.status === "completed" && t.helped !== undefined && (
            <div style={{ fontSize: 10.5, color: SLATE, padding: "4px 12px 2px 42px" }}>
              Feedback saved — {t.helped === "yes" ? "helped" : t.helped === "some" ? "somewhat" : "didn't help"}.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
