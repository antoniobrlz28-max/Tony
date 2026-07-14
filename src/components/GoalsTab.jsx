import { useState } from "react";
import { Plus, PiggyBank, Target, Check, X, Edit2 } from "lucide-react";
import { SAGE, ACCENT, SKY, CARD, INK_SOFT, SLATE, PAPER_DIM } from "../lib/constants.js";
import { uid, fmt } from "../lib/helpers.js";
import { Section, StatTile, Empty, SmallBtn, IconBtn, DeleteBtn, ProgressBar, inputStyle } from "./shared.jsx";

export function GoalsTab({ data, setData, contributeGoal, editGoal, deleteGoal }) {
  const [addOpen, setAddOpen] = useState(false);

  function addGoal(name, target) {
    if (!name) return;
    setData(d => ({ ...d, goals: [...d.goals, { id: uid(), name, target: Number(target) || 0, saved: 0 }] }));
    setAddOpen(false);
  }

  const totalSaved = data.goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = data.goals.reduce((s, g) => s + g.target, 0);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);
  const completed = data.goals.filter(g => g.target > 0 && g.saved >= g.target).length;

  return (
    <Section
      title="Goals"
      right={<SmallBtn tone="gold" onClick={() => setAddOpen(o => !o)}><Plus size={12} /> Add goal</SmallBtn>}
    >
      {data.goals.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          <StatTile icon={PiggyBank} color={SAGE} valueColor={SAGE} value={fmt(totalSaved)} label="Saved" caption="so far" />
          <StatTile icon={Target} color={ACCENT} value={fmt(totalRemaining)} label="Remaining" caption="to go" />
          <StatTile icon={Check} color={SKY} value={data.goals.length} label="Goals" caption={`${completed} completed`} />
        </div>
      )}

      {addOpen && <AddGoalForm onAdd={addGoal} onCancel={() => setAddOpen(false)} />}

      {data.goals.length === 0 && !addOpen && <Empty text="No goals yet — add one above." />}
      {data.goals.map(g => (
        <GoalRow key={g.id} goal={g} data={data}
          onContribute={(amount, accountId) => contributeGoal(g, amount, accountId)}
          onSave={updates => editGoal(g.id, updates)}
          onDelete={() => deleteGoal(g.id)} />
      ))}
    </Section>
  );
}

function GoalRow({ goal, data, onContribute, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(goal.target);
  const [contributing, setContributing] = useState(false);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(data.accounts[0]?.id || "");
  const pct = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;

  if (editing) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}>
        <input style={{ ...inputStyle, flex: 2 }} value={name} onChange={e => setName(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1 }} type="number" value={target} onChange={e => setTarget(e.target.value)} />
        <IconBtn icon={Check} color={SAGE} onClick={() => { onSave({ name, target, saved: goal.saved }); setEditing(false); }} label="Save" />
        <IconBtn icon={X} onClick={() => setEditing(false)} label="Cancel" />
      </div>
    );
  }

  return (
    <div style={{
      marginBottom: 8, padding: "10px 12px", borderRadius: 8, background: PAPER_DIM
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>{goal.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: SLATE }}><span style={{ color: SAGE, fontWeight: 700 }}>{fmt(goal.saved)}</span> / {fmt(goal.target)}</span>
          <IconBtn icon={Edit2} onClick={() => setEditing(true)} label="Edit" />
          <DeleteBtn onDelete={onDelete} />
        </div>
      </div>
      <ProgressBar pct={pct} tone="gold" />
      {contributing ? (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
          <select style={{ ...inputStyle, flex: 1 }} value={accountId} onChange={e => setAccountId(e.target.value)}>
            {data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <SmallBtn tone="gold" onClick={() => { onContribute(amount, accountId); setAmount(""); setContributing(false); }}><Check size={13} /></SmallBtn>
          <SmallBtn tone="ghost" onClick={() => setContributing(false)}><X size={13} /></SmallBtn>
        </div>
      ) : (
        <SmallBtn onClick={() => setContributing(true)} style={{ marginTop: 8, padding: "5px 10px", fontSize: 11 }}><Plus size={11} /> Contribute</SmallBtn>
      )}
    </div>
  );
}

function AddGoalForm({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  return (
    <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 14, padding: 14, marginBottom: 16, display: "flex", gap: 6 }}>
      <input style={{ ...inputStyle, flex: 2 }} placeholder="Goal name" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="Target" value={target} onChange={e => setTarget(e.target.value)} />
      <SmallBtn tone="gold" onClick={() => onAdd(name, target)}><Check size={13} /></SmallBtn>
      <SmallBtn tone="ghost" onClick={onCancel}><X size={13} /></SmallBtn>
    </div>
  );
}
