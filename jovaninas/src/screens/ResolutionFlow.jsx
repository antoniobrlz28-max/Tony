import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp, HelpCircle, Trash2 } from "lucide-react";

// One-question-at-a-time resolution flow for unresolved extracted items
// Focused on: is this item OK? Does it need correction? Should we skip it?

export default function ResolutionFlow({ item, itemIdx, sectionIdx, onResolve, onSkip }) {
  const [question, setQuestion] = useState("review"); // review | correct | confirm | skip
  const [correctedItem, setCorrectedItem] = useState(item);
  const [showDetails, setShowDetails] = useState(false);

  function accept() {
    onResolve(structuredClone(correctedItem));
  }

  function skip() {
    onSkip();
  }

  function startCorrection() {
    setQuestion("correct");
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(30,26,15,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 60,
    }}>
      <div className="card" style={{
        width: "min(420px, 90vw)",
        maxHeight: "80vh",
        overflowY: "auto",
        padding: 16,
      }}>
        {question === "review" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={16} color="var(--brass)" />
              <h3 style={{ margin: 0 }}>Review this item</h3>
            </div>
            <p className="tiny muted" style={{ marginBottom: 12 }}>
              Section {sectionIdx + 1} · Item {itemIdx + 1}
            </p>

            {/* Item preview */}
            <div className="card" style={{
              background: "var(--bg-secondary)",
              marginBottom: 14,
              padding: 10,
            }}>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>{correctedItem.name}</p>
              {correctedItem.description && (
                <p className="small muted" style={{ marginBottom: 6 }}>
                  {correctedItem.description}
                </p>
              )}
              {correctedItem.price !== null && (
                <p className="small" style={{ color: "var(--forest)", fontWeight: 500 }}>
                  ${correctedItem.price.toFixed(2)}
                </p>
              )}
            </div>

            {/* Show confidence issues if available */}
            {item.issues && item.issues.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <button
                  className="btn ghost"
                  style={{
                    width: "100%",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <span className="small">
                    {item.issues.length} {item.issues.length === 1 ? "issue" : "issues"}
                  </span>
                  {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showDetails && (
                  <div style={{ background: "var(--bg-secondary)", padding: 8, borderRadius: 6, marginBottom: 10 }}>
                    {item.issues.map((issue, i) => (
                      <div key={i} style={{ marginBottom: i < item.issues.length - 1 ? 8 : 0 }}>
                        <p className="tiny" style={{
                          color: issue.severity === "critical" ? "var(--red)" : "var(--brass)",
                          fontWeight: 500,
                        }}>
                          {issue.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={skip}>
                Skip / Remove
              </button>
              <button className="btn accent" style={{ flex: 1 }} onClick={accept}>
                <Check size={12} /> Accept
              </button>
            </div>

            <button
              className="btn ghost"
              style={{ width: "100%", marginTop: 8 }}
              onClick={startCorrection}
            >
              Edit / Correct
            </button>
          </>
        )}

        {question === "correct" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <HelpCircle size={16} color="var(--brass)" />
              <h3 style={{ margin: 0 }}>Make corrections</h3>
            </div>

            <label className="field">
              Dish name
              <input
                type="text"
                value={correctedItem.name}
                onChange={(e) => setCorrectedItem((prev) => ({ ...prev, name: e.target.value }))}
              />
            </label>

            <label className="field">
              Description / Components
              <textarea
                rows={3}
                value={correctedItem.description}
                onChange={(e) =>
                  setCorrectedItem((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </label>

            <label className="field">
              Price (optional)
              <input
                type="number"
                step="0.01"
                value={correctedItem.price ?? ""}
                onChange={(e) =>
                  setCorrectedItem((prev) => ({
                    ...prev,
                    price: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => setQuestion("review")}>
                Back
              </button>
              <button
                className="btn accent"
                style={{ flex: 1 }}
                onClick={() => {
                  onResolve(structuredClone(correctedItem));
                }}
              >
                <Check size={12} /> Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
