import { useState } from "react";
import { Plus, TrendingDown, Check, CreditCard, Lightbulb, Edit2, X } from "lucide-react";
import { SAGE, SKY, GOLD, PAPER_DIM, TEXT, CARD, INK_SOFT, SLATE } from "../lib/constants.js";
import { uid, fmt, formatShortDate, payoffProjection } from "../lib/helpers.js";
import { Section, StatTile, Empty, SmallBtn, IconBtn, DeleteBtn, ProgressBar, inputStyle } from "./shared.jsx";

export function DebtTab({ data, setData, payDebt, editDebt, deleteDebt }) {
  const [addOpen, setAddOpen] = useState(false);

  function addDebt(name, total, rate) {
    if (!name) return;
    setData(d => ({ ...d, debts: [...d.debts, { id: uid(), name, total: Number(total) || 0, rate: Number(rate) || 0, paid: 0, payments: [] }] }));
    setAddOpen(false);
  }

  const totalRemaining = data.debts.reduce((s, x) => s + Math.max(0, x.total - x.paid), 0);
  const totalPaid = data.debts.reduce((s, x) => s + x.paid, 0);
  const highestRateDebt = data.debts.length > 1
    ? data.debts.filter(x => x.total - x.paid > 0).slice().sort((a, b) => b.rate - a.rate)[0]
    : null;

  return (
    <Section
      title="Debt"
      eyebrow="What's left to pay off"
      right={<SmallBtn tone="gold" onClick={() => setAddOpen(o => !o)}><Plus size={12} /> Add debt</SmallBtn>}
    >
      {data.debts.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          <StatTile icon={TrendingDown} color={SAGE} valueColor={SAGE} value={fmt(totalRemaining)} label="Remaining" caption="left to pay" />
          <StatTile icon={Check} color={SAGE} valueColor={SAGE} value={fmt(totalPaid)} label="Paid off" caption="so far" />
          <StatTile icon={CreditCard} color={SKY} value={data.debts.length} label="Debts" caption="tracked" />
        </div>
      )}

      {highestRateDebt && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: PAPER_DIM, borderRadius: 10, padding: "10px 12px", marginBottom: 16 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${GOLD}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Lightbulb size={14} color={GOLD} />
          </div>
          <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.4 }}>
            Put extra payments toward <b>{highestRateDebt.name}</b> first ({highestRateDebt.rate}% APR) — it's costing you the most in interest.
          </div>
        </div>
      )}

      {addOpen && <AddDebtForm onAdd={addDebt} onCancel={() => setAddOpen(false)} />}

      {data.debts.length === 0 && !addOpen && <Empty text="No debts tracked — add one above." />}
      {data.debts.map(x => (
        <DebtRow key={x.id} debt={x} data={data}
          onPay={(amount, accountId) => payDebt(x, amount, accountId)}
          onSave={updates => editDebt(x.id, updates)}
          onDelete={() => deleteDebt(x.id)} />
      ))}
    </Section>
  );
}

function DebtRow({ debt, data, onPay, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(debt.name);
  const [total, setTotal] = useState(debt.total);
  const [rate, setRate] = useState(debt.rate);
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(data.accounts[0]?.id || "");
  const remaining = Math.max(0, debt.total - debt.paid);
  const pct = debt.total > 0 ? (debt.paid / debt.total) * 100 : 0;
  const projection = payoffProjection(debt);

  if (editing) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 12 }}>
        <input style={{ ...inputStyle, flex: 2, minWidth: 100 }} value={name} onChange={e => setName(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1, minWidth: 80 }} type="number" value={total} onChange={e => setTotal(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1, minWidth: 70 }} type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} />
        <IconBtn icon={Check} color={SAGE} onClick={() => { onSave({ name, total, rate, paid: debt.paid }); setEditing(false); }} label="Save" />
        <IconBtn icon={X} onClick={() => setEditing(false)} label="Cancel" />
      </div>
    );
  }

  return (
    <div style={{
      marginBottom: 8, padding: "10px 12px", borderRadius: 8, background: PAPER_DIM
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>{debt.name} <span style={{ color: SLATE, fontWeight: 400 }}>({debt.rate}% APR)</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: SAGE }}>{fmt(remaining)} left</span>
          <IconBtn icon={Edit2} onClick={() => setEditing(true)} label="Edit" />
          <DeleteBtn onDelete={onDelete} />
        </div>
      </div>
      <ProgressBar pct={pct} tone="sage" />
      <div style={{ fontSize: 10.5, color: SLATE, marginTop: 6 }}>
        {projection
          ? <>Projected payoff <span style={{ color: TEXT, fontWeight: 600 }}>{formatShortDate(projection.payoffDate)}</span> ({projection.monthsLeft} mo at current pace)</>
          : "Log a couple payments to see a payoff projection"}
      </div>
      {paying ? (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
          <select style={{ ...inputStyle, flex: 1 }} value={accountId} onChange={e => setAccountId(e.target.value)}>
            {data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <SmallBtn tone="gold" onClick={() => { onPay(amount, accountId); setAmount(""); setPaying(false); }}><Check size={13} /></SmallBtn>
          <SmallBtn tone="ghost" onClick={() => setPaying(false)}><X size={13} /></SmallBtn>
        </div>
      ) : (
        <SmallBtn onClick={() => setPaying(true)} style={{ marginTop: 8, padding: "5px 10px", fontSize: 11 }}><Plus size={11} /> Make a payment</SmallBtn>
      )}
    </div>
  );
}

function AddDebtForm({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [total, setTotal] = useState("");
  const [rate, setRate] = useState("");
  return (
    <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 14, padding: 14, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 6 }}>
      <input style={{ ...inputStyle, flex: 2, minWidth: 100 }} placeholder="Debt name" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <input style={{ ...inputStyle, flex: 1, minWidth: 80 }} type="number" placeholder="Total" value={total} onChange={e => setTotal(e.target.value)} />
      <input style={{ ...inputStyle, flex: 1, minWidth: 70 }} type="number" step="0.1" placeholder="APR %" value={rate} onChange={e => setRate(e.target.value)} />
      <SmallBtn tone="gold" onClick={() => onAdd(name, total, rate)}><Check size={13} /></SmallBtn>
      <SmallBtn tone="ghost" onClick={onCancel}><X size={13} /></SmallBtn>
    </div>
  );
}
