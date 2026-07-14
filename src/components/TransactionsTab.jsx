import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, ArrowLeftRight, Check, X, Edit2, Upload, Search } from "lucide-react";
import { ACCENT, INK, CARD, PAPER_DIM, TEXT, SLATE, SAGE, RUST, INK_SOFT } from "../lib/constants.js";
import { fmt, getPeriod, todayStr, addDays, formatShortDate } from "../lib/helpers.js";
import { Section, Empty, SmallBtn, IconBtn, DeleteBtn, inputStyle, minimalInputStyle } from "./shared.jsx";
import { ImportCSV } from "./ImportCSV.jsx";

const PAGE_SIZE = 30;

function dateLabel(date) {
  if (date === todayStr()) return "Today";
  if (date === addDays(todayStr(), -1)) return "Yesterday";
  return formatShortDate(date);
}

export function TransactionsTab({ data, addIncome, addExpense, addTransfer, editTransaction, deleteTransaction, importTransactions, addBillFromImport }) {
  const [formType, setFormType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(data.accounts[0]?.id || "");
  const [toAccountId, setToAccountId] = useState(data.accounts[1]?.id || data.accounts[0]?.id || "");
  const [categoryId, setCategoryId] = useState(data.categories[0]?.id || "");
  const [note, setNote] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  function submit() {
    if (formType === "income") addIncome({ amount, accountId, note });
    else if (formType === "expense") addExpense({ amount, accountId, categoryId, note });
    else addTransfer({ amount, fromId: accountId, toId: toAccountId, note });
    setAmount("");
    setNote("");
  }

  const sorted = data.transactions.slice().sort((a, b) => b.date.localeCompare(a.date));
  const q = query.trim().toLowerCase();
  const filtered = sorted.filter(t => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (catFilter !== "all" && t.categoryId !== catFilter) return false;
    if (!q) return true;
    const cat = data.categories.find(c => c.id === t.categoryId)?.name || "";
    const acct = data.accounts.find(a => a.id === t.accountId)?.name || "";
    return (t.note || "").toLowerCase().includes(q) || cat.toLowerCase().includes(q)
      || acct.toLowerCase().includes(q) || String(t.amount).includes(q) || t.date.includes(q);
  });
  const isFiltering = q !== "" || typeFilter !== "all" || catFilter !== "all";

  if (showImport) {
    return <ImportCSV data={data} onImport={importTransactions} addBill={addBillFromImport} onBack={() => setShowImport(false)} />;
  }

  const period = getPeriod(data.nextPaycheck, data.cycleDays);
  const periodTx = data.transactions.filter(t => t.date >= period.start && t.date <= period.end);
  const periodIncome = periodTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const periodExpense = periodTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const periodNet = periodIncome - periodExpense;

  return (
    <>
      {data.transactions.length > 0 && (() => {
        const max = Math.max(periodIncome, periodExpense, 1);
        return (
          <div style={{ background: CARD, border: `1px solid ${INK_SOFT}1f`, borderRadius: 16, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 10.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cash flow this period</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: periodNet >= 0 ? SAGE : RUST, fontVariantNumeric: "tabular-nums" }}>
                {periodNet >= 0 ? "+" : "−"}{fmt(Math.abs(periodNet))}
              </span>
            </div>
            {[["Income", periodIncome, SAGE], ["Expense", periodExpense, RUST]].map(([label, val, color]) => (
              <div key={label} style={{ marginBottom: label === "Income" ? 9 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                  <span style={{ color: SLATE }}>{label}</span>
                  <span style={{ fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{fmt(val)}</span>
                </div>
                <div style={{ height: 6, background: PAPER_DIM, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(val / max) * 100}%`, background: color, borderRadius: 3, transition: "width 0.5s ease" }} />
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <Section title="Log a transaction">
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {["expense", "income", "transfer"].map(t => (
            <button key={t} onClick={() => setFormType(t)} style={{
              flex: 1, padding: "8px 0", borderRadius: 999, border: "none", cursor: "pointer",
              background: formType === t ? ACCENT : PAPER_DIM, color: formType === t ? INK : TEXT,
              fontWeight: 700, fontSize: 12.5, textTransform: "capitalize"
            }}>{t}</button>
          ))}
        </div>

        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 10.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Amount</div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3 }}>
            <span style={{ fontSize: 20, color: SLATE }}>$</span>
            <input
              type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              placeholder="0.00"
              style={{
                border: "none", borderBottom: `2px solid ${INK_SOFT}40`, background: "transparent", color: TEXT,
                fontSize: 32, fontWeight: 700, textAlign: "center", width: 160, padding: "2px 0"
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: SLATE, marginBottom: 6 }}>{formType === "transfer" ? "From" : "Account"}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {data.accounts.map(a => (
              <button key={a.id} onClick={() => setAccountId(a.id)} style={{
                padding: "6px 12px", borderRadius: 999, border: `1px solid ${accountId === a.id ? ACCENT : INK_SOFT + "40"}`,
                background: accountId === a.id ? "rgba(49,134,255,0.12)" : "transparent", color: accountId === a.id ? ACCENT : TEXT,
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
                  padding: "6px 12px", borderRadius: 999, border: `1px solid ${toAccountId === a.id ? ACCENT : INK_SOFT + "40"}`,
                  background: toAccountId === a.id ? "rgba(49,134,255,0.12)" : "transparent", color: toAccountId === a.id ? ACCENT : TEXT,
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
                  padding: "6px 12px", borderRadius: 999, border: `1px solid ${categoryId === c.id ? ACCENT : INK_SOFT + "40"}`,
                  background: categoryId === c.id ? "rgba(49,134,255,0.12)" : "transparent", color: categoryId === c.id ? ACCENT : TEXT,
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

      <Section title="Recent transactions" eyebrow={isFiltering ? `${filtered.length} of ${data.transactions.length}` : `${data.transactions.length} total`}
        right={<SmallBtn tone="ghost" onClick={() => setShowImport(true)}><Upload size={12} /> Import CSV</SmallBtn>}>
        {data.transactions.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Search size={14} color={SLATE} style={{ flexShrink: 0 }} />
              <input
                value={query} onChange={e => { setQuery(e.target.value); setVisible(PAGE_SIZE); }}
                placeholder="Search notes, categories, amounts…"
                style={minimalInputStyle}
              />
              {query && <IconBtn icon={X} onClick={() => { setQuery(""); setVisible(PAGE_SIZE); }} label="Clear search" />}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {[["all", "All"], ["expense", "Expense"], ["income", "Income"], ["transfer", "Transfer"]].map(([v, label]) => (
                <button key={v} onClick={() => { setTypeFilter(v); setVisible(PAGE_SIZE); }} style={{
                  padding: "5px 11px", borderRadius: 999, border: `1px solid ${typeFilter === v ? ACCENT : INK_SOFT + "40"}`,
                  background: typeFilter === v ? "rgba(49,134,255,0.12)" : "transparent",
                  color: typeFilter === v ? ACCENT : SLATE, fontSize: 11.5, fontWeight: typeFilter === v ? 700 : 400, cursor: "pointer"
                }}>{label}</button>
              ))}
              <select
                value={catFilter} onChange={e => { setCatFilter(e.target.value); setVisible(PAGE_SIZE); }}
                style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: 11.5, borderRadius: 999, color: catFilter === "all" ? SLATE : TEXT }}
              >
                <option value="all">All categories</option>
                {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </>
        )}
        {data.transactions.length === 0 && <Empty text="No transactions yet." />}
        {data.transactions.length > 0 && filtered.length === 0 && <Empty text="Nothing matches those filters." />}
        {(() => {
          const rows = [];
          let lastDate = null;
          for (const tx of filtered.slice(0, visible)) {
            if (tx.date !== lastDate) {
              lastDate = tx.date;
              rows.push(
                <div key={`h-${tx.date}`} style={{ fontSize: 10.5, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "14px 0 6px" }}>
                  {dateLabel(tx.date)}
                </div>
              );
            }
            rows.push(
              <TransactionRow key={tx.id} tx={tx} data={data}
                onSave={updates => editTransaction(tx, updates)}
                onDelete={() => deleteTransaction(tx)} />
            );
          }
          return rows;
        })()}
        {filtered.length > visible && (
          <SmallBtn tone="ghost" onClick={() => setVisible(v => v + 50)} style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
            Show more ({filtered.length - visible} remaining)
          </SmallBtn>
        )}
      </Section>
    </>
  );
}

function TransactionRow({ tx, data, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [amount, setAmount] = useState(tx.amount);
  const [note, setNote] = useState(tx.note || "");
  const account = data.accounts.find(a => a.id === tx.accountId);
  const category = data.categories.find(c => c.id === tx.categoryId);
  const toAccount = data.accounts.find(a => a.id === tx.toAccountId);

  const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";
  const color = tx.type === "income" ? SAGE : tx.type === "expense" ? RUST : SLATE;
  const TxIcon = tx.type === "income" ? TrendingUp : tx.type === "expense" ? TrendingDown : ArrowLeftRight;
  const sub = tx.type === "transfer"
    ? `${account?.name || "—"} → ${toAccount?.name || "—"}`
    : [category?.name, account?.name].filter(Boolean).join(" · ") || "—";

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
    <div onClick={() => setRevealed(r => !r)} style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
      padding: "9px 12px", marginBottom: 6, borderRadius: 10, background: PAPER_DIM,
      cursor: "pointer", userSelect: "none"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${color}1a`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <TxIcon size={13} color={color} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {tx.note || category?.name || (tx.type === "transfer" ? `Transfer to ${toAccount?.name || "—"}` : tx.type)}
          </div>
          <div style={{ fontSize: 11, color: SLATE, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={e => revealed && e.stopPropagation()}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{sign}{fmt(tx.amount)}</span>
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
