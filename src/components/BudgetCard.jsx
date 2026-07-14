import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Check, X, Edit2, Wand2 } from "lucide-react";
import { ACCENT, RUST, SAGE, SLATE, TEXT, PAPER_DIM, CARD, INK_SOFT } from "../lib/constants.js";
import { fmt, shiftMonth, lerpColor } from "../lib/helpers.js";
import { computeBudget, monthLabel, currentMonth, suggestBudgets } from "../lib/budgetEngine.js";
import { Section, SmallBtn, IconBtn, DeleteBtn, Empty, inputStyle } from "./shared.jsx";

// The whole budget, one screen: pick a month, see what's left to spend, and a
// row per category comparing spend against a flat monthly dollar budget.
export function BudgetCard({ data, editCategory, deleteCategory, addCategory, setCategoryBudgets }) {
  const [ym, setYm] = useState(currentMonth());
  const [adding, setAdding] = useState(false);
  const b = computeBudget(data, ym);
  const atCurrent = ym === currentMonth();
  const over = b.leftToSpend < 0;

  return (
    <Section
      title="Budget"
      right={
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconBtn icon={ChevronLeft} onClick={() => setYm(shiftMonth(ym, -1))} label="Previous month" />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: TEXT, minWidth: 92, textAlign: "center", whiteSpace: "nowrap" }}>
            {monthLabel(ym)}
          </span>
          <IconBtn icon={ChevronRight} onClick={() => !atCurrent && setYm(shiftMonth(ym, 1))} label="Next month" color={atCurrent ? INK_SOFT : SLATE} />
        </div>
      }
    >
      {/* Left to spend hero */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {over ? "Over budget" : atCurrent ? "Left to spend" : "Unspent"}
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.1, color: over ? RUST : SAGE, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
          {fmt(Math.abs(b.leftToSpend))}
        </div>
        <div style={{ fontSize: 11.5, color: SLATE, marginTop: 3 }}>
          <b style={{ color: TEXT }}>{fmt(b.totalSpent)}</b> spent of {fmt(b.totalBudget)} budgeted
          {atCurrent && !over && b.daysLeft > 0 && <> · {fmt(b.perDay)}/day for {b.daysLeft}d</>}
        </div>
        <div style={{ height: 8, background: PAPER_DIM, borderRadius: 4, overflow: "hidden", marginTop: 10 }}>
          <div style={{
            height: "100%", width: `${Math.min(100, b.totalBudget > 0 ? (b.totalSpent / b.totalBudget) * 100 : 0)}%`,
            background: over ? RUST : ACCENT, borderRadius: 4, transition: "width 0.5s ease"
          }} />
        </div>
      </div>

      {data.transactions.length > 0 && (
        <button
          onClick={() => setCategoryBudgets(suggestBudgets(data))}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
            padding: "9px 0", marginBottom: 14, borderRadius: 10, border: `1px solid ${ACCENT}55`,
            background: "rgba(49,134,255,0.10)", color: ACCENT, fontSize: 12, fontWeight: 700, cursor: "pointer"
          }}
        >
          <Wand2 size={13} /> Set budgets from my spending
        </button>
      )}

      {b.rows.length === 0 && <Empty text="No categories yet — add one below." />}
      {b.rows.map(row => (
        <CategoryRow key={row.id} row={row}
          onSave={updates => editCategory(row.id, updates)}
          onDelete={() => deleteCategory(row.id)} />
      ))}

      {adding ? (
        <AddCategory onAdd={(name, budget) => { addCategory(name, budget); setAdding(false); }} onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} style={{
          display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, padding: "7px 14px",
          borderRadius: 999, border: `1px dashed ${INK_SOFT}55`, background: "transparent",
          color: SLATE, fontSize: 12, fontWeight: 600, cursor: "pointer"
        }}><Plus size={13} /> Add category</button>
      )}
    </Section>
  );
}

function CategoryRow({ row, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [name, setName] = useState(row.name);
  const [budget, setBudget] = useState(row.budget);

  if (editing) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}>
        <input style={{ ...inputStyle, flex: 2 }} value={name} onChange={e => setName(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1 }} type="number" inputMode="decimal" value={budget} onChange={e => setBudget(e.target.value)} placeholder="/mo" />
        <IconBtn icon={Check} color={SAGE} onClick={() => { onSave({ name, budget }); setEditing(false); }} label="Save" />
        <IconBtn icon={X} onClick={() => setEditing(false)} label="Cancel" />
      </div>
    );
  }

  const over = row.spent > row.budget && row.budget > 0;
  const barColor = row.budget > 0 ? lerpColor(SAGE, RUST, Math.min(1, row.pct / 100)) : SLATE;
  return (
    <div onClick={() => setRevealed(r => !r)} style={{ marginBottom: 14, cursor: "pointer", userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={e => revealed && e.stopPropagation()}>
          <span style={{ fontSize: 12, color: over ? RUST : SLATE, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            {fmt(row.spent)} <span style={{ opacity: 0.6 }}>/ {fmt(row.budget)}</span>
          </span>
          {revealed && (
            <>
              <IconBtn icon={Edit2} onClick={() => setEditing(true)} label="Edit" />
              <DeleteBtn onDelete={onDelete} />
            </>
          )}
        </div>
      </div>
      <div style={{ height: 7, background: PAPER_DIM, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: Math.min(100, row.pct) + "%", background: barColor, borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
      <div style={{ fontSize: 10.5, color: over ? RUST : SLATE, marginTop: 4 }}>
        {row.budget === 0 ? "No budget set — tap to add one" : over ? `${fmt(row.spent - row.budget)} over` : `${fmt(row.remaining)} left`}
      </div>
    </div>
  );
}

function AddCategory({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
      <input style={{ ...inputStyle, flex: 2 }} placeholder="Category" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <input style={{ ...inputStyle, flex: 1 }} type="number" inputMode="decimal" placeholder="$/mo" value={budget} onChange={e => setBudget(e.target.value)} />
      <SmallBtn tone="gold" onClick={() => onAdd(name, budget)}><Check size={13} /></SmallBtn>
      <SmallBtn tone="ghost" onClick={onCancel}><X size={13} /></SmallBtn>
    </div>
  );
}
