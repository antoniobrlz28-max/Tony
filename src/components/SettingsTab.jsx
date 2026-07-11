import { ChevronLeft, Check, RefreshCw, Trash2 } from "lucide-react";
import { TEXT, SLATE, RUST } from "../lib/constants.js";
import { Section, Field, SmallBtn, inputStyle } from "./shared.jsx";

export function SettingsTab({ data, setFixedRent, setGoalWeight, setNextPaycheck, setCycleDays, confirmAction, setConfirmAction, loadDemoData, clearData, onBack }) {
  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: TEXT, fontWeight: 600, fontSize: 13, marginBottom: 16 }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, marginBottom: 4, marginTop: 0 }}>Settings</h2>
      <div style={{ fontSize: 12, color: SLATE, marginBottom: 18 }}>Values that shape how the rest of the app calculates things</div>

      <Section title="Pay cycle" eyebrow="drives every period calculation">
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Field label="Next paycheck date">
            <input style={inputStyle} type="date" value={data.nextPaycheck} onChange={e => setNextPaycheck(e.target.value)} />
          </Field>
          <Field label="Pay cycle length (days)">
            <input style={inputStyle} type="number" min={1} value={data.cycleDays} onChange={e => setCycleDays(e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Budget">
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Field label="Fixed rent each paycheck">
            <input style={inputStyle} type="number" value={data.fixedRent} onChange={e => setFixedRent(e.target.value)} />
          </Field>
          <Field label="Goal weight (kg)">
            <input style={inputStyle} type="number" value={data.goalWeight} onChange={e => setGoalWeight(e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Data" eyebrow="replaces everything currently in the app">
        {confirmAction ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, background: `${RUST}14`, border: `1px solid ${RUST}40`, borderRadius: 10, padding: "10px 12px" }}>
            <span style={{ fontSize: 12.5, color: TEXT }}>Overwrite all data?</span>
            <div style={{ display: "flex", gap: 8 }}>
              <SmallBtn tone="rust" onClick={confirmAction === "demo" ? loadDemoData : clearData}><Check size={12} /> Confirm</SmallBtn>
              <SmallBtn tone="ghost" onClick={() => setConfirmAction(null)}>Cancel</SmallBtn>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SmallBtn tone="ghost" onClick={() => setConfirmAction("demo")}><RefreshCw size={12} /> Load demo data</SmallBtn>
            <SmallBtn tone="ghost" onClick={() => setConfirmAction("empty")}><Trash2 size={12} /> Empty fields</SmallBtn>
          </div>
        )}
      </Section>
    </div>
  );
}
