import { useState } from "react";
import { Plus, Check, X, Edit2 } from "lucide-react";
import { ACCOUNT_TYPES, ACCENT, CARD, INK_SOFT, SLATE, PAPER_DIM, TEXT, SAGE } from "../lib/constants.js";
import { uid, fmt } from "../lib/helpers.js";
import { Section, Empty, SmallBtn, IconBtn, DeleteBtn, inputStyle } from "./shared.jsx";

export function AccountsTab({ data, setData, editAccount, deleteAccount }) {
  const [addOpen, setAddOpen] = useState(false);

  function addAccount(name, type) {
    if (!name) return;
    setData(d => ({ ...d, accounts: [...d.accounts, { id: uid(), name, balance: 0, type }] }));
    setAddOpen(false);
  }

  const totalBalance = data.accounts.reduce((s, a) => s + a.balance, 0);
  const typeTotals = ACCOUNT_TYPES
    .map(t => ({ ...t, total: data.accounts.filter(a => a.type === t.id).reduce((s, a) => s + a.balance, 0), count: data.accounts.filter(a => a.type === t.id).length }))
    .filter(t => t.count > 0);

  return (
    <Section
      title="Accounts"
      eyebrow="Where your money lives"
      right={<SmallBtn tone="gold" onClick={() => setAddOpen(o => !o)}><Plus size={12} /> Add account</SmallBtn>}
    >
      {data.accounts.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total balance</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: SAGE, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{fmt(totalBalance)}</div>
          {typeTotals.length > 1 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {typeTotals.map(t => {
                const TypeIcon = t.icon;
                return (
                  <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: PAPER_DIM, borderRadius: 999, padding: "5px 11px", fontSize: 11.5, color: SLATE }}>
                    <TypeIcon size={11} /> {t.label} <b style={{ color: TEXT, fontVariantNumeric: "tabular-nums" }}>{fmt(t.total)}</b>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {addOpen && <AddAccountForm onAdd={addAccount} onCancel={() => setAddOpen(false)} />}

      {data.accounts.length === 0 && !addOpen && <Empty text="No accounts yet — add one above." />}
      {data.accounts.map(a => (
        <AccountRow key={a.id} account={a} onSave={updates => editAccount(a.id, updates)} onDelete={() => deleteAccount(a.id)} />
      ))}
    </Section>
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
        <span style={{ fontSize: 14.5, fontWeight: 700, color: SAGE, fontVariantNumeric: "tabular-nums" }}>{fmt(account.balance)}</span>
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
              background: active ? "rgba(99,102,241,0.12)" : "transparent", color: active ? ACCENT : TEXT, cursor: "pointer"
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
