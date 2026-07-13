import { useState, useRef } from "react";
import { ChevronLeft, Check, RefreshCw, Trash2, Download, Upload, AlertCircle } from "lucide-react";
import { TEXT, SLATE, SAGE, RUST, STORAGE_KEY } from "../lib/constants.js";
import { todayStr } from "../lib/helpers.js";
import { Section, Field, SmallBtn, Empty, inputStyle } from "./shared.jsx";

export function SettingsTab({ data, setFixedRent, setGoalWeight, setCalorieTarget, setNextPaycheck, setCycleDays, confirmAction, setConfirmAction, loadDemoData, clearData, onRestore, onBack }) {
  const [restoreMsg, setRestoreMsg] = useState(null); // { ok: boolean, text: string }
  const restoreRef = useRef(null);

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `life-os-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onRestore(JSON.parse(String(reader.result)));
        setRestoreMsg({ ok: true, text: "Backup restored — everything is back." });
      } catch (err) {
        setRestoreMsg({ ok: false, text: err.message || "Couldn't read that file." });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const sizeKB = Math.max(1, Math.round(JSON.stringify(data).length / 1024));

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: TEXT, fontWeight: 600, fontSize: 13, marginBottom: 16 }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>
      <h2 style={{ fontSize: 20, marginBottom: 4, marginTop: 0 }}>Settings</h2>
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
        <Field label="Monthly rent">
          <input style={inputStyle} type="number" value={data.fixedRent} onChange={e => setFixedRent(e.target.value)} />
        </Field>
      </Section>

      <Section title="Nutrition & body" eyebrow="drives the calorie ring and macro targets">
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Field label="Daily calorie target">
            <input style={inputStyle} type="number" value={data.calorieTarget} onChange={e => setCalorieTarget(e.target.value)} />
          </Field>
          <Field label="Goal weight (kg)">
            <input style={inputStyle} type="number" value={data.goalWeight} onChange={e => setGoalWeight(e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Backup & restore" eyebrow="your data lives only on this device — keep a copy">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <SmallBtn tone="gold" onClick={downloadBackup}><Download size={12} /> Download backup</SmallBtn>
          <SmallBtn tone="ghost" onClick={() => restoreRef.current?.click()}><Upload size={12} /> Restore from file</SmallBtn>
          <input ref={restoreRef} type="file" accept="application/json,.json" onChange={handleRestoreFile} style={{ display: "none" }} />
        </div>
        {restoreMsg && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: restoreMsg.ok ? SAGE : RUST, marginBottom: 8 }}>
            {restoreMsg.ok ? <Check size={13} /> : <AlertCircle size={13} />} {restoreMsg.text}
          </div>
        )}
        <div style={{ fontSize: 11, color: SLATE, lineHeight: 1.5 }}>
          The backup is one small file ({sizeKB} KB) with everything — accounts, transactions, bills, habits, food logs.
          Restoring replaces what's currently in the app. Do this before clearing your browser or moving to a new device or URL.
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

      <Section title="About" eyebrow="what's stored right now">
        {data.transactions.length === 0 && data.habits.length === 0 ? (
          <Empty text="Nothing logged yet." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", fontSize: 12.5 }}>
            <span style={{ color: SLATE }}>Transactions</span><span style={{ fontWeight: 700, textAlign: "right" }}>{data.transactions.length}</span>
            <span style={{ color: SLATE }}>Days of habits</span><span style={{ fontWeight: 700, textAlign: "right" }}>{data.habits.length}</span>
            <span style={{ color: SLATE }}>Food entries</span><span style={{ fontWeight: 700, textAlign: "right" }}>{data.foodItems.length}</span>
            <span style={{ color: SLATE }}>Bills tracked</span><span style={{ fontWeight: 700, textAlign: "right" }}>{data.bills.length}</span>
            <span style={{ color: SLATE }}>Storage used</span><span style={{ fontWeight: 700, textAlign: "right" }}>{sizeKB} KB</span>
            <span style={{ color: SLATE }}>Saved under</span><span style={{ fontWeight: 700, textAlign: "right", fontSize: 10.5, alignSelf: "center" }}>{STORAGE_KEY}</span>
          </div>
        )}
      </Section>
    </div>
  );
}
