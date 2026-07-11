import { useState } from "react";
import { Check } from "lucide-react";
import { SAGE, PAPER_DIM, SLATE, VIOLET, TEXT } from "../lib/constants.js";
import { fmt, todayStr } from "../lib/helpers.js";
import { BottomSheet, Field, SmallBtn, inputStyle, minimalInputStyle } from "./shared.jsx";

export function PaycheckSheet({ onClose, onConfirm, computeSplit }) {
  const [step, setStep] = useState("amount");
  const [amount, setAmount] = useState("");

  function goToAsk() {
    if (!Number(amount)) return;
    setStep("ask");
  }

  const split = step === "ask" ? computeSplit(Number(amount)) : null;

  return (
    <BottomSheet title={step === "amount" ? "Received a paycheck" : "Budget this paycheck?"} onClose={onClose}>
      {step === "amount" ? (
        <>
          <Field label="Amount">
            <input
              style={inputStyle} type="number" inputMode="decimal" value={amount}
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") goToAsk(); }}
              autoFocus placeholder="0.00"
            />
          </Field>
          <SmallBtn tone="gold" onClick={goToAsk} style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>
            <Check size={13} /> Continue
          </SmallBtn>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.5, marginBottom: 14 }}>
            Split this <b>{fmt(Number(amount))}</b> paycheck — {fmt(split.rent)} set aside for rent, then {fmt(split.groceries)} groceries, {fmt(split.essentials)} essentials, {fmt(split.discretionary)} discretionary, {fmt(split.savings)} savings?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <SmallBtn tone="gold" onClick={() => onConfirm(amount, true)} style={{ flex: 1, justifyContent: "center" }}>
              <Check size={13} /> Budget it
            </SmallBtn>
            <SmallBtn tone="ghost" onClick={() => onConfirm(amount, false)} style={{ flex: 1, justifyContent: "center" }}>
              Just log it
            </SmallBtn>
          </div>
        </>
      )}
    </BottomSheet>
  );
}

export function DailyCheckInSheet({ onClose, todayLog, upsertHabitLog, safeToSpendPerDay, daysUntilPayday }) {
  const [form, setForm] = useState({
    identityScore: todayLog?.identityScore ?? 5,
    identityNote: todayLog?.identityNote || "",
    wakeTime: todayLog?.wakeTime || "",
    sleepTime: todayLog?.sleepTime || "",
    weight: todayLog?.weight || "",
    trained: !!todayLog?.trained,
    trainingNote: todayLog?.trainingNote || "",
  });

  function save() {
    upsertHabitLog(todayStr(), {
      identityScore: Number(form.identityScore),
      identityNote: form.identityNote,
      wakeTime: form.wakeTime,
      sleepTime: form.sleepTime,
      weight: form.weight,
      trained: form.trained,
      trainingNote: form.trained ? form.trainingNote : "",
    });
    onClose();
  }

  return (
    <BottomSheet title="Daily check-in" onClose={onClose}>
      {daysUntilPayday > 0 && (
        <div style={{ background: PAPER_DIM, borderRadius: 10, padding: "10px 12px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11.5, color: SLATE }}>Safe to spend</span>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: SAGE }}>
            {fmt(safeToSpendPerDay)}<span style={{ fontSize: 11, fontWeight: 400, color: SLATE }}>/day</span>
          </span>
        </div>
      )}

      <div style={{ fontSize: 11.5, color: SLATE, marginBottom: 6 }}>Acted like the person I'm becoming, today</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <input type="range" min={0} max={10} step={1} value={form.identityScore}
          onChange={e => setForm({ ...form, identityScore: e.target.value })}
          style={{ flex: 1, accentColor: VIOLET }} />
        <div style={{ width: 26, textAlign: "center", fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: VIOLET }}>{form.identityScore}</div>
      </div>
      <input
        value={form.identityNote} onChange={e => setForm({ ...form, identityNote: e.target.value })}
        placeholder="Why? (optional)" style={{ ...minimalInputStyle, marginBottom: 18 }}
      />

      <div style={{ fontSize: 11.5, color: SLATE, marginBottom: 8 }}>Wake time, sleep, weight, training</div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
        <Field label="Sleep time"><input style={minimalInputStyle} type="time" value={form.sleepTime} onChange={e => setForm({ ...form, sleepTime: e.target.value })} /></Field>
        <Field label="Wake time"><input style={minimalInputStyle} type="time" value={form.wakeTime} onChange={e => setForm({ ...form, wakeTime: e.target.value })} /></Field>
        <Field label="Weight (kg)"><input style={minimalInputStyle} type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></Field>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: SLATE, marginBottom: 8 }}>
        <input type="checkbox" checked={form.trained} onChange={e => setForm({ ...form, trained: e.target.checked })} /> Trained today
      </label>
      {form.trained && (
        <input
          value={form.trainingNote} onChange={e => setForm({ ...form, trainingNote: e.target.value })}
          placeholder="e.g. RDL 3x10" style={{ ...minimalInputStyle, marginBottom: 8 }}
        />
      )}

      <SmallBtn tone="gold" onClick={save} style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>
        <Check size={13} /> Save check-in
      </SmallBtn>
    </BottomSheet>
  );
}
