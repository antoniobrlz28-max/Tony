import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, UtensilsCrossed, Wine, Dumbbell, Scale, Activity, Check, ChevronLeft } from "lucide-react";
import { ACCENT, SAGE, RUST, TEAL, AMBER, CORAL, SKY, VIOLET, PAPER, SLATE, TEXT, INK_SOFT, PAPER_DIM } from "../lib/constants.js";
import { todayStr } from "../lib/helpers.js";
import { BottomSheet, SmallBtn, Field, inputStyle } from "./shared.jsx";

function autoMeal() {
  const h = new Date().getHours();
  return h < 11 ? "Breakfast" : h < 16 ? "Lunch" : h < 21 ? "Dinner" : "Snack";
}

export function QuickAddFab({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Quick add" style={{
      position: "fixed", right: 16, bottom: "calc(84px + env(safe-area-inset-bottom))", width: 54, height: 54, borderRadius: 18,
      background: ACCENT, color: PAPER, border: "none", cursor: "pointer", zIndex: 40,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 8px 24px rgba(49,134,255,0.5)"
    }}>
      <Plus size={24} />
    </button>
  );
}

export function QuickAddSheet({ data, onClose, addExpense, addIncome, addFoodItem, incrementAlcohol, toggleHabitBool, upsertHabitLog, openCheckIn }) {
  const [step, setStep] = useState(null);
  const checking = data.accounts.find(a => a.type === "checking") || data.accounts[0];
  const discCat = data.categories.find(c => c.name.toLowerCase().includes("discretionary")) || data.categories[0];
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState(discCat?.id || "");
  const [food, setFood] = useState({ name: "", calories: "", protein: "" });
  const [weight, setWeight] = useState("");

  const ACTIONS = [
    { id: "expense", label: "Expense", icon: TrendingDown, color: RUST },
    { id: "income", label: "Income", icon: TrendingUp, color: SAGE },
    { id: "food", label: "Food", icon: UtensilsCrossed, color: AMBER },
    { id: "weight", label: "Weight", icon: Scale, color: SKY },
    { id: "drink", label: "Drink +1", icon: Wine, color: CORAL },
    { id: "trained", label: "Trained ✓", icon: Dumbbell, color: TEAL },
    { id: "checkin", label: "Check-in", icon: Activity, color: VIOLET },
  ];

  function pick(id) {
    // Instant one-tap actions log and close; the rest open a two-field form
    if (id === "drink") { incrementAlcohol(todayStr()); onClose(); return; }
    if (id === "trained") { toggleHabitBool(todayStr(), "trained"); onClose(); return; }
    if (id === "checkin") { openCheckIn(); return; }
    setStep(id);
  }

  function saveExpense() {
    if (!amount || !checking) return;
    addExpense({ amount, accountId: checking.id, categoryId, note });
    onClose();
  }
  function saveIncome() {
    if (!amount || !checking) return;
    addIncome({ amount, accountId: checking.id, note });
    onClose();
  }
  function saveFood() {
    if (!food.name) return;
    addFoodItem({
      date: todayStr(), name: food.name, meal: autoMeal(),
      calories: Number(food.calories) || 0, protein: Number(food.protein) || 0, carbs: 0, fat: 0,
    });
    onClose();
  }
  function saveWeight() {
    if (!weight) return;
    upsertHabitLog(todayStr(), { weight: Number(weight) });
    onClose();
  }

  const titles = { expense: "Add expense", income: "Add income", food: "Log food", weight: "Log weight" };

  return (
    <BottomSheet title={step ? titles[step] : "Quick add"} onClose={onClose}>
      {!step && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {ACTIONS.map(a => {
            const AIcon = a.icon;
            return (
              <button key={a.id} onClick={() => pick(a.id)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                padding: "16px 6px", borderRadius: 14, border: `1px solid ${INK_SOFT}22`,
                background: PAPER_DIM, color: TEXT, cursor: "pointer"
              }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${a.color}1f`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AIcon size={16} color={a.color} />
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600 }}>{a.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {step && (
        <button onClick={() => setStep(null)} style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: SLATE, fontSize: 11.5, fontWeight: 600, marginBottom: 12, padding: 0 }}>
          <ChevronLeft size={13} /> All actions
        </button>
      )}

      {(step === "expense" || step === "income") && (
        <>
          <Field label="Amount">
            <input style={inputStyle} type="number" inputMode="decimal" autoFocus value={amount}
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") (step === "expense" ? saveExpense() : saveIncome()); }} />
          </Field>
          {step === "expense" && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {data.categories.map(c => (
                <button key={c.id} onClick={() => setCategoryId(c.id)} style={{
                  padding: "6px 12px", borderRadius: 999, border: `1px solid ${categoryId === c.id ? ACCENT : INK_SOFT + "40"}`,
                  background: categoryId === c.id ? "rgba(49,134,255,0.12)" : "transparent",
                  color: categoryId === c.id ? ACCENT : TEXT, fontSize: 12, cursor: "pointer"
                }}>{c.name}</button>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <Field label="Note (optional)">
              <input style={inputStyle} value={note} onChange={e => setNote(e.target.value)} />
            </Field>
          </div>
          <SmallBtn tone="gold" onClick={step === "expense" ? saveExpense : saveIncome} style={{ marginTop: 16, width: "100%" }}>
            <Check size={13} /> Save {step}
          </SmallBtn>
        </>
      )}

      {step === "food" && (
        <>
          <Field label="What did you eat?">
            <input style={inputStyle} autoFocus value={food.name} onChange={e => setFood({ ...food, name: e.target.value })} placeholder="e.g. Chicken burrito bowl" />
          </Field>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <Field label="Calories">
              <input style={inputStyle} type="number" value={food.calories} onChange={e => setFood({ ...food, calories: e.target.value })} />
            </Field>
            <Field label="Protein (g)">
              <input style={inputStyle} type="number" value={food.protein} onChange={e => setFood({ ...food, protein: e.target.value })} />
            </Field>
          </div>
          <SmallBtn onClick={saveFood} style={{ marginTop: 16, width: "100%", background: AMBER }}>
            <Check size={13} /> Add to {autoMeal()}
          </SmallBtn>
        </>
      )}

      {step === "weight" && (
        <>
          <Field label="Weight (kg)">
            <input style={inputStyle} type="number" inputMode="decimal" autoFocus value={weight}
              onChange={e => setWeight(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveWeight(); }} />
          </Field>
          <SmallBtn onClick={saveWeight} style={{ marginTop: 16, width: "100%", background: SKY }}>
            <Check size={13} /> Save weight
          </SmallBtn>
        </>
      )}
    </BottomSheet>
  );
}
