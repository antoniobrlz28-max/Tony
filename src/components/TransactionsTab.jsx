import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, Wallet, Check, X, Edit2 } from "lucide-react";
import { GOLD, INK, PAPER_DIM, TEXT, SLATE, SAGE, RUST, INK_SOFT } from "../lib/constants.js";
import { fmt, getPeriod } from "../lib/helpers.js";
import { Section, StatTile, Empty, SmallBtn, IconBtn, DeleteBtn, inputStyle, minimalInputStyle } from "./shared.jsx";

export function TransactionsTab({ data, addIncome, addExpense, addTransfer, editTransaction, deleteTransaction }) {
  const [formType, setFormType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(data.accounts[0]?.id || "");
  const [toAccountId, setToAccountId] = useState(data.accounts[1]?.id || data.accounts[0]?.id || "");
  const [categoryId, setCategoryId] = useState(data.categories[0]?.id || "");
  const [note, setNote] = useState("");

  function submit() {
    if (formType === "income") addIncome({ amount, accountId, note });
    else if (formType === "expense") addExpense({ amount, accountId, categoryId, note });
    else addTransfer({ amount, fromId: accountId, toId: toAccountId, note });
    setAmount("");
    setNote("");
  }

  const sorted = data.transactions.slice().sort((a, b) => b.date.localeCompare(a.date));

  const period = getPeriod(data.nextPaycheck, data.cycleDays);
  const periodTx = data.transactions.filter(t => t.date >= period.start && t.date <= period.end);
  const periodIncome = periodTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const periodExpense = periodTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const periodNet = periodIncome - periodExpense;

  return (
    <>
      {data.transactions.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          <StatTile icon={TrendingUp} color={SAGE} valueColor={SAGE} value={fmt(periodIncome)} label="Income" caption="this period" />
          <StatTile icon={TrendingDown} color={RUST} valueColor={RUST} value={fmt(periodExpense)} label="Expense" caption="this period" />
          <StatTile icon={Wallet} color={periodNet >= 0 ? SAGE : RUST} valueColor={periodNet >= 0 ? SAGE : RUST} value={fmt(periodNet)} label="Net" caption="this period" />
        </div>
      )}

      <Section title="Log a transaction">
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {["expense", "income", "transfer"].map(t => (
            <button key={t} onClick={() => setFormType(t)} style={{
              flex: 1, padding: "8px 0", borderRadius: 999, border: "none", cursor: "pointer",
              background: formType === t ? GOLD : PAPER_DIM, color: formType === t ? INK : TEXT,
              fontWeight: 700, fontSize: 12.5, textTransform: "capitalize"
            }}>{t}</button>
          ))}
        </div>

        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 10.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Amount</div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3 }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 20, color: SLATE }}>$</span>
            <input
              type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              placeholder="0.00"
              style={{
                border: "none", borderBottom: `2px solid ${INK_SOFT}40`, background: "transparent", color: TEXT,
                fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 700, textAlign: "center", width: 160, padding: "2px 0"
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: SLATE, marginBottom: 6 }}>{formType === "transfer" ? "From" : "Account"}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {data.accounts.map(a => (
              <button key={a.id} onClick={() => setAccountId(a.id)} style={{
                padding: "6px 12px", borderRadius: 999, border: `1px solid ${accountId === a.id ? GOLD : INK_SOFT + "40"}`,
                background: accountId === a.id ? "rgba(201,161,61,0.12)" : "transparent", color: accountId === a.id ? GOLD : TEXT,
                fontSize: 12.5, cursor: "pointer"
              }}>{a.name}</button>
            ))}
          </div>
        </div>

        {formType === "transfer" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: SLATE, marginBottom: 6 }}>To</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {data.accounts.map(a => (
                <button key={a.id} onClick={() => setToAccountId(a.id)} style={{
                  padding: "6px 12px", borderRadius: 999, border: `1px solid ${toAccountId === a.id ? GOLD : INK_SOFT + "40"}`,
                  background: toAccountId === a.id ? "rgba(201,161,61,0.12)" : "transparent", color: toAccountId === a.id ? GOLD : TEXT,
                  fontSize: 12.5, cursor: "pointer"
                }}>{a.name}</button>
              ))}
            </div>
          </div>
        )}

        {formType === "expense" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: SLATE, marginBottom: 6 }}>Category</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {data.categories.map(c => (
                <button key={c.id} onClick={() => setCategoryId(c.id)} style={{
                  padding: "6px 12px", borderRadius: 999, border: `1px solid ${categoryId === c.id ? GOLD : INK_SOFT + "40"}`,
                  background: categoryId === c.id ? "rgba(201,161,61,0.12)" : "transparent", color: categoryId === c.id ? GOLD : TEXT,
                  fontSize: 12.5, cursor: "pointer"
                }}>{c.name}</button>
              ))}
            </div>
          </div>
        )}

        <input
          value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)"
          style={minimalInputStyle}
        />

        <SmallBtn tone="gold" onClick={submit} style={{ marginTop: 16, width: "100%", justifyContent: "center" }}>
          <Plus size={13} /> Add {formType}
        </SmallBtn>
      </Section>

      <Section title="Recent transactions" eyebrow={`${data.transactions.length} total`}>
        {sorted.length === 0 && <Empty text="No transactions yet." />}
        {sorted.map(tx => (
          <TransactionRow key={tx.id} tx={tx} data={data}
            onSave={updates => editTransaction(tx, updates)}
            onDelete={() => deleteTransaction(tx)} />
        ))}
      </Section>
    </>
  );
}

function TransactionRow({ tx, data, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(tx.amount);
  const [note, setNote] = useState(tx.note || "");
  const account = data.accounts.find(a => a.id === tx.accountId);
  const category = data.categories.find(c => c.id === tx.categoryId);
  const toAccount = data.accounts.find(a => a.id === tx.toAccountId);

  const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";
  const color = tx.type === "expense" ? RUST : SAGE;

  if (editing) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
        <input style={{ ...inputStyle, flex: 1 }} type="number" value={amount} onChange={e => setAmount(e.target.value)} />
        <input style={{ ...inputStyle, flex: 2 }} value={note} onChange={e => setNote(e.target.value)} />
        <IconBtn icon={Check} color={SAGE} onClick={() => { onSave({ amount, note }); setEditing(false); }} label="Save" />
        <IconBtn icon={X} onClick={() => setEditing(false)} label="Cancel" />
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "9px 12px", marginBottom: 6, borderRadius: 8, background: PAPER_DIM
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{tx.note || category?.name || (tx.type === "transfer" ? `Transfer to ${toAccount?.name || "—"}` : tx.type)}</div>
        <div style={{ fontSize: 11, color: SLATE }}>{tx.date} · {account?.name || "—"}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color }}>{sign}{fmt(tx.amount)}</span>
        <IconBtn icon={Edit2} onClick={() => setEditing(true)} label="Edit" />
        <DeleteBtn onDelete={onDelete} />
      </div>
    </div>
  );
}
