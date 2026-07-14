import { useState } from "react";
import { Plus, Check, X, Edit2, TrendingUp, TrendingDown, Wallet, ChevronRight } from "lucide-react";
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ACCOUNT_TYPES, ACCENT, RUST, SAGE, CARD, INK_SOFT, SLATE, PAPER_DIM, TEXT } from "../lib/constants.js";
import { uid, fmt } from "../lib/helpers.js";
import { netWorthNow, netWorthSeries } from "../lib/netWorth.js";
import { Section, Empty, SmallBtn, IconBtn, DeleteBtn, ProgressBar, Segmented, inputStyle } from "./shared.jsx";

const VIEWS = [
  { id: "summary", label: "Summary" },
  { id: "assets", label: "Assets" },
  { id: "debts", label: "Debts" },
];

export function AccountsTab({ data, setData, editAccount, deleteAccount }) {
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState("summary");

  function addAccount(name, type) {
    if (!name) return;
    setData(d => ({ ...d, accounts: [...d.accounts, { id: uid(), name, balance: 0, type }] }));
    setAddOpen(false);
  }

  const { assets, liabilities, net } = netWorthNow(data);
  const series = netWorthSeries(data, 6);
  const prev = series.length > 1 ? series[series.length - 2].net : null;
  const delta = prev !== null ? net - prev : null;
  const hasTrend = series.length > 1 && series.some(p => p.net !== series[0].net);

  return (
    <Section
      title="Net worth"
      right={view === "assets" && <SmallBtn tone="gold" onClick={() => setAddOpen(o => !o)}><Plus size={12} /> Add</SmallBtn>}
    >
      {/* Hero */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.1, color: net >= 0 ? TEXT : RUST, fontVariantNumeric: "tabular-nums" }}>{fmt(net)}</span>
          {delta !== null && delta !== 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 9px", borderRadius: 999,
              fontSize: 11.5, fontWeight: 700, color: delta > 0 ? SAGE : RUST,
              background: delta > 0 ? `${SAGE}1a` : `${RUST}1a`, border: `1px solid ${delta > 0 ? SAGE : RUST}40`
            }}>
              {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{fmt(Math.abs(delta))}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: SLATE, marginTop: 3 }}>
          <b style={{ color: SAGE }}>{fmt(assets)}</b> assets − <b style={{ color: RUST }}>{fmt(liabilities)}</b> owed
          {delta !== null && delta !== 0 && <> · {delta > 0 ? "up" : "down"} this month</>}
        </div>
      </div>

      {hasTrend && (
        <div style={{ height: 116, marginBottom: 14 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: SLATE }} />
              <YAxis tick={{ fontSize: 9, fill: SLATE }} width={38} />
              <Tooltip formatter={v => [fmt(v), "net worth"]} />
              <Area type="monotone" dataKey="net" stroke={ACCENT} strokeWidth={2} fill="url(#nwFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <Segmented views={VIEWS} value={view} onChange={setView} />

      {view === "summary" && (
        <>
          <SummaryRow icon={Wallet} color={SAGE} label="Assets" caption={`${data.accounts.length} account${data.accounts.length === 1 ? "" : "s"}`} value={fmt(assets)} onClick={() => setView("assets")} />
          <SummaryRow icon={TrendingDown} color={RUST} label="Debts" caption={`${data.debts.length} debt${data.debts.length === 1 ? "" : "s"}`} value={fmt(liabilities)} valueColor={RUST} onClick={() => setView("debts")} />
        </>
      )}

      {view === "assets" && (
        <>
          {addOpen && <AddAccountForm onAdd={addAccount} onCancel={() => setAddOpen(false)} />}
          {data.accounts.length === 0 && !addOpen && <Empty text="No accounts yet — add one above." />}
          {data.accounts.map(a => (
            <AccountRow key={a.id} account={a} onSave={updates => editAccount(a.id, updates)} onDelete={() => deleteAccount(a.id)} />
          ))}
        </>
      )}

      {view === "debts" && (
        <>
          {data.debts.length === 0 && <Empty text="No debts tracked — add them in the Debt tab." />}
          {data.debts.map(x => {
            const remaining = Math.max(0, x.total - x.paid);
            const pct = x.total > 0 ? (x.paid / x.total) * 100 : 0;
            return (
              <div key={x.id} style={{ padding: "10px 12px", marginBottom: 8, borderRadius: 10, background: PAPER_DIM }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{x.name} <span style={{ color: SLATE, fontWeight: 400 }}>({x.rate}% APR)</span></span>
                  <span style={{ fontWeight: 700, color: RUST, fontVariantNumeric: "tabular-nums" }}>{fmt(remaining)}</span>
                </div>
                <ProgressBar pct={pct} tone="sage" />
              </div>
            );
          })}
          {data.debts.length > 0 && (
            <div style={{ fontSize: 10.5, color: SLATE, marginTop: 4 }}>Make payments and see payoff projections in the Debt tab.</div>
          )}
        </>
      )}
    </Section>
  );
}

function SummaryRow({ icon: Icon, color, label, caption, value, valueColor, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
      background: PAPER_DIM, border: "none", borderRadius: 12, padding: "13px 14px", marginBottom: 8, cursor: "pointer"
    }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${color}1f`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: TEXT }}>{label}</div>
        <div style={{ fontSize: 11, color: SLATE, marginTop: 1 }}>{caption}</div>
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, color: valueColor || TEXT, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <ChevronRight size={16} color={SLATE} />
    </button>
  );
}

function AccountRow({ account, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [name, setName] = useState(account.name);
  const [balance, setBalance] = useState(account.balance);
  const [type, setType] = useState(account.type);

  if (editing) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 10 }}>
        <input style={{ ...inputStyle, flex: 2, minWidth: 100 }} value={name} onChange={e => setName(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1, minWidth: 80 }} type="number" value={balance} onChange={e => setBalance(e.target.value)} />
        <select style={{ ...inputStyle, flex: 1, minWidth: 100 }} value={type} onChange={e => setType(e.target.value)}>
          {ACCOUNT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <IconBtn icon={Check} color={SAGE} onClick={() => { onSave({ name, balance, type }); setEditing(false); }} label="Save" />
        <IconBtn icon={X} onClick={() => setEditing(false)} label="Cancel" />
      </div>
    );
  }
  const typeInfo = ACCOUNT_TYPES.find(t => t.id === account.type) || ACCOUNT_TYPES[0];
  const TypeIcon = typeInfo.icon;
  return (
    <div onClick={() => setRevealed(r => !r)} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 12px", marginBottom: 8, borderRadius: 10, background: PAPER_DIM,
      cursor: "pointer", userSelect: "none"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: CARD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <TypeIcon size={15} color={SLATE} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{account.name}</div>
          {typeInfo.label.toLowerCase() !== account.name.toLowerCase() && (
            <div style={{ fontSize: 11, color: SLATE }}>{typeInfo.label}</div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }} onClick={e => revealed && e.stopPropagation()}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: account.balance < 0 ? RUST : SAGE, fontVariantNumeric: "tabular-nums" }}>{fmt(account.balance)}</span>
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

function AddAccountForm({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  return (
    <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 14, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {ACCOUNT_TYPES.map(t => {
          const TypeIcon = t.icon;
          const active = type === t.id;
          return (
            <button key={t.id} onClick={() => setType(t.id)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px 10px", borderRadius: 10, border: `1px solid ${active ? ACCENT : INK_SOFT + "40"}`,
              background: active ? "rgba(49,134,255,0.12)" : "transparent", color: active ? ACCENT : TEXT, cursor: "pointer"
            }}>
              <TypeIcon size={14} /> <span style={{ fontSize: 12.5 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="Account name" value={name} onChange={e => setName(e.target.value)} autoFocus />
        <SmallBtn tone="gold" onClick={() => onAdd(name, type)}><Check size={13} /></SmallBtn>
        <SmallBtn tone="ghost" onClick={onCancel}><X size={13} /></SmallBtn>
      </div>
    </div>
  );
}
