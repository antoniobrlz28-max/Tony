import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Check, Edit2 } from "lucide-react";
import { BarChart, Bar, XAxis, ReferenceLine, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { TEAL, AMBER, CORAL, RUST, SLATE, TEXT, INK_SOFT, PAPER_DIM } from "../lib/constants.js";
import { todayStr, addDays } from "../lib/helpers.js";
import { Section, IconBtn, DeleteBtn, SmallBtn, Field, Empty, BottomSheet, inputStyle, minimalInputStyle } from "./shared.jsx";

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"];

function autoMeal() {
  const h = new Date().getHours();
  return h < 11 ? "Breakfast" : h < 16 ? "Lunch" : h < 21 ? "Dinner" : "Snack";
}

function CalorieRing({ eaten, target }) {
  const pct = target > 0 ? eaten / target : 0;
  const over = pct > 1;
  const color = over ? RUST : pct > 0.85 ? AMBER : TEAL;
  const R = 52, C = 2 * Math.PI * R;
  const remaining = Math.round(target - eaten);
  return (
    <div style={{ position: "relative", width: 132, height: 132, flexShrink: 0 }}>
      <svg width={132} height={132}>
        <circle cx={66} cy={66} r={R} fill="none" stroke={PAPER_DIM} strokeWidth={10} />
        <circle
          cx={66} cy={66} r={R} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, pct))}
          transform="rotate(-90 66 66)" style={{ transition: "stroke-dashoffset 0.4s, stroke 0.4s" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: over ? RUST : TEXT, lineHeight: 1 }}>
          {Math.abs(remaining).toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color: SLATE, marginTop: 3 }}>{over ? "over" : "left"} of {target.toLocaleString()}</div>
      </div>
    </div>
  );
}

function MacroBar({ label, value, target, color }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
        <span style={{ fontWeight: 700, color: TEXT }}>{label}</span>
        <span style={{ color: SLATE }}>{Math.round(value)} / {target}g</span>
      </div>
      <div style={{ height: 6, background: PAPER_DIM, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 3, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

function FoodItemRow({ item, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [f, setF] = useState({ name: item.name, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat });
  if (editing) {
    return (
      <div style={{ padding: "8px 0", borderBottom: `1px solid ${INK_SOFT}18` }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
          <input style={{ ...inputStyle, flex: 2 }} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Item name" />
          <input style={{ ...inputStyle, flex: 1 }} type="number" value={f.protein} onChange={e => setF({ ...f, protein: e.target.value })} placeholder="Protein" />
          <input style={{ ...inputStyle, flex: 1 }} type="number" value={f.carbs} onChange={e => setF({ ...f, carbs: e.target.value })} placeholder="Carbs" />
          <input style={{ ...inputStyle, flex: 1 }} type="number" value={f.fat} onChange={e => setF({ ...f, fat: e.target.value })} placeholder="Fat" />
          <input style={{ ...inputStyle, flex: 1 }} type="number" value={f.calories} onChange={e => setF({ ...f, calories: e.target.value })} placeholder="Calories" />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <SmallBtn tone="gold" onClick={() => { onSave(f); setEditing(false); }}><Check size={12} /> Save</SmallBtn>
          <SmallBtn tone="ghost" onClick={() => setEditing(false)}>Cancel</SmallBtn>
        </div>
      </div>
    );
  }
  return (
    <div onClick={() => setRevealed(r => !r)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${INK_SOFT}18`, fontSize: 12.5, cursor: "pointer", userSelect: "none" }}>
      <div>
        <div style={{ fontWeight: 600 }}>{item.name}</div>
        <div style={{ color: SLATE, fontSize: 11 }}>P {item.protein || 0}g · C {item.carbs || 0}g · F {item.fat || 0}g</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => revealed && e.stopPropagation()}>
        <span style={{ fontWeight: 700, color: AMBER }}>{item.calories || 0} cal</span>
        {revealed && (
          <>
            <IconBtn icon={Edit2} onClick={() => setEditing(true)} label="Edit" />
            <DeleteBtn onDelete={onDelete} />
          </>
        )}
      </div>
    </div>
  );
}

export function NutritionLog({ data, addFoodItem, editFoodItem, deleteFoodItem }) {
  const [viewDate, setViewDate] = useState(todayStr());
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [form, setForm] = useState({ name: "", protein: "", carbs: "", fat: "", calories: "", meal: autoMeal() });

  const target = Number(data.calorieTarget) || 2200;
  const proteinTarget = Math.max(1, Math.round((Number(data.goalWeight) || 80) * 2));
  const fatTarget = Math.round((target * 0.25) / 9);
  const carbTarget = Math.max(1, Math.round((target - proteinTarget * 4 - fatTarget * 9) / 4));

  const items = data.foodItems.filter(f => f.date === viewDate);
  const totals = items.reduce((acc, f) => ({
    protein: acc.protein + Number(f.protein || 0),
    carbs: acc.carbs + Number(f.carbs || 0),
    fat: acc.fat + Number(f.fat || 0),
    calories: acc.calories + Number(f.calories || 0),
  }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

  // Most-logged foods across all history, one tap to re-log for the viewed day
  const freq = {};
  for (const f of data.foodItems) {
    if (!f.name) continue;
    if (!freq[f.name]) freq[f.name] = { count: 0, item: f };
    freq[f.name].count++;
    if (f.date > freq[f.name].item.date) freq[f.name].item = f;
  }
  const quickAdds = Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 8).map(x => x.item);

  // 7-day window ending on the viewed day; tap a bar to jump to that day
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(viewDate, -(6 - i));
    const cal = data.foodItems.filter(f => f.date === date).reduce((s, f) => s + Number(f.calories || 0), 0);
    return { date, cal, label: new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "narrow" }) };
  });

  const groups = MEALS.map(m => ({ meal: m, items: items.filter(f => f.meal === m) }));
  const other = items.filter(f => !MEALS.includes(f.meal));
  if (other.length) groups.push({ meal: "Other", items: other });

  const isToday = viewDate === todayStr();
  const dayLabel = isToday ? "Today" : new Date(viewDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  function quickLog(item) {
    addFoodItem({
      date: viewDate, name: item.name, meal: autoMeal(),
      calories: Number(item.calories) || 0, protein: Number(item.protein) || 0,
      carbs: Number(item.carbs) || 0, fat: Number(item.fat) || 0,
    });
  }
  function submit() {
    if (!form.name) return;
    addFoodItem({
      date: viewDate, name: form.name, meal: form.meal,
      calories: Number(form.calories) || 0, protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0, fat: Number(form.fat) || 0,
    });
    setForm({ name: "", protein: "", carbs: "", fat: "", calories: "", meal: form.meal });
    setShowAddSheet(false);
  }

  return (
    <Section
      title="Nutrition"
      eyebrow="calories & macros"
      right={
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconBtn icon={ChevronLeft} onClick={() => setViewDate(addDays(viewDate, -1))} label="Previous day" />
          <span style={{ fontSize: 12, fontWeight: 700, color: TEXT, minWidth: 74, textAlign: "center" }}>{dayLabel}</span>
          <IconBtn icon={ChevronRight} color={isToday ? `${SLATE}55` : undefined} onClick={() => { if (!isToday) setViewDate(addDays(viewDate, 1)); }} label="Next day" />
        </div>
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
        <CalorieRing eaten={totals.calories} target={target} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <MacroBar label="Protein" value={totals.protein} target={proteinTarget} color={TEAL} />
          <MacroBar label="Carbs" value={totals.carbs} target={carbTarget} color={AMBER} />
          <MacroBar label="Fat" value={totals.fat} target={fatTarget} color={CORAL} />
        </div>
      </div>

      {quickAdds.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Quick add</div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {quickAdds.map(item => (
              <button key={item.name} onClick={() => quickLog(item)} style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 999,
                border: `1px solid ${INK_SOFT}40`, background: "transparent", color: TEXT, fontSize: 12,
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0
              }}>
                <Plus size={11} color={SLATE} /> {item.name} <span style={{ color: AMBER, fontWeight: 700 }}>{item.calories}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && <Empty text={`Nothing logged ${isToday ? "today" : "this day"} yet.`} />}
      {groups.filter(g => g.items.length > 0).map(g => (
        <div key={g.meal} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em" }}>{g.meal}</span>
            <span style={{ fontSize: 10.5, color: SLATE }}>{g.items.reduce((s, f) => s + Number(f.calories || 0), 0)} cal</span>
          </div>
          {g.items.map(item => (
            <FoodItemRow key={item.id} item={item} onSave={updates => editFoodItem(item.id, updates)} onDelete={() => deleteFoodItem(item.id)} />
          ))}
        </div>
      ))}

      <SmallBtn onClick={() => { setForm(f => ({ ...f, meal: autoMeal() })); setShowAddSheet(true); }} style={{ marginTop: 4, background: AMBER }}>
        <Plus size={13} /> Add food
      </SmallBtn>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 10.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Last 7 days · tap to view</div>
        <div style={{ height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => [`${v} cal`]} labelFormatter={(_, p) => p?.[0]?.payload?.date || ""} />
              <ReferenceLine y={target} stroke={SLATE} strokeDasharray="4 4" />
              <Bar dataKey="cal" radius={[4, 4, 0, 0]} onClick={d => d?.date && setViewDate(d.date)} cursor="pointer">
                {weekData.map(w => (
                  <Cell key={w.date} fill={w.date === viewDate ? AMBER : w.cal > target ? RUST : TEAL} fillOpacity={w.date === viewDate ? 1 : 0.65} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showAddSheet && (
        <BottomSheet title={`Add food · ${dayLabel}`} onClose={() => setShowAddSheet(false)}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {MEALS.map(m => (
              <button key={m} onClick={() => setForm({ ...form, meal: m })} style={{
                padding: "6px 12px", borderRadius: 999, border: `1px solid ${form.meal === m ? AMBER : INK_SOFT + "40"}`,
                background: form.meal === m ? `${AMBER}1f` : "transparent", color: form.meal === m ? AMBER : TEXT,
                fontSize: 12.5, fontWeight: form.meal === m ? 700 : 400, cursor: "pointer"
              }}>{m}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Field label="Item name"><input style={minimalInputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chicken breast" autoFocus /></Field>
            <Field label="Calories"><input style={minimalInputStyle} type="number" value={form.calories} onChange={e => setForm({ ...form, calories: e.target.value })} /></Field>
            <Field label="Protein (g)"><input style={minimalInputStyle} type="number" value={form.protein} onChange={e => setForm({ ...form, protein: e.target.value })} /></Field>
            <Field label="Carbs (g)"><input style={minimalInputStyle} type="number" value={form.carbs} onChange={e => setForm({ ...form, carbs: e.target.value })} /></Field>
            <Field label="Fat (g)"><input style={minimalInputStyle} type="number" value={form.fat} onChange={e => setForm({ ...form, fat: e.target.value })} /></Field>
          </div>
          <SmallBtn onClick={submit} style={{ marginTop: 18, background: AMBER, width: "100%", justifyContent: "center" }}><Plus size={13} /> Add to {form.meal}</SmallBtn>
        </BottomSheet>
      )}
    </Section>
  );
}
