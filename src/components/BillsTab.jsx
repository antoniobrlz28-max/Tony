import { useState } from "react";
import { Plus, Check, AlertCircle, Clock, Receipt, Lightbulb, CreditCard, Edit2, X, Settings2, Repeat, CalendarDays, ChevronLeft, List } from "lucide-react";
import { SAGE, RUST, ACCENT, SKY, CARD, INK_SOFT, SLATE, PAPER_DIM, TEXT, BILL_TEMPLATES, BILL_ICONS } from "../lib/constants.js";
import { uid, fmt, todayStr, addDays, daysBetween, urgencyColor, formatShortDate } from "../lib/helpers.js";
import { Section, StatTile, Empty, SmallBtn, IconBtn, DeleteBtn, CountdownPill, Field, inputStyle } from "./shared.jsx";

const fmtCompact = v => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`);

function BillsCalendar({ bills }) {
  const today = todayStr();
  const dow = new Date(today + "T00:00:00").getDay();
  const gridStart = addDays(today, -dow);
  const days = Array.from({ length: 14 }, (_, i) => addDays(gridStart, i));
  const windowBills = bills.filter(b => b.dueDate >= gridStart && b.dueDate <= days[13]);
  // Rough bill-vs-subscription split for the summary strip: subscription-scale = under $100
  const subs = windowBills.filter(b => b.amount < 100);
  const bigs = windowBills.filter(b => b.amount >= 100);
  const total = windowBills.reduce((s, b) => s + b.amount, 0);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: SLATE, marginBottom: 8, textAlign: "center", fontWeight: 600 }}>
        {formatShortDate(gridStart)} – {formatShortDate(days[13])}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 8.5, fontWeight: 700, color: SLATE, letterSpacing: "0.06em" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {days.map(d => {
          const due = windowBills.filter(b => b.dueDate === d);
          const dayTotal = due.reduce((s, b) => s + b.amount, 0);
          const isToday = d === today;
          const isPast = d < today;
          return (
            <div key={d} style={{
              minHeight: 62, borderRadius: 8, padding: "5px 3px", background: PAPER_DIM,
              border: isToday ? `1px solid ${ACCENT}88` : `1px solid transparent`,
              opacity: isPast && !isToday ? 0.45 : 1,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3
            }}>
              <div style={{ fontSize: 10, fontWeight: isToday ? 800 : 600, color: isToday ? ACCENT : SLATE }}>{Number(d.slice(8, 10))}</div>
              <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                {due.slice(0, 2).map(b => {
                  const BillIcon = BILL_ICONS[b.name] || BILL_ICONS.Other;
                  return (
                    <div key={b.id} title={`${b.name} ${fmt(b.amount)}`} style={{ width: 18, height: 18, borderRadius: "50%", background: `${SKY}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <BillIcon size={10} color={SKY} />
                    </div>
                  );
                })}
                {due.length > 2 && <span style={{ fontSize: 8.5, color: SLATE, fontWeight: 700 }}>+{due.length - 2}</span>}
              </div>
              {dayTotal > 0 && <div style={{ fontSize: 8.5, fontWeight: 700, color: TEXT, marginTop: "auto" }}>{fmtCompact(dayTotal)}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", background: PAPER_DIM, borderRadius: 10, padding: "9px 12px", marginTop: 8, fontSize: 11 }}>
        <span style={{ color: SLATE }}>{bigs.length} bill{bigs.length === 1 ? "" : "s"} <b style={{ color: TEXT }}>{fmt(bigs.reduce((s, b) => s + b.amount, 0))}</b></span>
        <span style={{ color: SLATE }}>{subs.length} sub{subs.length === 1 ? "" : "s"} <b style={{ color: TEXT }}>{fmt(subs.reduce((s, b) => s + b.amount, 0))}</b></span>
        <span style={{ color: SLATE }}>Total <b style={{ color: TEXT }}>{fmt(total)}</b></span>
      </div>
    </div>
  );
}

export function BillsTab({ data, setData, payBill, editBill, deleteBill }) {
  const [addOpen, setAddOpen] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const [view, setView] = useState("list");

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

  if (showSubs) {
    return <SubscriptionsView data={data} deleteBill={deleteBill} onBack={() => setShowSubs(false)} />;
  }

  return (
    <Section
      title="Bills"
      eyebrow="Stay on top of what's due"
      right={
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", border: `1px solid ${INK_SOFT}40`, borderRadius: 9, overflow: "hidden" }}>
            {[["cal", CalendarDays], ["list", List]].map(([v, VIcon]) => (
              <button key={v} onClick={() => setView(v)} aria-label={v === "cal" ? "Calendar view" : "List view"} style={{
                display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 26,
                background: view === v ? PAPER_DIM : "transparent", border: "none", cursor: "pointer",
                color: view === v ? TEXT : SLATE
              }}>
                <VIcon size={13} />
              </button>
            ))}
          </div>
          <IconBtn icon={Settings2} onClick={() => setShowSubs(true)} label="Manage subscriptions" />
          <SmallBtn tone="gold" onClick={() => setAddOpen(o => !o)}><Plus size={12} /> Add bill</SmallBtn>
        </div>
      }
    >
      {view === "cal" && data.bills.length > 0 && <BillsCalendar bills={data.bills} />}

      {view === "list" && data.bills.length > 0 && (
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
            color={ACCENT}
            value={fmt(dueThisWeekTotal)}
            label="Due this week"
            caption={`${dueThisWeek.length} bill${dueThisWeek.length === 1 ? "" : "s"}`}
          />
          <StatTile
            icon={Receipt}
            color={SKY}
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
            <div style={{ fontSize: 12.5, fontWeight: 600, color: TEXT }}>You have <span style={{ color: SAGE, fontWeight: 700 }}>{fmt(accountsTotal)}</span> across all accounts</div>
            <div style={{ fontSize: 11, color: SLATE, marginTop: 1 }}>
              {covered ? "Plenty to cover your upcoming bills." : `You're ${fmt(totalAmount - accountsTotal)} short of covering everything due.`}
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

function SubscriptionsView({ data, deleteBill, onBack }) {
  const monthlyOf = b => b.amount * (30 / Math.max(1, Number(b.frequencyDays) || 30));
  const sorted = data.bills.slice().sort((a, b) => monthlyOf(b) - monthlyOf(a));
  const monthlyTotal = sorted.reduce((s, b) => s + monthlyOf(b), 0);
  const maxMonthly = sorted.length ? monthlyOf(sorted[0]) : 0;

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: TEXT, fontWeight: 600, fontSize: 13, marginBottom: 16 }}>
        <ChevronLeft size={16} /> Back to Bills
      </button>
      <Section title="Subscriptions & recurring" eyebrow="every bill, normalized to a monthly cost">
        {sorted.length === 0 ? (
          <Empty text="No recurring bills yet — add some in the Bills tab." />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <StatTile icon={Repeat} color={SKY} value={fmt(monthlyTotal)} label="Per month" caption={`${sorted.length} recurring bill${sorted.length === 1 ? "" : "s"}`} />
              <StatTile icon={CalendarDays} color={ACCENT} value={fmt(monthlyTotal * 12)} label="Per year" caption="at current pace" />
            </div>
            {sorted.map(b => {
              const BillIcon = BILL_ICONS[b.name] || BILL_ICONS.Other;
              const monthly = monthlyOf(b);
              const share = monthlyTotal > 0 ? (monthly / monthlyTotal) * 100 : 0;
              return (
                <div key={b.id} style={{ padding: "10px 12px", marginBottom: 8, borderRadius: 8, background: PAPER_DIM }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: CARD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <BillIcon size={14} color={SLATE} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</div>
                        <div style={{ fontSize: 10.5, color: SLATE }}>{fmt(b.amount)} every {b.frequencyDays}d · {Math.round(share)}% of recurring spend</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: TEXT }}>{fmt(monthly)}<span style={{ fontSize: 10, fontWeight: 400, color: SLATE }}>/mo</span></span>
                      <DeleteBtn onDelete={() => deleteBill(b.id)} />
                    </div>
                  </div>
                  <div style={{ height: 5, background: CARD, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: (maxMonthly > 0 ? (monthly / maxMonthly) * 100 : 0) + "%", background: SKY, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </Section>
    </div>
  );
}

function BillRow({ bill, onPay, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
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
    <div onClick={() => setRevealed(r => !r)} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 10px 10px 12px", marginBottom: 8, borderRadius: 8, cursor: "pointer", userSelect: "none",
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
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontVariantNumeric: "tabular-nums" }}>{fmt(bill.amount)}</span>
        {revealed ? (
          <>
            <IconBtn icon={Edit2} onClick={() => setEditing(true)} label="Edit" />
            <DeleteBtn onDelete={onDelete} />
          </>
        ) : paidToday ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 999,
            background: `${SAGE}22`, color: SAGE, border: `1px solid ${SAGE}55`,
            fontSize: 11, fontWeight: 700, whiteSpace: "nowrap"
          }}><Check size={11} /> Paid</span>
        ) : (
          <SmallBtn tone="gold" onClick={onPay} style={{ padding: "5px 12px", fontSize: 11, minHeight: 30 }}><CreditCard size={11} /> Pay</SmallBtn>
        )}
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
              borderRadius: 10, border: `1px solid ${active ? ACCENT : INK_SOFT + "30"}`,
              background: active ? "rgba(77,159,255,0.12)" : PAPER_DIM, color: active ? ACCENT : TEXT, cursor: "pointer"
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
