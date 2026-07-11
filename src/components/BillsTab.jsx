import { useState } from "react";
import { Plus, Check, AlertCircle, Clock, Receipt, Lightbulb, CreditCard, Edit2, X } from "lucide-react";
import { SAGE, RUST, GOLD, CARD, INK_SOFT, SLATE, PAPER_DIM, TEXT, BILL_TEMPLATES, BILL_ICONS } from "../lib/constants.js";
import { uid, fmt, todayStr, daysBetween, urgencyColor, formatShortDate } from "../lib/helpers.js";
import { Section, StatTile, Empty, SmallBtn, IconBtn, DeleteBtn, CountdownPill, Field, inputStyle } from "./shared.jsx";

export function BillsTab({ data, setData, payBill, editBill, deleteBill }) {
  const [addOpen, setAddOpen] = useState(false);

  function addBill(bill) {
    setData(d => ({ ...d, bills: [...d.bills, { id: uid(), lastPaid: null, ...bill }] }));
    setAddOpen(false);
  }

  const withDays = data.bills.map(b => ({ ...b, daysUntil: daysBetween(todayStr(), b.dueDate) })).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdue = withDays.filter(b => b.daysUntil < 0);
  const dueThisWeek = withDays.filter(b => b.daysUntil >= 0 && b.daysUntil <= 7);
  const upcoming = withDays.filter(b => b.daysUntil > 7);
  const dueThisWeekTotal = dueThisWeek.reduce((s, b) => s + b.amount, 0);
  const totalAmount = data.bills.reduce((s, b) => s + b.amount, 0);
  const accountsTotal = data.accounts.reduce((s, a) => s + a.balance, 0);
  const covered = accountsTotal >= totalAmount;

  const groups = [
    { key: "overdue", label: "Overdue", items: overdue },
    { key: "week", label: "Due this week", items: dueThisWeek },
    { key: "upcoming", label: "Upcoming", items: upcoming },
  ].filter(g => g.items.length > 0);

  return (
    <Section
      title="Bills"
      eyebrow="Stay on top of what's due"
      right={<SmallBtn tone="gold" onClick={() => setAddOpen(o => !o)}><Plus size={12} /> Add bill</SmallBtn>}
    >
      {data.bills.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          <StatTile
            icon={overdue.length === 0 ? Check : AlertCircle}
            color={overdue.length === 0 ? SAGE : RUST}
            value={overdue.length}
            label="Overdue"
            caption={overdue.length === 0 ? "All caught up" : "Needs attention"}
          />
          <StatTile
            icon={Clock}
            color={SAGE}
            valueColor={SAGE}
            value={fmt(dueThisWeekTotal)}
            label="Due this week"
            caption={`${dueThisWeek.length} bill${dueThisWeek.length === 1 ? "" : "s"}`}
          />
          <StatTile
            icon={Receipt}
            color={SAGE}
            valueColor={SAGE}
            value={fmt(totalAmount)}
            label="Total"
            caption={`${data.bills.length} bill${data.bills.length === 1 ? "" : "s"}`}
          />
        </div>
      )}

      {addOpen && <AddBillForm data={data} onAdd={addBill} onCancel={() => setAddOpen(false)} />}

      {data.bills.length === 0 && !addOpen && <Empty text="No bills yet — add one above." />}

      {groups.map(g => (
        <div key={g.key} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: TEXT, textTransform: "uppercase", letterSpacing: "0.05em" }}>{g.label}</span>
            <span style={{ fontSize: 10, fontWeight: 700, background: PAPER_DIM, color: SLATE, borderRadius: 999, padding: "1px 7px" }}>{g.items.length}</span>
          </div>
          {g.items.map(b => (
            <BillRow key={b.id} bill={b}
              onPay={() => payBill(b)}
              onSave={updates => editBill(b.id, updates)}
              onDelete={() => deleteBill(b.id)} />
          ))}
        </div>
      ))}

      {data.bills.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: PAPER_DIM, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: covered ? `${SAGE}22` : `${RUST}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Lightbulb size={14} color={covered ? SAGE : RUST} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: TEXT }}>You have {fmt(accountsTotal)} across all accounts</div>
            <div style={{ fontSize: 11, color: SLATE, marginTop: 1 }}>
              {covered ? "Plenty to cover your upcoming bills." : `You're ${fmt(totalAmount - accountsTotal)} short of covering everything due.`}
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

function BillRow({ bill, onPay, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(bill.name);
  const [amount, setAmount] = useState(bill.amount);
  const [dueDate, setDueDate] = useState(bill.dueDate);
  const [frequencyDays, setFrequencyDays] = useState(bill.frequencyDays);
  const BillIcon = BILL_ICONS[bill.name] || BILL_ICONS.Other;
  const daysUntil = daysBetween(todayStr(), bill.dueDate);
  const accent = urgencyColor(daysUntil, bill.frequencyDays);
  const paidToday = bill.lastPaid === todayStr();

  if (editing) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 10 }}>
        <input style={{ ...inputStyle, flex: 2, minWidth: 100 }} value={name} onChange={e => setName(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1, minWidth: 70 }} type="number" value={amount} onChange={e => setAmount(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1, minWidth: 120 }} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1, minWidth: 90 }} type="number" value={frequencyDays} onChange={e => setFrequencyDays(e.target.value)} />
        <IconBtn icon={Check} color={SAGE} onClick={() => { onSave({ name, amount, dueDate, frequencyDays }); setEditing(false); }} label="Save" />
        <IconBtn icon={X} onClick={() => setEditing(false)} label="Cancel" />
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 10px 10px 12px", marginBottom: 8, borderRadius: 8,
      borderLeft: `3px solid ${accent}`, background: daysUntil < 0 ? `${RUST}14` : PAPER_DIM
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: CARD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <BillIcon size={15} color={SLATE} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{bill.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            <CountdownPill days={daysUntil} totalDays={bill.frequencyDays} />
            <span style={{ fontSize: 11, color: SLATE }}>{formatShortDate(bill.dueDate)}</span>
            <span style={{
              display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 999,
              background: `${SLATE}1f`, color: SLATE, border: `1px solid ${SLATE}40`,
              fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap"
            }}>{bill.frequencyDays}d cycle</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: SAGE }}>{fmt(bill.amount)}</span>
        {paidToday ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 999,
            background: `${SAGE}22`, color: SAGE, border: `1px solid ${SAGE}55`,
            fontSize: 11, fontWeight: 700, whiteSpace: "nowrap"
          }}><Check size={11} /> Paid</span>
        ) : (
          <SmallBtn tone="gold" onClick={onPay} style={{ padding: "5px 10px", fontSize: 11 }}><CreditCard size={11} /> Mark paid</SmallBtn>
        )}
        <IconBtn icon={Edit2} onClick={() => setEditing(true)} label="Edit" />
        <DeleteBtn onDelete={onDelete} />
      </div>
    </div>
  );
}

function AddBillForm({ data, onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayStr());
  const [frequencyDays, setFrequencyDays] = useState(30);
  const [categoryId, setCategoryId] = useState(data.categories[0]?.id || "");

  function submit() {
    if (!name || !amount) return;
    onAdd({ name, amount: Number(amount), dueDate, frequencyDays: Number(frequencyDays), categoryId });
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: SLATE, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Choose a category to get started</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 6, marginBottom: 12 }}>
        {BILL_TEMPLATES.map(t => {
          const TemplateIcon = BILL_ICONS[t] || BILL_ICONS.Other;
          const active = name === t;
          return (
            <button key={t} onClick={() => setName(t)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 6px",
              borderRadius: 10, border: `1px solid ${active ? GOLD : INK_SOFT + "30"}`,
              background: active ? "rgba(201,161,61,0.12)" : PAPER_DIM, color: active ? GOLD : TEXT, cursor: "pointer"
            }}>
              <TemplateIcon size={15} />
              <span style={{ fontSize: 10.5 }}>{t}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Field label="Name"><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Amount"><input style={inputStyle} type="number" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
        <Field label="Next due"><input style={inputStyle} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></Field>
        <Field label="Repeats every (days)"><input style={inputStyle} type="number" value={frequencyDays} onChange={e => setFrequencyDays(e.target.value)} /></Field>
        <Field label="Category">
          <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ fontSize: 10.5, color: SLATE, marginTop: 10 }}>Settled from your Checking account when marked paid.</div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <SmallBtn tone="gold" onClick={submit}><Check size={13} /> Save</SmallBtn>
        <SmallBtn tone="ghost" onClick={onCancel}><X size={13} /> Cancel</SmallBtn>
      </div>
    </div>
  );
}
