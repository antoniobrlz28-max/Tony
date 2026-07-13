import { useState, useRef } from "react";
import { ChevronLeft, Upload, Check, TrendingUp, TrendingDown, FileText, Repeat, Banknote } from "lucide-react";
import { SAGE, RUST, ACCENT, SKY, SLATE, TEXT, INK_SOFT, PAPER_DIM } from "../lib/constants.js";
import { fmt, todayStr, addDays, daysBetween } from "../lib/helpers.js";
import { Section, SmallBtn, Empty, StatTile, inputStyle } from "./shared.jsx";

// Minimal CSV parser that handles quoted fields and commas inside quotes
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(f => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(f => f.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeDate(raw) {
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  return null;
}

function parseMoney(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  if (s === "" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Keyword rules for auto-categorization, matched against the existing category names.
// Order matters: ATM/P2P first, because bank descriptions embed street/branch names
// ("1415 MARKET ST ATM CASH W/D") that would otherwise trip the merchant rules.
const CATEGORY_RULES = [
  { match: /atm|cash w.?d|withdrawal|cash app|zelle|venmo|paypal/i, cat: "discretionary" },
  { match: /transfer to sav|savings transfer/i, cat: "savings" },
  { match: /rent|landlord|property|lease/i, cat: "rent" },
  { match: /grocer|wal-?mart|wm supercenter|costco|sams club|target|albertson|kroger|king soopers|soopers|safeway|sprouts|trader joe|whole foods|aldi|market|supermercado|carniceria|food store/i, cat: "grocer", alt: "essentials" },
  { match: /fuel|gas|shell|conoco|phillips|sinclair|murphy|circle k|quiktrip|qt \d|kum ?& ?go|exxon|chevron/i, cat: "essentials" },
  { match: /pharmacy|walgreen|cvs|clinic|medical|dental/i, cat: "essentials" },
  { match: /electric|water|utility|internet|wifi|comcast|xfinity|cox |att |t-?mobile|verizon|phone/i, cat: "essentials" },
  { match: /netflix|spotify|hulu|disney|hbo|max |youtube|prime|openai|chatgpt|claude|subscription|patreon|onlyfans/i, cat: "discretionary" },
  { match: /uber|lyft|doordash|grubhub|instacart/i, cat: "discretionary" },
  { match: /restaurant|grill|cafe|coffee|taco|pizza|sushi|burger|bar |brewing|liquor|wine|lounge|diner|kitchen/i, cat: "discretionary" },
];

function pickCategory(note, categories) {
  const rule = CATEGORY_RULES.find(r => r.match.test(note));
  if (rule) {
    for (const key of [rule.cat, rule.alt].filter(Boolean)) {
      const hit = categories.find(c => c.name.toLowerCase().includes(key));
      if (hit) return hit.id;
    }
  }
  const disc = categories.find(c => c.name.toLowerCase().includes("discretionary"));
  return (disc || categories[0])?.id;
}

function extractTransactions(rows, categories, existing) {
  if (rows.length < 2) return { error: "That file looks empty — no data rows found." };
  const header = rows[0].map(h => h.trim().toLowerCase());
  const findCol = (...names) => header.findIndex(h => names.some(n => h.includes(n)));

  let dateIdx = findCol("posting date", "post date", "transaction date", "date");
  const descIdx = findCol("description", "payee", "memo", "detail");
  const amountIdx = findCol("amount");
  const debitIdx = findCol("debit", "withdrawal");
  const creditIdx = findCol("credit", "deposit");

  // No recognizable header — try treating row 0 as data with positional columns (date, desc, amount)
  const headerless = dateIdx < 0 && normalizeDate(rows[0][0]);
  const dataRows = headerless ? rows : rows.slice(1);
  if (headerless) dateIdx = 0;
  if (dateIdx < 0) return { error: "Couldn't find a date column. Send me this file's header row and I'll adapt the parser." };

  const dIdx = headerless ? 1 : (descIdx >= 0 ? descIdx : 1);
  const out = [];
  for (const r of dataRows) {
    const date = normalizeDate(r[dateIdx]);
    if (!date) continue;
    const note = (r[dIdx] || "").trim().replace(/\s+/g, " ").slice(0, 80) || "Imported";
    let signed = null;
    if (!headerless && debitIdx >= 0 && creditIdx >= 0) {
      const debit = parseMoney(r[debitIdx]);
      const credit = parseMoney(r[creditIdx]);
      if (debit !== null && debit !== 0) signed = -Math.abs(debit);
      else if (credit !== null && credit !== 0) signed = Math.abs(credit);
    } else {
      const col = headerless ? 2 : amountIdx;
      if (col >= 0) signed = parseMoney(r[col]);
    }
    if (signed === null || signed === 0) continue;
    const type = signed > 0 ? "income" : "expense";
    const amount = Math.abs(signed);
    const dup = existing.some(t => t.date === date && t.amount === amount && t.type === type);
    out.push({
      key: `${date}-${amount}-${out.length}`,
      date, note, type, amount,
      isCash: type === "expense" && /atm cash|cash w.?d|atm w\/?d/i.test(note),
      categoryId: type === "expense" ? pickCategory(note, categories) : null,
      include: !dup,
      dup,
    });
  }
  if (out.length === 0) return { error: "Found the columns but no usable rows — check the date range you exported." };
  out.sort((a, b) => b.date.localeCompare(a.date));
  return { transactions: out };
}

// Recurring-charge detection: group expenses by merchant (bank descriptors
// stripped of reference numbers and filler words), then flag groups that hit
// on a ~monthly cadence with a stable amount.
const DESCRIPTOR_NOISE = new Set(["CHK", "CARD", "PUR", "POS", "PURCHASE", "WEB", "PMT", "ACH", "DEBIT", "PAYMENT", "RECURRING", "TST", "SQ", "PY"]);
function merchantKey(note) {
  const words = String(note).toUpperCase().replace(/[^A-Z* ]+/g, " ").split(/\s+/).filter(w => w.length > 1 && !DESCRIPTOR_NOISE.has(w.replace(/\*/g, "")));
  return words.slice(0, 2).join(" ");
}
function detectRecurring(rows, bills, categories) {
  const groups = {};
  for (const t of rows) {
    if (t.type !== "expense" || t.isCash) continue;
    const k = merchantKey(t.note);
    if (!k) continue;
    (groups[k] = groups[k] || []).push(t);
  }
  const out = [];
  for (const [k, list] of Object.entries(groups)) {
    if (list.length < 3) continue;
    const dates = list.map(t => t.date).sort();
    const gaps = [];
    for (let i = 1; i < dates.length; i++) gaps.push(daysBetween(dates[i - 1], dates[i]));
    const medGap = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
    if (medGap < 26 || medGap > 34) continue;
    const amounts = list.map(t => t.amount).sort((a, b) => a - b);
    const medAmt = amounts[Math.floor(amounts.length / 2)];
    if (amounts[amounts.length - 1] - amounts[0] > Math.max(2, medAmt * 0.15)) continue;
    const name = k.toLowerCase().replace(/\*/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, c => c.toUpperCase()).slice(0, 20).trim();
    const firstWord = name.split(" ")[0].toLowerCase();
    if (bills.some(b => b.name.toLowerCase().includes(firstWord) || firstWord.includes(b.name.toLowerCase()))) continue;
    let dueDate = dates[dates.length - 1];
    while (dueDate < todayStr()) dueDate = addDays(dueDate, 30);
    out.push({
      key: k, name, amount: Math.round(medAmt * 100) / 100, dueDate, frequencyDays: 30,
      categoryId: pickCategory(list[0].note, categories), hits: list.length,
    });
  }
  return out.sort((a, b) => b.amount - a.amount).slice(0, 5);
}

export function ImportCSV({ data, onImport, addBill, onBack }) {
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState(null);
  const [accountId, setAccountId] = useState((data.accounts.find(a => a.type === "checking") || data.accounts[0])?.id || "");
  const [adjustBalance, setAdjustBalance] = useState(false);
  const [done, setDone] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [addedBills, setAddedBills] = useState({});
  const fileRef = useRef(null);
  const cashAccount = data.accounts.find(a => a.type === "cash");

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = extractTransactions(parseCSV(String(reader.result)), data.categories, data.transactions);
      if (result.error) { setError(result.error); setParsed(null); setSuggestions([]); }
      else {
        setParsed(result.transactions);
        setSuggestions(detectRecurring(result.transactions, data.bills, data.categories));
        setError(null);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function toggleRow(key) {
    setParsed(p => p.map(t => t.key === key ? { ...t, include: !t.include } : t));
  }
  function setRowCategory(key, categoryId) {
    setParsed(p => p.map(t => t.key === key ? { ...t, categoryId } : t));
  }

  function runImport() {
    // ATM cash pulls become transfers into the Cash account when one exists,
    // so withdrawn money stays visible instead of counting as already spent.
    const rows = parsed.filter(t => t.include).map(t =>
      t.isCash && cashAccount
        ? { ...t, type: "transfer", toAccountId: cashAccount.id, categoryId: null }
        : t
    );
    onImport(rows, accountId, adjustBalance);
    setDone(rows.length);
    setParsed(null);
  }

  function addSuggestedBill(s) {
    addBill({ name: s.name, amount: s.amount, dueDate: s.dueDate, frequencyDays: s.frequencyDays, categoryId: s.categoryId });
    setAddedBills(prev => ({ ...prev, [s.key]: true }));
  }

  const included = parsed ? parsed.filter(t => t.include) : [];
  const incomeTotal = included.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenseTotal = included.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const dupCount = parsed ? parsed.filter(t => t.dup).length : 0;

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: TEXT, fontWeight: 600, fontSize: 13, marginBottom: 16 }}>
        <ChevronLeft size={16} /> Back to Transactions
      </button>

      <Section title="Import statement" eyebrow="CSV export from your bank">
        {done !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: `${SAGE}14`, border: `1px solid ${SAGE}40`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <Check size={16} color={SAGE} />
            <span style={{ fontSize: 13, color: TEXT }}>{done} transaction{done === 1 ? "" : "s"} imported.</span>
          </div>
        )}

        {suggestions.length > 0 && (
          <div style={{ background: PAPER_DIM, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Repeat size={13} color={SKY} />
              <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>Recurring charges detected</span>
            </div>
            {suggestions.map(s => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: `1px solid ${INK_SOFT}18` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                  <div style={{ fontSize: 10.5, color: SLATE }}>{fmt(s.amount)} · ~monthly · seen {s.hits}×</div>
                </div>
                {addedBills[s.key] ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: SAGE, flexShrink: 0 }}><Check size={12} /> Added</span>
                ) : (
                  <SmallBtn tone="ghost" onClick={() => addSuggestedBill(s)} style={{ padding: "4px 10px", fontSize: 11, flexShrink: 0 }}>+ Bill</SmallBtn>
                )}
              </div>
            ))}
            <div style={{ fontSize: 10, color: SLATE, marginTop: 6 }}>Adding creates it in the Bills tab with a 30-day cycle.</div>
          </div>
        )}

        {!parsed && (
          <>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: "none" }} />
            <button onClick={() => fileRef.current?.click()} style={{
              width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              background: PAPER_DIM, border: `1px dashed ${INK_SOFT}55`, borderRadius: 14, padding: "26px 16px", cursor: "pointer", color: TEXT
            }}>
              <Upload size={20} color={SLATE} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Choose a CSV file</span>
              <span style={{ fontSize: 11, color: SLATE }}>Exported from online banking · handles Amount or Debit/Credit layouts</span>
            </button>
            {error && <div style={{ fontSize: 12.5, color: RUST, marginTop: 10 }}>{error}</div>}
          </>
        )}

        {parsed && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              <StatTile icon={FileText} color={SKY} value={included.length} label="Selected" caption={`of ${parsed.length} parsed`} />
              <StatTile icon={TrendingUp} color={SAGE} valueColor={SAGE} value={fmt(incomeTotal)} label="Income" caption="in selection" />
              <StatTile icon={TrendingDown} color={RUST} valueColor={RUST} value={fmt(expenseTotal)} label="Expenses" caption="in selection" />
            </div>

            {dupCount > 0 && (
              <div style={{ fontSize: 11.5, color: ACCENT, marginBottom: 10 }}>
                {dupCount} row{dupCount === 1 ? "" : "s"} look like duplicates of existing transactions and were unchecked.
              </div>
            )}

            {!cashAccount && parsed.some(t => t.isCash && t.include) && (
              <div style={{ fontSize: 11.5, color: SLATE, marginBottom: 10 }}>
                <Banknote size={11} style={{ verticalAlign: "-1px" }} /> {parsed.filter(t => t.isCash).length} ATM withdrawals found — add a <b style={{ color: TEXT }}>Cash</b> account in the Accounts tab first and they'll import as transfers into it instead of vanishing as spend.
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: SLATE, marginBottom: 6 }}>Import into</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {data.accounts.map(a => (
                  <button key={a.id} onClick={() => setAccountId(a.id)} style={{
                    padding: "6px 12px", borderRadius: 999, border: `1px solid ${accountId === a.id ? ACCENT : INK_SOFT + "40"}`,
                    background: accountId === a.id ? "rgba(99,102,241,0.12)" : "transparent", color: accountId === a.id ? ACCENT : TEXT,
                    fontSize: 12.5, cursor: "pointer"
                  }}>{a.name}</button>
                ))}
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: TEXT, marginBottom: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={adjustBalance} onChange={e => setAdjustBalance(e.target.checked)} style={{ marginTop: 2 }} />
              <span>
                Apply the net total to the account balance
                <span style={{ display: "block", fontSize: 10.5, color: SLATE, marginTop: 1 }}>
                  Leave off if your balance is already up to date — imported history is for analysis, not bookkeeping.
                </span>
              </span>
            </label>

            <div style={{ maxHeight: 420, overflowY: "auto", marginBottom: 14 }}>
              {parsed.map(t => (
                <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 6, borderRadius: 8, background: PAPER_DIM, opacity: t.include ? 1 : 0.45 }}>
                  <input type="checkbox" checked={t.include} onChange={() => toggleRow(t.key)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.note} {t.dup && <span style={{ fontSize: 9.5, color: ACCENT, fontWeight: 700 }}>DUP?</span>}
                    </div>
                    <div style={{ fontSize: 10.5, color: SLATE }}>{t.date}</div>
                  </div>
                  {t.isCash && cashAccount ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: SAGE, background: `${SAGE}1a`, border: `1px solid ${SAGE}40`, borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
                      <Banknote size={11} /> to Cash
                    </span>
                  ) : t.type === "expense" && (
                    <select value={t.categoryId || ""} onChange={e => setRowCategory(t.key, e.target.value)}
                      style={{ ...inputStyle, width: 110, padding: "4px 6px", fontSize: 11 }}>
                      {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: t.type === "income" ? SAGE : RUST, whiteSpace: "nowrap" }}>
                    {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <SmallBtn tone="gold" onClick={runImport} style={{ flex: 1, justifyContent: "center" }}>
                <Check size={13} /> Import {included.length} transaction{included.length === 1 ? "" : "s"}
              </SmallBtn>
              <SmallBtn tone="ghost" onClick={() => { setParsed(null); setError(null); }}>Cancel</SmallBtn>
            </div>
          </>
        )}

        {!parsed && data.accounts.length === 0 && <Empty text="Add an account first so imports have somewhere to land." />}
      </Section>
    </div>
  );
}
