import { useState, useEffect, useRef } from "react";
import { LayoutDashboard, Wallet, ArrowLeftRight, Receipt, Target, TrendingDown, Plus, X, Check, Edit2, Trash2, Activity, ChevronLeft, ChevronRight, RefreshCw, Landmark, PiggyBank, Home, Zap, Droplet, Wifi, Phone, Repeat, Shield, MoreHorizontal } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const STORAGE_KEY = "antonio-finance-data";

const INK = "#16232E";
const INK_SOFT = "#7C8CA0";
const CARD = "#1E2B38";
const TEXT = "#E9ECEF";
const PAPER = "#F7F4EC";
const PAPER_DIM = "#2A333D";
const GOLD = "#C9A13D";
const RUST = "#D66C52";
const SAGE = "#6FA57A";
const SLATE = "#93A1AF";

// Lively-but-soft palette for the Habits tab
const TEAL = "#2FA898", TEAL_BG = "#DCF3EF";
const AMBER = "#E2A13B", AMBER_BG = "#FBEAD0";
const CORAL = "#E2703B", CORAL_BG = "#FBE0D0";
const CHART_COLORS = ["#2FA898", "#E2A13B", "#E2703B", "#8B6FD1", "#54725A", "#B8902E", "#6E9BC9", "#C97F9E"];
const ABSTINENCE_COLORS = ["#A8264F", "#2C3E42", "#1F8A70", "#5B4636", "#C0392B", "#2A3F8F", "#6B4E9C", "#3D6B4F"];
const ACCOUNT_TYPES = [
  { id: "checking", label: "Checking", icon: Landmark },
  { id: "savings", label: "Savings", icon: PiggyBank },
];
const BILL_TEMPLATES = ["Rent", "Electricity", "Water", "Internet", "Phone", "Subscription", "Insurance"];
const BILL_ICONS = {
  Rent: Home, Electricity: Zap, Water: Droplet, Internet: Wifi, Phone: Phone,
  Subscription: Repeat, Insurance: Shield, Other: MoreHorizontal,
};
const VIOLET = "#8D7CF0";
const VIOLET_BG = "#2A2545";

function uid() { return Math.random().toString(36).slice(2, 10); }
function fmt(n) {
  const v = Number(n) || 0;
  return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}

function defaultData() {
  return {
    accounts: [{ id: uid(), name: "Checking", balance: 0, type: "checking" }],
    categories: [
      { id: "cat_rent", name: "Rent", percent: 30 },
      { id: "cat_ess", name: "Essentials", percent: 30 },
      { id: "cat_disc", name: "Discretionary", percent: 20 },
      { id: "cat_sav", name: "Savings", percent: 20 },
    ],
    transactions: [],
    bills: [],
    goals: [],
    debts: [],
    habits: [],
    foodItems: [],
    abstinence: [],
    weeklyReviews: [],
    goalWeight: 80,
    nextPaycheck: "2026-07-17",
    cycleDays: 14,
  };
}

function daysInMonthCount(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
function monthDates(ym) {
  const n = daysInMonthCount(ym);
  return Array.from({ length: n }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`);
}
function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function generateDemoData() {
  const today = todayStr();
  const d = n => addDays(today, n);

  const accounts = [
    { id: uid(), name: "Checking", balance: 2450.75, type: "checking" },
    { id: uid(), name: "Savings", balance: 5200, type: "savings" },
  ];
  const categories = [
    { id: uid(), name: "Rent", percent: 30 },
    { id: uid(), name: "Essentials", percent: 30 },
    { id: uid(), name: "Discretionary", percent: 20 },
    { id: uid(), name: "Savings", percent: 20 },
  ];
  const [rentCat, essCat, discCat] = categories;
  const checkingId = accounts[0].id;

  // Two pay periods of transactions (28 days) so "vs avg spend" has real prior-period data to compare against
  const transactions = [];
  for (const offset of [-6, -20]) {
    transactions.push({ id: uid(), type: "income", amount: 2100, accountId: checkingId, date: d(offset), note: "Paycheck" });
    transactions.push({ id: uid(), type: "expense", amount: 1200, accountId: checkingId, categoryId: rentCat.id, date: d(offset), note: "Rent" });
    transactions.push({ id: uid(), type: "expense", amount: 70 + Math.round(Math.random() * 40), accountId: checkingId, categoryId: essCat.id, date: d(offset + 1), note: "Groceries" });
    transactions.push({ id: uid(), type: "expense", amount: 25 + Math.round(Math.random() * 30), accountId: checkingId, categoryId: discCat.id, date: d(offset + 3), note: "Dinner out" });
    transactions.push({ id: uid(), type: "expense", amount: 40 + Math.round(Math.random() * 25), accountId: checkingId, categoryId: essCat.id, date: d(offset + 4), note: "Gas" });
    transactions.push({ id: uid(), type: "expense", amount: 15 + Math.round(Math.random() * 20), accountId: checkingId, categoryId: discCat.id, date: d(offset + 6), note: "Streaming / fun" });
  }
  transactions.push({ id: uid(), type: "expense", amount: 90, accountId: checkingId, categoryId: essCat.id, date: d(-1), note: "Groceries" });

  const bills = [
    { id: uid(), name: "Electricity", amount: 78, dueDate: d(21), frequencyDays: 30, accountId: checkingId, categoryId: essCat.id, lastPaid: d(-9) },
    { id: uid(), name: "Internet", amount: 55, dueDate: d(4), frequencyDays: 30, accountId: checkingId, categoryId: essCat.id, lastPaid: d(-26) },
    { id: uid(), name: "Rent", amount: 1200, dueDate: d(8), frequencyDays: 30, accountId: checkingId, categoryId: rentCat.id, lastPaid: d(-6) },
  ];

  const goals = [
    { id: uid(), name: "Emergency fund", target: 3000, saved: 1200 },
    { id: uid(), name: "New laptop", target: 1500, saved: 400 },
  ];

  const debts = [
    { id: uid(), name: "Student loan", total: 8000, rate: 5.5, paid: 1200 },
  ];

  // 90 days of procedurally generated habit history — real weekly rhythm, not flat placeholder data.
  // Training Mon/Wed/Fri-ish, fasting Tue/Thu-ish, drinks skew toward weekends, weight trending down,
  // identity score loosely tracking training/drinking that day. This is what populates the heat strip
  // and lets the Monthly grid show real variation when you page back through past months.
  const trainingNotes = ["RDL 3x10", "Incline press 3x10", "Lat pulldown 3x10", "Hip thrust 3x10", "Goblet squat 3x10"];
  const habits = [];
  for (let i = 90; i >= 1; i--) {
    const date = d(-i);
    const dow = new Date(date + "T00:00:00").getDay(); // 0 Sun .. 6 Sat
    const isWeekend = dow === 0 || dow === 6;
    const trained = [1, 3, 5].includes(dow) && Math.random() > 0.2;
    const fasted = [2, 4].includes(dow) && Math.random() > 0.35;
    const alcoholDrinks = isWeekend ? Math.round(Math.random() * 4) : (Math.random() > 0.82 ? 1 : 0);
    const weightTrend = 93.2 - ((90 - i) / 90) * 3.6;
    const weight = Math.round((weightTrend + (Math.random() * 0.6 - 0.3)) * 10) / 10;
    const sleepTime = isWeekend ? "23:45" : "22:45";
    const wakeTime = isWeekend ? "07:30" : "06:15";
    const identityBase = 5 + (trained ? 2 : 0) - alcoholDrinks * 0.8;
    const identityScore = Math.max(1, Math.min(10, Math.round(identityBase + (Math.random() * 2 - 1))));
    habits.push({
      id: uid(), date, trained, weight, sleepTime, wakeTime, alcoholDrinks,
      trainingNote: trained ? trainingNotes[Math.floor(Math.random() * trainingNotes.length)] : "",
      fastingHours: fasted ? 16 : 0, fastingStart: fasted ? "12:00" : null, fastCompleted: fasted,
      identityScore,
    });
  }

  // Today — actively fasting, started 5 hours ago on a 16h fast (demonstrates the live countdown)
  const now = new Date();
  let startH = now.getHours() - 5;
  if (startH < 0) startH += 24;
  const todayFastStart = String(startH).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  habits.push({ id: uid(), date: today, trained: false, weight: 89.6, alcoholDrinks: 0, trainingNote: "", fastingHours: 16, fastingStart: todayFastStart, fastCompleted: false, identityScore: 7 });

  const foodItems = [
    { id: uid(), date: d(-1), name: "Chicken breast", calories: 280, protein: 42, carbs: 0, fat: 8 },
    { id: uid(), date: d(-1), name: "Rice, 1 cup", calories: 205, protein: 4, carbs: 45, fat: 0 },
    { id: uid(), date: d(-2), name: "Salmon fillet", calories: 350, protein: 34, carbs: 0, fat: 22 },
    { id: uid(), date: d(-2), name: "Steamed broccoli", calories: 55, protein: 4, carbs: 11, fat: 0 },
    { id: uid(), date: d(-4), name: "Protein shake", calories: 160, protein: 30, carbs: 6, fat: 2 },
    { id: uid(), date: today, name: "Greek yogurt", calories: 130, protein: 17, carbs: 9, fat: 4 },
  ];

  const abstinence = [
    { id: uid(), name: "Quit Vaping", color: ABSTINENCE_COLORS[2], startedAt: new Date(Date.now() - 12 * 86400000 - 3 * 3600000).toISOString(), history: [4 * 86400] },
    { id: uid(), name: "Quit Drinking", color: ABSTINENCE_COLORS[0], startedAt: new Date(Date.now() - 3 * 86400000).toISOString(), history: [] },
  ];

  const weeklyReviews = [
    {
      id: uid(), date: d(-2),
      wentWell: "Trained 3x, kept drinking to weekends only.",
      wastedTime: "Too much time deciding what to eat instead of using the default meals.",
      proud: "Logged every day this week, even the rough one.",
      hurtDecision: "Skipped Tuesday's fast after a late night.",
      lesson: "Sleep under 6h reliably means more drinks the next weekend.",
      nextFocus: "Get the Sunday meal-prep habit actually running.",
    },
  ];

  return {
    accounts, categories, transactions, bills, goals, debts, habits, foodItems, abstinence, weeklyReviews,
    goalWeight: 80, nextPaycheck: d(3), cycleDays: 14,
  };
}


function getPeriod(nextPaycheck, cycleDays) {
  let next = nextPaycheck;
  const today = todayStr();
  let guard = 0;
  while (daysBetween(today, next) < 0 && guard < 200) {
    next = addDays(next, cycleDays);
    guard++;
  }
  const start = addDays(next, -cycleDays);
  const dayIndex = Math.min(cycleDays, Math.max(0, daysBetween(start, today)));
  return { start, end: addDays(next, -1), next, dayIndex, totalDays: cycleDays };
}

function migrate(d) {
  if (!d.categories.some(c => c.name.toLowerCase() === "rent")) {
    d = { ...d, categories: [{ id: uid(), name: "Rent", percent: 0 }, ...d.categories] };
  }
  if (!d.habits) d = { ...d, habits: [] };
  if (d.goalWeight === undefined) d = { ...d, goalWeight: 80 };
  if (!d.abstinence) d = { ...d, abstinence: [] };
  if (!d.weeklyReviews) d = { ...d, weeklyReviews: [] };
  d = { ...d, accounts: d.accounts.map(a => a.type ? a : { ...a, type: "checking" }) };
  if (!d.foodItems) {
    const seeded = d.habits.filter(h => h.calories).map(h => ({
      id: uid(), date: h.date, name: "Logged total (imported)",
      calories: Number(h.calories) || 0, protein: Number(h.protein) || 0, carbs: Number(h.carbs) || 0, fat: Number(h.fat) || 0
    }));
    d = { ...d, foodItems: seeded };
  }
  d = {
    ...d, habits: d.habits.map(h => {
      if (h.alcoholDrinks !== undefined) return h;
      const { alcohol, ...rest } = h;
      return { ...rest, alcoholDrinks: alcohol ? 1 : 0 };
    })
  };
  return d;
}

function Section({ title, eyebrow, children, right }) {
  return (
    <div style={{ marginBottom: 20, background: CARD, borderRadius: 22, padding: "18px 16px", border: `1px solid ${INK_SOFT}18` }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          {eyebrow && <div style={{ fontSize: 11, letterSpacing: "0.12em", color: SLATE, textTransform: "uppercase", marginBottom: 2 }}>{eyebrow}</div>}
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 18, color: TEXT, margin: 0 }}>{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ pct, tone = "sage" }) {
  const color = pct > 100 ? RUST : tone === "gold" ? GOLD : SAGE;
  const width = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ height: 6, background: PAPER_DIM, borderRadius: 3, overflow: "hidden", border: `1px solid ${INK_SOFT}18` }}>
      <div style={{ height: "100%", width: width + "%", background: color, transition: "width 0.3s" }} />
    </div>
  );
}
function FastBar({ pct, label }) {
  const width = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ position: "relative", height: 22, background: PAPER_DIM, borderRadius: 11, overflow: "hidden", border: `1px solid ${INK_SOFT}20` }}>
      <div style={{ position: "absolute", inset: 0, width: width + "%", background: AMBER, borderRadius: 11, transition: "width 0.3s" }} />
      {label && (
        <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: width > 50 ? "white" : TEXT }}>
          {label}
        </div>
      )}
    </div>
  );
}

function SmallBtn({ children, onClick, tone = "ink", style }) {
  const bg = tone === "ink" ? INK : tone === "gold" ? GOLD : tone === "rust" ? RUST : "transparent";
  const color = tone === "ghost" ? TEXT : PAPER;
  return (
    <button
      onClick={onClick}
      style={{
        background: bg, color, border: tone === "ghost" ? `1px solid ${INK_SOFT}55` : "none",
        borderRadius: 999, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 5, ...style
      }}
    >
      {children}
    </button>
  );
}

function useLongPress(onLongPress, ms = 450) {
  const timer = useRef(null);
  const start = () => { timer.current = setTimeout(onLongPress, ms); };
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  return { onPointerDown: start, onPointerUp: clear, onPointerLeave: clear, onPointerCancel: clear };
}

function IconBtn({ icon: Icon, onClick, color }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: color || SLATE, padding: 4, display: "flex" }}>
      <Icon size={14} />
    </button>
  );
}
function DeleteBtn({ onDelete }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <div style={{ display: "flex", gap: 4 }}>
        <SmallBtn tone="rust" onClick={onDelete} style={{ padding: "4px 8px" }}>Confirm</SmallBtn>
        <SmallBtn tone="ghost" onClick={() => setConfirm(false)} style={{ padding: "4px 8px" }}>Cancel</SmallBtn>
      </div>
    );
  }
  return <IconBtn icon={Trash2} onClick={() => setConfirm(true)} />;
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: SLATE, flex: 1, minWidth: 110 }}>
      {label}
      {children}
    </label>
  );
}
const inputStyle = {
  border: `1px solid ${INK_SOFT}40`, borderRadius: 14, padding: "9px 12px", fontSize: 13.5,
  background: PAPER_DIM, color: TEXT, fontFamily: "inherit", width: "100%", boxSizing: "border-box"
};
const minimalInputStyle = {
  border: "none", borderBottom: `1px solid ${INK_SOFT}35`, borderRadius: 0, padding: "8px 2px", fontSize: 13.5,
  background: "transparent", color: TEXT, fontFamily: "inherit", width: "100%", boxSizing: "border-box"
};

export default function FinanceOS() {
  const [data, setData] = useState(() => defaultData());
  const [tab, setTab] = useState("dashboard");
  const [saving, setSaving] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [showPaycheckSheet, setShowPaycheckSheet] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  function loadDemoData() {
    setData(generateDemoData());
    setConfirmDemo(false);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(migrate(JSON.parse(raw)));
    } catch (e) {
      // No saved data yet, or storage unavailable — the default data already on screen stands.
    }
  }, []);

  useEffect(() => {
    setSaving(true);
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) { /* ignore — local state already has the change */ }
      setSaving(false);
    }, 300);
    return () => clearTimeout(t);
  }, [data]);

  const period = getPeriod(data.nextPaycheck, data.cycleDays);
  const totalBalance = data.accounts.reduce((s, a) => s + a.balance, 0);
  const periodTx = data.transactions.filter(t => t.date >= period.start && t.date <= period.end);
  const incomeThisPeriod = periodTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const spentThisPeriod = periodTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const catPercentTotal = data.categories.reduce((s, c) => s + Number(c.percent || 0), 0);
  const currentMonth = todayStr().slice(0, 7);
  const habitDaysElapsed = Number(todayStr().slice(8, 10));
  const habitDaysLogged = data.habits.filter(h => h.date.startsWith(currentMonth) && h.date <= todayStr()).length;

  // Cumulative spend curve for this period, vs a flat budget reference line
  const periodBudgetTotal = incomeThisPeriod;
  const cumulativeSpendData = (() => {
    const todayIdx = Math.min(period.dayIndex, period.totalDays);
    let running = 0;
    const out = [];
    for (let i = 0; i <= todayIdx; i++) {
      const d = addDays(period.start, i);
      if (d > todayStr()) break;
      running += periodTx.filter(t => t.type === "expense" && t.date === d).reduce((s, t) => s + t.amount, 0);
      out.push({ day: i + 1, spend: Math.round(running), budget: Math.round(periodBudgetTotal) });
    }
    return out;
  })();

  // Average spend of the prior 3 completed periods (only counting periods that actually have data)
  const priorPeriodsAvg = (() => {
    const sums = [];
    let cursor = period.start;
    for (let i = 0; i < 3; i++) {
      const pEnd = addDays(cursor, -1);
      const pStart = addDays(cursor, -period.totalDays);
      const sum = data.transactions.filter(t => t.type === "expense" && t.date >= pStart && t.date <= pEnd).reduce((s, t) => s + t.amount, 0);
      if (sum > 0) sums.push(sum);
      cursor = pStart;
    }
    return sums.length ? sums.reduce((a, b) => a + b, 0) / sums.length : null;
  })();
  const vsAvg = priorPeriodsAvg !== null ? spentThisPeriod - priorPeriodsAvg : null;

  const daysUntilPayday = daysBetween(todayStr(), period.next);

  function categorySpend(catId) {
    return periodTx.filter(t => t.type === "expense" && t.categoryId === catId).reduce((s, t) => s + t.amount, 0);
  }
  function categoryBudget(pct) {
    return (incomeThisPeriod * pct) / 100;
  }

  function updateAccountBalance(accountId, delta) {
    setData(d => ({ ...d, accounts: d.accounts.map(a => a.id === accountId ? { ...a, balance: a.balance + delta } : a) }));
  }
  function addTransaction(tx) {
    setData(d => ({ ...d, transactions: [{ id: uid(), date: todayStr(), ...tx }, ...d.transactions] }));
  }

  function addIncome({ amount, accountId, note }) {
    if (!amount || !accountId) return;
    updateAccountBalance(accountId, Number(amount));
    addTransaction({ type: "income", amount: Number(amount), accountId, note });
  }

  const RENT_FIXED = 820;
  function computeSuggestedSplit(incomeAmount) {
    const remainingAfterRent = Math.max(0, incomeAmount - RENT_FIXED);
    // "future expenses" — bills other than rent already due before the next paycheck
    const cycleEnd = addDays(todayStr(), data.cycleDays);
    const upcomingBills = data.bills
      .filter(b => !b.name.toLowerCase().includes("rent") && b.dueDate >= todayStr() && b.dueDate <= cycleEnd)
      .reduce((s, b) => s + b.amount, 0);
    const afterBills = Math.max(0, remainingAfterRent - upcomingBills);
    const essentials = Math.round(afterBills * 0.45);
    const discretionary = Math.round(afterBills * 0.25);
    const savings = Math.max(0, Math.round(afterBills - essentials - discretionary));
    return { income: incomeAmount, rent: RENT_FIXED, upcomingBills, essentials, discretionary, savings };
  }
  function receivePaycheck(amount) {
    const amt = Number(amount);
    if (!amt) return;
    addIncome({ amount: amt, accountId: data.accounts[0]?.id, note: "Paycheck" });
    setData(d => ({ ...d, nextPaycheck: addDays(d.nextPaycheck, d.cycleDays) }));
    setSuggestion(computeSuggestedSplit(amt));
    setShowPaycheckSheet(false);
  }
  function applySuggestion() {
    if (!suggestion) return;
    const { income, rent, essentials, discretionary, savings } = suggestion;
    const pct = n => Math.round((n / income) * 100);
    const map = { rent: pct(rent), essentials: pct(essentials), discretionary: pct(discretionary), savings: pct(savings) };
    setData(d => ({
      ...d,
      categories: d.categories.map(c => {
        const key = ["rent", "essentials", "discretionary", "savings"].find(k => c.name.toLowerCase().includes(k));
        return key ? { ...c, percent: map[key] } : c;
      }),
    }));
    setSuggestion(null);
  }
  function addExpense({ amount, accountId, categoryId, note }) {
    if (!amount || !accountId || !categoryId) return;
    updateAccountBalance(accountId, -Number(amount));
    addTransaction({ type: "expense", amount: Number(amount), accountId, categoryId, note });
  }
  function addTransfer({ amount, fromId, toId, note }) {
    if (!amount || !fromId || !toId || fromId === toId) return;
    updateAccountBalance(fromId, -Number(amount));
    updateAccountBalance(toId, Number(amount));
    addTransaction({ type: "transfer", amount: Number(amount), accountId: fromId, toAccountId: toId, note });
  }

  function applyEffect(tx, sign) {
    if (tx.type === "income") updateAccountBalance(tx.accountId, sign * tx.amount);
    else if (tx.type === "expense") updateAccountBalance(tx.accountId, -sign * tx.amount);
    else if (tx.type === "transfer") {
      updateAccountBalance(tx.accountId, -sign * tx.amount);
      if (tx.toAccountId) updateAccountBalance(tx.toAccountId, sign * tx.amount);
    }
  }
  function deleteTransaction(tx) {
    applyEffect(tx, -1);
    setData(d => ({ ...d, transactions: d.transactions.filter(t => t.id !== tx.id) }));
  }
  function editTransaction(oldTx, updates) {
    applyEffect(oldTx, -1);
    const merged = { ...oldTx, ...updates, amount: Number(updates.amount) };
    applyEffect(merged, 1);
    setData(d => ({ ...d, transactions: d.transactions.map(t => t.id === oldTx.id ? merged : t) }));
  }

  function editAccount(id, updates) {
    setData(d => ({ ...d, accounts: d.accounts.map(a => a.id === id ? { ...a, ...updates, balance: Number(updates.balance) } : a) }));
  }
  function deleteAccount(id) {
    setData(d => ({ ...d, accounts: d.accounts.filter(a => a.id !== id) }));
  }
  function editBill(id, updates) {
    setData(d => ({ ...d, bills: d.bills.map(b => b.id === id ? { ...b, ...updates, amount: Number(updates.amount), frequencyDays: Number(updates.frequencyDays) } : b) }));
  }
  function deleteBill(id) {
    setData(d => ({ ...d, bills: d.bills.filter(b => b.id !== id) }));
  }
  function editGoal(id, updates) {
    setData(d => ({ ...d, goals: d.goals.map(g => g.id === id ? { ...g, ...updates, target: Number(updates.target), saved: Number(updates.saved) } : g) }));
  }
  function deleteGoal(id) {
    setData(d => ({ ...d, goals: d.goals.filter(g => g.id !== id) }));
  }
  function editDebt(id, updates) {
    setData(d => ({ ...d, debts: d.debts.map(x => x.id === id ? { ...x, ...updates, total: Number(updates.total), rate: Number(updates.rate), paid: Number(updates.paid) } : x) }));
  }
  function deleteDebt(id) {
    setData(d => ({ ...d, debts: d.debts.filter(x => x.id !== id) }));
  }
  function editCategory(id, updates) {
    setData(d => ({ ...d, categories: d.categories.map(c => c.id === id ? { ...c, ...updates, percent: Number(updates.percent) } : c) }));
  }
  function deleteCategory(id) {
    setData(d => ({ ...d, categories: d.categories.filter(c => c.id !== id) }));
  }
  function addCategory(name, percent) {
    if (!name) return;
    setData(d => ({ ...d, categories: [...d.categories, { id: uid(), name, percent: Number(percent) || 0 }] }));
  }

  function upsertHabitLog(date, updates) {
    setData(d => {
      const idx = d.habits.findIndex(h => h.date === date);
      if (idx >= 0) {
        const copy = [...d.habits];
        copy[idx] = { ...copy[idx], ...updates };
        return { ...d, habits: copy };
      }
      return { ...d, habits: [...d.habits, { id: uid(), date, ...updates }] };
    });
  }
  function toggleHabitBool(date, field) {
    const existing = data.habits.find(h => h.date === date);
    const current = existing ? !!existing[field] : false;
    upsertHabitLog(date, { [field]: !current });
  }
  function incrementAlcohol(date) {
    const existing = data.habits.find(h => h.date === date);
    const current = existing?.alcoholDrinks || 0;
    upsertHabitLog(date, { alcoholDrinks: current + 1 });
  }
  function editHabitLog(id, updates) {
    setData(d => ({ ...d, habits: d.habits.map(h => h.id === id ? { ...h, ...updates } : h) }));
  }
  function deleteHabitLog(id) {
    setData(d => ({ ...d, habits: d.habits.filter(h => h.id !== id) }));
  }
  function setGoalWeight(val) {
    setData(d => ({ ...d, goalWeight: Number(val) }));
  }
  function addFoodItem(item) {
    if (!item.name) return;
    setData(d => ({ ...d, foodItems: [{ id: uid(), ...item }, ...d.foodItems] }));
  }
  function editFoodItem(id, updates) {
    setData(d => ({ ...d, foodItems: d.foodItems.map(f => f.id === id ? { ...f, ...updates } : f) }));
  }
  function deleteFoodItem(id) {
    setData(d => ({ ...d, foodItems: d.foodItems.filter(f => f.id !== id) }));
  }

  function addAbstinence(name, color) {
    if (!name) return;
    setData(d => ({ ...d, abstinence: [...d.abstinence, { id: uid(), name, color, startedAt: new Date().toISOString(), history: [] }] }));
  }
  function resetAbstinence(id) {
    setData(d => ({
      ...d, abstinence: d.abstinence.map(a => {
        if (a.id !== id) return a;
        const elapsedSec = Math.floor((Date.now() - new Date(a.startedAt).getTime()) / 1000);
        return { ...a, startedAt: new Date().toISOString(), history: [...a.history, elapsedSec] };
      })
    }));
  }
  function editAbstinence(id, updates) {
    setData(d => ({ ...d, abstinence: d.abstinence.map(a => a.id === id ? { ...a, ...updates } : a) }));
  }
  function deleteAbstinence(id) {
    setData(d => ({ ...d, abstinence: d.abstinence.filter(a => a.id !== id) }));
  }

  function addWeeklyReview(review) {
    setData(d => ({ ...d, weeklyReviews: [{ id: uid(), date: todayStr(), ...review }, ...d.weeklyReviews] }));
  }
  function deleteWeeklyReview(id) {
    setData(d => ({ ...d, weeklyReviews: d.weeklyReviews.filter(w => w.id !== id) }));
  }

  function payBill(bill) {
    updateAccountBalance(bill.accountId, -bill.amount);
    addTransaction({ type: "expense", amount: bill.amount, accountId: bill.accountId, categoryId: bill.categoryId, note: "Bill: " + bill.name });
    setData(d => ({
      ...d,
      bills: d.bills.map(b => b.id === bill.id ? { ...b, lastPaid: todayStr(), dueDate: addDays(b.dueDate, b.frequencyDays) } : b)
    }));
  }

  function contributeGoal(goal, amount, accountId) {
    if (!amount || !accountId) return;
    updateAccountBalance(accountId, -Number(amount));
    addTransaction({ type: "transfer", amount: Number(amount), accountId, note: "To goal: " + goal.name });
    setData(d => ({ ...d, goals: d.goals.map(g => g.id === goal.id ? { ...g, saved: g.saved + Number(amount) } : g) }));
  }

  function payDebt(debt, amount, accountId) {
    if (!amount || !accountId) return;
    updateAccountBalance(accountId, -Number(amount));
    addTransaction({ type: "expense", amount: Number(amount), accountId, categoryId: null, note: "Debt payment: " + debt.name });
    setData(d => ({ ...d, debts: d.debts.map(x => x.id === debt.id ? { ...x, paid: x.paid + Number(amount) } : x) }));
  }

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "accounts", label: "Accounts", icon: Wallet },
    { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
    { id: "bills", label: "Bills", icon: Receipt },
    { id: "goals", label: "Goals", icon: Target },
    { id: "debt", label: "Debt", icon: TrendingDown },
    { id: "habits", label: "Habits", icon: Activity },
  ];

  return (
    <div style={{ minHeight: "100vh", background: INK, fontFamily: "system-ui, sans-serif", color: TEXT, paddingBottom: 70 }}>
      {/* Header + paycheck runway */}
      <div style={{ background: INK, color: PAPER, padding: "18px 16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 21, margin: 0, letterSpacing: "0.01em" }}>Life OS</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {confirmDemo ? (
              <>
                <span style={{ fontSize: 10.5, color: "#E0A0A0" }}>Overwrite all data?</span>
                <button onClick={loadDemoData} style={{ fontSize: 10.5, fontWeight: 700, background: "none", border: "none", color: GOLD, cursor: "pointer" }}>Confirm</button>
                <button onClick={() => setConfirmDemo(false)} style={{ fontSize: 10.5, background: "none", border: "none", color: SLATE, cursor: "pointer" }}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmDemo(true)} style={{ fontSize: 10.5, background: "none", border: "none", color: "#8A97A3", cursor: "pointer", textDecoration: "underline" }}>Load demo data</button>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: saving ? GOLD : SLATE }}>
              {saving && <RefreshCw size={11} className="spinner" />}
              {saving ? "saving…" : "saved"}
            </span>
          </div>
        </div>
        {tab !== "habits" ? (
          <div style={{ marginTop: 14 }}>
            {daysUntilPayday > 0 ? (
              <>
                <div style={{ fontSize: 11.5, color: "#C9C2AE", marginBottom: 4 }}>SAFE TO SPEND</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <span style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color: GOLD }}>{fmt(Math.max(0, (incomeThisPeriod - spentThisPeriod) / daysUntilPayday))}</span>
                    <span style={{ fontSize: 12, color: "#8A97A3" }}> / day</span>
                  </div>
                  <span style={{ fontSize: 11.5, color: "#8A97A3" }}>{daysUntilPayday} day{daysUntilPayday === 1 ? "" : "s"} to payday</span>
                </div>
              </>
            ) : (
              <button onClick={() => setShowPaycheckSheet(true)} style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "rgba(201,161,61,0.14)", border: `1px solid ${GOLD}55`, borderRadius: 14, padding: "12px 14px", cursor: "pointer"
              }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: GOLD }}>Payday is today — tap to add your paycheck</span>
                <Plus size={16} color={GOLD} />
              </button>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#C9C2AE", marginBottom: 6 }}>
              <span>THIS MONTH</span>
              <span>{habitDaysLogged} of {habitDaysElapsed} days logged</span>
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              {Array.from({ length: habitDaysElapsed }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 10, borderRadius: 2,
                  background: i < habitDaysLogged ? TEAL : "rgba(247,244,236,0.15)"
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "18px 16px", maxWidth: 640, margin: "0 auto" }}>
        {tab === "dashboard" && (
          <>
            <Section title="Spend this period">
              <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 11, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em" }}>Current spend this period</div>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 28, marginTop: 2 }}>{fmt(spentThisPeriod)}</div>
                    <div style={{ fontSize: 11, color: SAGE, marginTop: 2 }}>{fmt(incomeThisPeriod)} income this period</div>
                  </div>
                  {vsAvg !== null && (
                    <div style={{ textAlign: "right", fontSize: 11.5, color: vsAvg <= 0 ? SAGE : RUST, maxWidth: 130 }}>
                      <span style={{ fontWeight: 700 }}>{fmt(Math.abs(vsAvg))}</span> {vsAvg <= 0 ? "below" : "above"} avg spend
                    </div>
                  )}
                </div>
                {cumulativeSpendData.length > 1 && (
                  <div style={{ height: 140, marginTop: 10 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cumulativeSpendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: SLATE }} />
                        <YAxis hide />
                        <Tooltip formatter={v => fmt(v)} />
                        <Area type="monotone" dataKey="budget" stroke="none" fill={PAPER_DIM} fillOpacity={1} />
                        <Area type="monotone" dataKey="spend" stroke={TEAL} strokeWidth={2} fill="url(#spendFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div style={{ textAlign: "right", fontSize: 9.5, color: SLATE, marginTop: -4 }}>shaded = budget ceiling</div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: TEAL_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wallet size={16} color={TEAL} />
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                  {daysUntilPayday === 0 ? "Payday is today" : `Payday in ${daysUntilPayday} day${daysUntilPayday === 1 ? "" : "s"}`}
                </div>
              </div>

              {(() => {
                const leftover = incomeThisPeriod - spentThisPeriod;
                const openGoal = data.goals.find(g => g.saved < g.target);
                if (leftover <= 0 || !openGoal) return null;
                const suggestion = Math.min(Math.round(leftover * 0.2), openGoal.target - openGoal.saved);
                if (suggestion <= 0) return null;
                return (
                  <div style={{ background: PAPER_DIM, borderRadius: 10, padding: "12px 14px", marginTop: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{fmt(leftover)} unspent so far this period</div>
                    <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>Consider moving {fmt(suggestion)} toward "{openGoal.name}"</div>
                  </div>
                );
              })()}
            </Section>

            <Section title="Accounts" eyebrow="quick view">
              {data.accounts.map(a => (
                <Row key={a.id} left={a.name} right={fmt(a.balance)} />
              ))}
              <Row left="Net cash" right={fmt(totalBalance)} />
            </Section>

            <Section
              title="Budget split"
              eyebrow={`Income this period: ${fmt(incomeThisPeriod)}`}
              right={<span style={{ fontSize: 11, color: catPercentTotal !== 100 ? RUST : SLATE }}>{catPercentTotal}% allocated</span>}
            >
              {spentThisPeriod > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.categories.map((c, i) => ({ name: c.name, value: categorySpend(c.id), color: CHART_COLORS[i % CHART_COLORS.length] }))}
                          dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={2}
                        >
                          {data.categories.map((c, i) => <Cell key={c.id} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", pointerEvents: "none", textAlign: "center"
                    }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
                        {periodBudgetTotal > 0 ? Math.round((spentThisPeriod / periodBudgetTotal) * 100) : 0}%
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{fmt(spentThisPeriod)}</div>
                      <div style={{ fontSize: 9, color: SLATE }}>of {fmt(periodBudgetTotal)}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {data.categories.map((c, i) => {
                      const spent = categorySpend(c.id);
                      if (spent <= 0) return null;
                      return (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 4, background: CHART_COLORS[i % CHART_COLORS.length], display: "inline-block" }} />
                            <span style={{ fontSize: 12 }}>{c.name}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{fmt(spent)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {suggestion && (
                <div style={{ background: "rgba(201,161,61,0.1)", border: `1px solid ${GOLD}45`, borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Suggested split for this {fmt(suggestion.income)} paycheck
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                    <span>Rent (fixed)</span><span style={{ fontWeight: 700 }}>{fmt(suggestion.rent)}</span>
                  </div>
                  {suggestion.upcomingBills > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4, color: SLATE }}>
                      <span>Reserved for bills due this period</span><span>{fmt(suggestion.upcomingBills)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                    <span>Essentials</span><span style={{ fontWeight: 700 }}>{fmt(suggestion.essentials)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 8 }}>
                    <span>Discretionary</span><span style={{ fontWeight: 700 }}>{fmt(suggestion.discretionary)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, borderTop: `1px solid ${GOLD}30`, paddingTop: 8, marginBottom: 10 }}>
                    <span style={{ fontWeight: 700 }}>Savings — what's actually left over</span>
                    <span style={{ fontWeight: 700, color: SAGE }}>{fmt(suggestion.savings)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <SmallBtn onClick={applySuggestion} style={{ background: GOLD }}><Check size={12} /> Apply this split</SmallBtn>
                    <SmallBtn tone="ghost" onClick={() => setSuggestion(null)}>Dismiss</SmallBtn>
                  </div>
                </div>
              )}

              {data.categories.map(c => (
                <CategoryRow key={c.id} category={c} spent={categorySpend(c.id)} budget={categoryBudget(c.percent)}
                  onSave={updates => editCategory(c.id, updates)} onDelete={() => deleteCategory(c.id)} />
              ))}
              <AddCategoryForm onAdd={addCategory} />
            </Section>

            <Section title="Upcoming bills">
              {data.bills.length === 0 && <Empty text="No bills yet — add one in the Bills tab." />}
              {data.bills.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4).map(b => (
                <Row key={b.id} left={b.name} mid={b.dueDate} right={fmt(b.amount)} />
              ))}
            </Section>

            <Section title="Goals">
              {data.goals.length === 0 && <Empty text="No goals yet — add one in the Goals tab." />}
              {data.goals.map(g => (
                <div key={g.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{g.name}</span>
                    <span style={{ color: SLATE }}>{fmt(g.saved)} / {fmt(g.target)}</span>
                  </div>
                  <ProgressBar pct={(g.saved / g.target) * 100} tone="gold" />
                </div>
              ))}
            </Section>
          </>
        )}

        {tab === "habits" && (
          <HabitsTab data={data} upsertHabitLog={upsertHabitLog} toggleHabitBool={toggleHabitBool}
            toggleFasting={toggleFasting} incrementAlcohol={incrementAlcohol} editHabitLog={editHabitLog}
            deleteHabitLog={deleteHabitLog} setGoalWeight={setGoalWeight}
            addFoodItem={addFoodItem} editFoodItem={editFoodItem} deleteFoodItem={deleteFoodItem}
            addAbstinence={addAbstinence} resetAbstinence={resetAbstinence} editAbstinence={editAbstinence} deleteAbstinence={deleteAbstinence}
            addWeeklyReview={addWeeklyReview} deleteWeeklyReview={deleteWeeklyReview} />
        )}

        {tab === "accounts" && (
          <AccountsTab data={data} setData={setData} editAccount={editAccount} deleteAccount={deleteAccount} />
        )}

        {tab === "transactions" && (
          <TransactionsTab data={data} addIncome={addIncome} addExpense={addExpense} addTransfer={addTransfer}
            editTransaction={editTransaction} deleteTransaction={deleteTransaction} />
        )}

        {tab === "bills" && (
          <BillsTab data={data} setData={setData} payBill={payBill} editBill={editBill} deleteBill={deleteBill} />
        )}

        {tab === "goals" && (
          <GoalsTab data={data} setData={setData} contributeGoal={contributeGoal} editGoal={editGoal} deleteGoal={deleteGoal} />
        )}

        {tab === "debt" && (
          <DebtTab data={data} setData={setData} payDebt={payDebt} editDebt={editDebt} deleteDebt={deleteDebt} />
        )}
      </div>

      {showPaycheckSheet && (
        <PaycheckSheet onClose={() => setShowPaycheckSheet(false)} onConfirm={receivePaycheck} />
      )}

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: INK, display: "flex", borderTop: `1px solid ${INK_SOFT}22`, padding: "6px 6px" }}>
        {NAV.map(n => {
          const Icon = n.icon;
          const active = tab === n.id;
          return (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              flex: 1, background: "none", border: "none", padding: "5px 2px", cursor: "pointer",
              color: active ? "white" : "#9AA5AE", display: "flex", flexDirection: "column", alignItems: "center", gap: 3
            }}>
              <div style={{
                width: 34, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center",
                background: active ? GOLD : "transparent", transition: "background 0.2s"
              }}>
                <Icon size={16} strokeWidth={active ? 2.4 : 1.8} />
              </div>
              <span style={{ fontSize: 9, color: active ? GOLD : "#9AA5AE", fontWeight: active ? 700 : 400 }}>{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryRow({ category, spent, budget, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [percent, setPercent] = useState(category.percent);
  const pct = budget > 0 ? (spent / budget) * 100 : 0;

  if (editing) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
        <input style={{ ...inputStyle, flex: 2 }} value={name} onChange={e => setName(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1 }} type="number" value={percent} onChange={e => setPercent(e.target.value)} />
        <IconBtn icon={Check} color={SAGE} onClick={() => { onSave({ name, percent }); setEditing(false); }} />
        <IconBtn icon={X} onClick={() => setEditing(false)} />
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{category.name} <span style={{ color: SLATE, fontWeight: 400 }}>({category.percent}%)</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: pct > 100 ? RUST : SLATE }}>{fmt(spent)} / {fmt(budget)}</span>
          <IconBtn icon={Edit2} onClick={() => setEditing(true)} />
          <DeleteBtn onDelete={onDelete} />
        </div>
      </div>
      <ProgressBar pct={pct} />
    </div>
  );
}
function AddCategoryForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("");

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        width: 34, height: 34, borderRadius: "50%", border: `1px solid ${INK_SOFT}30`, background: CARD,
        color: TEXT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 8
      }}><Plus size={16} /></button>
    );
  }
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
      <input style={{ ...inputStyle, flex: 2 }} placeholder="New category" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="%" value={percent} onChange={e => setPercent(e.target.value)} />
      <SmallBtn tone="gold" onClick={() => { onAdd(name, percent); setName(""); setPercent(""); setOpen(false); }}><Check size={13} /></SmallBtn>
      <SmallBtn tone="ghost" onClick={() => setOpen(false)}><X size={13} /></SmallBtn>
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ fontSize: 12.5, color: SLATE, fontStyle: "italic", padding: "6px 0" }}>{text}</div>;
}
function Row({ left, mid, right, onClick }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${INK_SOFT}18`, fontSize: 13 }}>
      <span style={{ fontWeight: 600 }}>{left}</span>
      {mid && <span style={{ color: SLATE }}>{mid}</span>}
      <span>{right}</span>
    </div>
  );
}

function HeatCell({ filled, color, bg, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 26, height: 26, minWidth: 26, borderRadius: 5, border: "none", cursor: "pointer",
      background: filled ? color : bg, color: filled ? "white" : SLATE, fontSize: 10, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>{label || ""}</button>
  );
}

function FastingModal({ date, log, onClose, onSave, blockNew }) {
  const hasFast = (log?.fastingHours || 0) > 0;
  const [step, setStep] = useState(hasFast ? "clock" : "ask");
  const [duration, setDuration] = useState(log?.fastingHours || 16);
  const nowTime = (() => {
    const n = new Date();
    return String(n.getHours()).padStart(2, "0") + ":" + String(n.getMinutes()).padStart(2, "0");
  })();
  const [startTime, setStartTime] = useState(log?.fastingStart || nowTime);
  const [pastStart, setPastStart] = useState(log?.fastingStart || "08:00");
  const [pastEnd, setPastEnd] = useState(nowTime);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (step !== "clock" || date !== todayStr() || log?.fastCompleted) return;
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, [step, date, log?.fastCompleted]);

  function computeEnd(start, dur) {
    const [h, m] = start.split(":").map(Number);
    let endMin = h * 60 + m + dur * 60;
    const crosses = endMin >= 24 * 60;
    endMin = endMin % (24 * 60);
    const eh = Math.floor(endMin / 60), em = endMin % 60;
    return String(eh).padStart(2, "0") + ":" + String(em).padStart(2, "0") + (crosses ? " (+1d)" : "");
  }
  function elapsedMinutesNow(start) {
    const now = new Date();
    const [h, m] = start.split(":").map(Number);
    let diff = (now.getHours() * 60 + now.getMinutes()) - (h * 60 + m);
    if (diff < 0) diff += 24 * 60;
    return diff;
  }
  function durationBetween(start, end) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60;
    return Math.round((diff / 60) * 10) / 10;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,35,46,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div style={{ background: CARD, borderRadius: 12, padding: 20, width: "100%", maxWidth: 340, boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700 }}>{date}</span>
          <IconBtn icon={X} onClick={onClose} />
        </div>

        {step === "ask" && (
          <>
            <div style={{ fontSize: 15, marginBottom: 16, fontWeight: 600 }}>Fasting today?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <SmallBtn tone="ghost" onClick={() => setStep("logpast")} style={{ flex: 1, justifyContent: "center" }}>No</SmallBtn>
              <SmallBtn onClick={() => setStep(blockNew ? "blocked" : "setup")} style={{ flex: 1, justifyContent: "center", background: AMBER }}>Yes</SmallBtn>
            </div>
          </>
        )}

        {step === "blocked" && (
          <>
            <div style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>You already have an active fast running today. Finish or clear it before starting another.</div>
            <SmallBtn onClick={onClose} style={{ width: "100%", justifyContent: "center", background: AMBER }}>Got it</SmallBtn>
          </>
        )}

        {step === "logpast" && (
          <>
            <div style={{ fontSize: 12, color: SLATE, marginBottom: 10 }}>Log a fast that already happened</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <Field label="Start time"><input style={inputStyle} type="time" value={pastStart} onChange={e => setPastStart(e.target.value)} /></Field>
              <Field label="End time"><input style={inputStyle} type="time" value={pastEnd} onChange={e => setPastEnd(e.target.value)} /></Field>
            </div>
            <div style={{ fontSize: 11.5, color: SLATE, marginBottom: 14 }}>Length: {durationBetween(pastStart, pastEnd)}h</div>
            <SmallBtn onClick={() => { onSave({ fastingHours: durationBetween(pastStart, pastEnd), fastingStart: pastStart, fastCompleted: true }); onClose(); }} style={{ width: "100%", justifyContent: "center", background: AMBER }}>Log fast</SmallBtn>
            <button onClick={onClose} style={{ background: "none", border: "none", color: SLATE, fontSize: 12, marginTop: 10, cursor: "pointer", width: "100%" }}>Never mind</button>
          </>
        )}

        {step === "setup" && (
          <>
            <div style={{ fontSize: 12, color: SLATE, marginBottom: 8 }}>Fast length</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, maxHeight: 260, overflowY: "auto" }}>
              {[
                { h: 16, tag: "Recommended", desc: "The standard 16:8 window — sustainable for most days." },
                { h: 12, tag: "Easier", desc: "A shorter window if today's already a lot." },
                { h: 18, tag: "Extended", desc: "A bit more of a stretch, bigger deficit." },
                { h: 24, tag: "Full day", desc: "24 hours. Only if you're sure." },
              ].map(opt => (
                <button key={opt.h} onClick={() => setDuration(opt.h)} style={{
                  textAlign: "left", borderRadius: 10, overflow: "hidden", cursor: "pointer", padding: 0,
                  border: duration === opt.h ? `2px solid ${AMBER}` : `1px solid ${INK_SOFT}30`, background: "none"
                }}>
                  <div style={{ background: duration === opt.h ? AMBER : PAPER_DIM, color: duration === opt.h ? "white" : SLATE, fontSize: 10.5, fontWeight: 700, padding: "5px 10px" }}>{opt.tag}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>{opt.h}h</div>
                      <div style={{ fontSize: 11, color: SLATE, marginTop: 2 }}>{opt.desc}</div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginLeft: 8,
                      border: `2px solid ${duration === opt.h ? AMBER : INK_SOFT}`,
                      background: duration === opt.h ? AMBER : "transparent"
                    }} />
                  </div>
                </button>
              ))}
            </div>
            <Field label="Start time"><input style={inputStyle} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></Field>
            <SmallBtn onClick={() => { onSave({ fastingHours: duration, fastingStart: startTime, fastCompleted: false }); onClose(); }} style={{ marginTop: 14, background: AMBER, width: "100%", justifyContent: "center" }}>Start fast</SmallBtn>
          </>
        )}

        {step === "clock" && log && (() => {
          const endLabel = computeEnd(log.fastingStart || "00:00", log.fastingHours);
          const isLive = date === todayStr() && !log.fastCompleted;
          const elapsed = isLive ? elapsedMinutesNow(log.fastingStart || "00:00") : null;
          const totalMin = log.fastingHours * 60;
          const pct = elapsed !== null ? Math.min(100, (elapsed / totalMin) * 100) : 100;
          const remainingMin = elapsed !== null ? Math.max(0, totalMin - elapsed) : 0;
          return (
            <>
              <div style={{ fontSize: 13, color: SLATE, marginBottom: 6 }}>{log.fastingHours}h fast · started {log.fastingStart} · ends {endLabel}</div>
              <FastBar pct={pct} label={`${Math.round(pct)}%`} />
              {isLive ? (
                <div style={{ marginTop: 10, fontFamily: "Georgia, serif", fontSize: 20, textAlign: "center" }}>
                  {remainingMin > 0 ? `${Math.floor(remainingMin / 60)}h ${remainingMin % 60}m left` : "Fast complete"}
                </div>
              ) : (
                <div style={{ marginTop: 10, fontSize: 13, textAlign: "center", color: SLATE }}>Logged fast for this day</div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <SmallBtn tone="ghost" onClick={() => setStep("setup")} style={{ flex: 1, justifyContent: "center" }}>Edit</SmallBtn>
                <SmallBtn tone="rust" onClick={() => { onSave({ fastingHours: 0, fastingStart: null, fastCompleted: false }); onClose(); }} style={{ flex: 1, justifyContent: "center" }}>Clear</SmallBtn>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

function formatDuration(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d, ${h}h, ${m}m, ${s}s`;
  if (h > 0) return `${h}h, ${m}m, ${s}s`;
  if (m > 0) return `${m}m, ${s}s`;
  return `${s}s`;
}

function AbstinenceRow({ item, onReset, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [color, setColor] = useState(item.color);
  const [confirmReset, setConfirmReset] = useState(false);

  const elapsedSec = Math.floor((Date.now() - new Date(item.startedAt).getTime()) / 1000);
  const best = item.history.length ? Math.max(...item.history, elapsedSec) : elapsedSec;

  if (editing) {
    return (
      <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
        <input style={{ ...inputStyle, marginBottom: 8 }} value={name} onChange={e => setName(e.target.value)} />
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {ABSTINENCE_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 24, height: 24, borderRadius: 6, border: color === c ? `2px solid ${TEXT}` : "2px solid transparent", background: c, cursor: "pointer"
            }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <SmallBtn tone="gold" onClick={() => { onSave({ name, color }); setEditing(false); }}><Check size={12} /> Save</SmallBtn>
          <SmallBtn tone="ghost" onClick={() => setEditing(false)}>Cancel</SmallBtn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px 6px" }}>
        <div style={{ background: item.color, color: "white", fontWeight: 700, fontSize: 13, padding: "6px 12px", borderRadius: 8 }}>{item.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconBtn icon={Edit2} onClick={() => setEditing(true)} />
          <DeleteBtn onDelete={onDelete} />
        </div>
      </div>
      <div style={{ padding: "0 12px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 16 }}>{formatDuration(elapsedSec)}</div>
          {confirmReset ? (
            <div style={{ display: "flex", gap: 6 }}>
              <SmallBtn tone="rust" onClick={() => { onReset(); setConfirmReset(false); }}>Confirm reset</SmallBtn>
              <SmallBtn tone="ghost" onClick={() => setConfirmReset(false)}>Cancel</SmallBtn>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} style={{
              width: 36, height: 36, borderRadius: "50%", border: `1px solid ${INK_SOFT}30`, background: CARD, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", color: TEXT
            }}><RefreshCw size={16} /></button>
          )}
        </div>
        {item.history.length > 0 && (
          <div style={{ marginTop: 8, height: 14, background: PAPER_DIM, borderRadius: 7, overflow: "hidden" }}>
            <div style={{ height: "100%", width: Math.min(100, (elapsedSec / best) * 100) + "%", background: item.color, borderRadius: 7, transition: "width 0.3s" }} />
          </div>
        )}
      </div>
    </div>
  );
}

function AbstinencePage({ data, addAbstinence, resetAbstinence, editAbstinence, deleteAbstinence, onBack }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const [name, setName] = useState("");
  const [color, setColor] = useState(ABSTINENCE_COLORS[0]);

  function submit() {
    if (!name) return;
    addAbstinence(name, color);
    setName("");
  }

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: TEXT, fontWeight: 600, fontSize: 13, marginBottom: 16 }}>
        <ChevronLeft size={16} /> Back to Habits
      </button>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, marginBottom: 14, marginTop: 0 }}>Abstinence</h2>

      {data.abstinence.length === 0 && <Empty text="No trackers yet — add one below." />}
      {data.abstinence.map(item => (
        <AbstinenceRow key={item.id} item={item}
          onReset={() => resetAbstinence(item.id)}
          onSave={updates => editAbstinence(item.id, updates)}
          onDelete={() => deleteAbstinence(item.id)} />
      ))}

      <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 10, padding: 12, marginTop: 10 }}>
        <div style={{ fontSize: 11, color: SLATE, marginBottom: 6 }}>Add a tracker</div>
        <input style={{ ...inputStyle, marginBottom: 8 }} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Quit Drinking" />
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {ABSTINENCE_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 24, height: 24, borderRadius: 6, border: color === c ? `2px solid ${TEXT}` : "2px solid transparent", background: c, cursor: "pointer"
            }} />
          ))}
        </div>
        <SmallBtn onClick={submit} style={{ background: color }}><Plus size={13} /> Add tracker</SmallBtn>
      </div>
    </div>
  );
}

function HabitsTab({ data, upsertHabitLog, toggleHabitBool, toggleFasting, incrementAlcohol, editHabitLog, deleteHabitLog, setGoalWeight, addFoodItem, editFoodItem, deleteFoodItem, addAbstinence, resetAbstinence, editAbstinence, deleteAbstinence, addWeeklyReview, deleteWeeklyReview }) {
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [showAbstinence, setShowAbstinence] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const [showLogDaySheet, setShowLogDaySheet] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [review, setReview] = useState({ wentWell: "", wastedTime: "", proud: "", hurtDecision: "", lesson: "", nextFocus: "" });
  const [, setGlanceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setGlanceTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const dates = monthDates(month);
  // Glance totals sum every day shown in the grid (the whole month), so manually adding up the visible squares always matches
  const relevantDates = dates;

  function logFor(date) { return data.habits.find(h => h.date === date); }
  const todayIdentity = logFor(todayStr())?.identityScore ?? 5;
  const last30 = Array.from({ length: 30 }, (_, i) => addDays(todayStr(), -i));
  const identityScores = last30.map(d => logFor(d)?.identityScore).filter(v => v !== undefined);
  const identityAvg = identityScores.length ? (identityScores.reduce((a, b) => a + b, 0) / identityScores.length).toFixed(1) : "—";
  function submitReview() {
    addWeeklyReview(review);
    setReview({ wentWell: "", wastedTime: "", proud: "", hurtDecision: "", lesson: "", nextFocus: "" });
    setShowReviewForm(false);
  }
  function weightBefore(date) {
    const prior = data.habits.filter(h => h.date < date && h.weight).sort((a, b) => b.date.localeCompare(a.date))[0];
    return prior ? Number(prior.weight) : null;
  }

  const trainedCount = relevantDates.filter(d => logFor(d)?.trained).length;
  const fastingCount = relevantDates.filter(d => (logFor(d)?.fastingHours || 0) > 0).length;

  const activeFast = (() => {
    const todayLog = logFor(todayStr());
    if (!todayLog?.fastingHours || !todayLog?.fastingStart || todayLog?.fastCompleted) return null;
    const [h, m] = todayLog.fastingStart.split(":").map(Number);
    const now = new Date();
    let diff = (now.getHours() * 60 + now.getMinutes()) - (h * 60 + m);
    if (diff < 0) diff += 24 * 60;
    const totalMin = todayLog.fastingHours * 60;
    const remaining = totalMin - diff;
    return remaining > 0 ? { remaining, pct: Math.min(100, (diff / totalMin) * 100) } : null;
  })();

  // Drinks broken into week-long buckets (7-day chunks from the 1st of the month)
  const weekBuckets = [];
  for (let i = 0; i < relevantDates.length; i += 7) {
    const chunk = relevantDates.slice(i, i + 7);
    const total = chunk.reduce((s, d) => s + (logFor(d)?.alcoholDrinks || 0), 0);
    weekBuckets.push({ label: `Wk${Math.floor(i / 7) + 1}`, drinks: total });
  }
  const totalDrinks = weekBuckets.reduce((s, w) => s + w.drinks, 0);

  const weekStartDate = (() => {
    const d = new Date(todayStr() + "T00:00:00");
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  })();
  const weekDatesSoFar = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i)).filter(d => d <= todayStr());
  const drinksThisWeek = weekDatesSoFar.reduce((s, d) => s + (logFor(d)?.alcoholDrinks || 0), 0);
  const fastedThisWeek = weekDatesSoFar.filter(d => (logFor(d)?.fastingHours || 0) > 0).length;

  // Weight tracking — practical view: latest, 7-entry average, goal
  const weightLogs = data.habits.filter(h => h.weight).sort((a, b) => a.date.localeCompare(b.date));
  const latestWeight = weightLogs.length ? weightLogs[weightLogs.length - 1] : null;
  const latestDow = latestWeight ? new Date(latestWeight.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" }) : "";
  const firstWeight = weightLogs.length ? Number(weightLogs[0].weight) : null;
  const toGoalRaw = latestWeight ? Number(latestWeight.weight) - data.goalWeight : null;
  const toGoalLabel = toGoalRaw === null ? "—" : (toGoalRaw > 0 ? "+" : toGoalRaw < 0 ? "-" : "") + Math.abs(toGoalRaw).toFixed(1) + " kg";
  const prevBeforeLatest = latestWeight ? weightBefore(latestWeight.date) : null;
  const increment = (latestWeight && prevBeforeLatest != null) ? Number(latestWeight.weight) - prevBeforeLatest : null;
  const incrementLabel = increment === null ? "—" : (increment > 0 ? "+" : "") + increment.toFixed(1) + " kg";
  const incrementColor = increment === null ? SLATE : increment > 0 ? CORAL : increment < 0 ? TEAL : SLATE;
  const progressPct = firstWeight && firstWeight !== data.goalWeight
    ? Math.min(100, Math.max(0, ((firstWeight - Number(latestWeight.weight)) / (firstWeight - data.goalWeight)) * 100))
    : 0;

  const [dayForm, setDayForm] = useState({ date: todayStr(), wakeTime: "", sleepTime: "", weight: "", trainingNote: "" });
  function saveDayForm() {
    const { date, ...rest } = dayForm;
    upsertHabitLog(date, rest);
    setDayForm({ ...dayForm, wakeTime: "", sleepTime: "", weight: "", trainingNote: "" });
  }
  function sleepHoursFor(entry) {
    if (!entry.sleepTime || !entry.wakeTime) return null;
    const [sh, sm] = entry.sleepTime.split(":").map(Number);
    const [wh, wm] = entry.wakeTime.split(":").map(Number);
    let diff = (wh * 60 + wm) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60;
    return diff / 60;
  }
  const [showSleep, setShowSleep] = useState(false);
  const RANGE_OPTIONS = [
    { key: "7d", label: "7 Days", days: 7 },
    { key: "2w", label: "2 Weeks", days: 14 },
    { key: "1m", label: "1 Month", days: 30 },
    { key: "3m", label: "3 Months", days: 90 },
  ];
  const [rangeIdx, setRangeIdx] = useState(0);
  const chartRange = RANGE_OPTIONS[rangeIdx];
  const rangeCutoff = addDays(todayStr(), -chartRange.days);
  const rawSleepDays = data.habits.filter(h => h.sleepTime && h.wakeTime && h.date >= rangeCutoff).sort((a, b) => a.date.localeCompare(b.date));
  const sleepChartData = chartRange.days <= 14
    ? rawSleepDays.map(h => ({ date: h.date.slice(5), hours: Number(sleepHoursFor(h).toFixed(1)), drinks: h.alcoholDrinks || 0 }))
    : (() => {
        const buckets = [];
        for (let i = 0; i < rawSleepDays.length; i += 7) {
          const chunk = rawSleepDays.slice(i, i + 7);
          const avgHours = chunk.reduce((s, h) => s + sleepHoursFor(h), 0) / chunk.length;
          const totalDrinks = chunk.reduce((s, h) => s + (h.alcoholDrinks || 0), 0);
          buckets.push({ date: `Wk ${buckets.length + 1}`, hours: Number(avgHours.toFixed(1)), drinks: totalDrinks });
        }
        return buckets;
      })();
  const [historyOpen, setHistoryOpen] = useState(false);

  const rows = [
    { key: "trained", label: "Trained", color: TEAL, bg: TEAL_BG, kind: "bool" },
    { key: "fastingHours", label: "Fasted", color: AMBER, bg: AMBER_BG, kind: "fasting" },
    { key: "alcoholDrinks", label: "Alcohol", color: CORAL, bg: CORAL_BG, kind: "tally" },
  ];

  const weightChartData = weightLogs.filter(h => h.date >= rangeCutoff).map(h => ({ date: h.date.slice(5), weight: Number(h.weight) }));
  const periodAvg = weightChartData.length ? (weightChartData.reduce((s, w) => s + w.weight, 0) / weightChartData.length).toFixed(1) : null;
  const periodAvgLabel = { "7d": "7-day avg", "2w": "2-week avg", "1m": "1-month avg", "3m": "3-month avg" }[chartRange.key];

  const [fastDate, setFastDate] = useState(null);
  const weekdayLetter = d => new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "narrow" });

  if (showAbstinence) {
    return (
      <AbstinencePage
        data={data}
        addAbstinence={addAbstinence}
        resetAbstinence={resetAbstinence}
        editAbstinence={editAbstinence}
        deleteAbstinence={deleteAbstinence}
        onBack={() => setShowAbstinence(false)}
      />
    );
  }

  return (
    <>
      <Section title="Monthly grid">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <IconBtn icon={ChevronLeft} onClick={() => setMonth(shiftMonth(month, -1))} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{new Date(month + "-01T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <IconBtn icon={ChevronRight} onClick={() => setMonth(shiftMonth(month, 1))} />
        </div>
        <div style={{ overflowX: "auto", paddingBottom: 6 }}>
          <div style={{ display: "inline-block" }}>
            <div style={{ display: "flex", gap: 3, marginBottom: 4, marginLeft: 74 }}>
              {dates.map(d => (
                <div key={d} style={{ width: 26, minWidth: 26, textAlign: "center", fontSize: 9, color: SLATE, lineHeight: 1.1 }}>
                  <div>{Number(d.slice(8, 10))}</div>
                  <div style={{ fontWeight: 700, color: INK_SOFT }}>{weekdayLetter(d)}</div>
                </div>
              ))}
            </div>
            {rows.map(row => (
              <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 4 }}>
                <div style={{ width: 70, fontSize: 11.5, fontWeight: 600, color: TEXT }}>{row.label}</div>
                {dates.map(d => {
                  const log = logFor(d);
                  if (row.kind === "bool") {
                    return <HeatCell key={d} filled={!!log?.[row.key]} color={row.color} bg={row.bg} onClick={() => toggleHabitBool(d, row.key)} />;
                  }
                  if (row.kind === "fasting") {
                    const n = log?.fastingHours || 0;
                    return <HeatCell key={d} filled={n > 0} color={row.color} bg={row.bg} label={n > 0 ? n : ""} onClick={() => setFastDate(d)} />;
                  }
                  if (row.kind === "tally") {
                    const n = log?.alcoholDrinks || 0;
                    return <HeatCell key={d} filled={n > 0} color={row.color} bg={row.bg} label={n > 0 ? n : ""} onClick={() => incrementAlcohol(d)} />;
                  }
                  // weight trend — read only, colored by direction vs previous logged weight
                  if (!log?.weight) return <HeatCell key={d} filled={false} color={SLATE} bg={PAPER_DIM} />;
                  const prev = weightBefore(d);
                  const cur = Number(log.weight);
                  const dir = prev == null ? "–" : cur < prev ? "↓" : cur > prev ? "↑" : "–";
                  const col = dir === "↓" ? TEAL : dir === "↑" ? CORAL : SLATE;
                  return <HeatCell key={d} filled={true} color={col} bg={PAPER_DIM} label={dir} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Activity, last 90 days">
        <div style={{ overflowX: "auto", paddingBottom: 4 }}>
          <div style={{ display: "flex", gap: 2 }}>
            {Array.from({ length: 90 }, (_, i) => addDays(todayStr(), -(89 - i))).map(d => {
              const log = logFor(d);
              let score = -1;
              if (log) {
                score = 0;
                if (log.trained) score++;
                if ((log.fastingHours || 0) > 0) score++;
                if (!(log.alcoholDrinks > 0)) score++;
              }
              const scale = [PAPER_DIM, "#2E5A3A", "#3E8A4E", "#5FC96E"];
              return <div key={d} title={d} style={{ width: 5, height: 22, borderRadius: 2, background: score < 0 ? PAPER_DIM : scale[score], flexShrink: 0 }} />;
            })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 9.5, color: SLATE }}>
          <span>Less</span>
          {[PAPER_DIM, "#2E5A3A", "#3E8A4E", "#5FC96E"].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
          ))}
          <span>More</span>
        </div>
      </Section>

      {fastDate && (
        <FastingModal date={fastDate} log={logFor(fastDate)} onClose={() => setFastDate(null)}
          blockNew={!!activeFast && fastDate !== todayStr()}
          onSave={updates => upsertHabitLog(fastDate, updates)} />
      )}

      <Section title="This month at a glance">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 8, padding: "10px 10px" }}>
            <div style={{ fontSize: 10.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em" }}>Trained</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 16, color: TEAL, marginTop: 2 }}>{trainedCount} days</div>
          </div>
          <div style={{ background: activeFast ? AMBER_BG : CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 8, padding: "10px 10px" }}>
            <div style={{ fontSize: 10.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em" }}>{activeFast ? "Currently fasting" : "Fasted"}</div>
            {activeFast ? (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 15, color: AMBER, marginBottom: 6 }}>
                  {Math.floor(activeFast.remaining / 60)}h {activeFast.remaining % 60}m left
                </div>
                <FastBar pct={activeFast.pct} />
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 15, color: AMBER }}>{fastedThisWeek}</div>
                  <div style={{ fontSize: 9.5, color: SLATE }}>this week</div>
                </div>
                <div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 15, color: AMBER }}>{fastingCount}</div>
                  <div style={{ fontSize: 9.5, color: SLATE }}>this month</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 8, padding: "10px 10px" }}>
          <div style={{ fontSize: 10.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Drinks</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 16, color: drinksThisWeek > 0 ? CORAL : SLATE }}>{drinksThisWeek}</div>
              <div style={{ fontSize: 9.5, color: SLATE }}>this week</div>
            </div>
            <div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 16, color: totalDrinks > 0 ? CORAL : SLATE }}>{totalDrinks}</div>
              <div style={{ fontSize: 9.5, color: SLATE }}>this month</div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Identity" right={<span style={{ fontSize: 10.5, fontWeight: 700, color: VIOLET }}>30-day avg: {identityAvg}</span>}>
        <div style={{ fontSize: 12, color: SLATE, marginBottom: 10 }}>Acted like the person I'm becoming, today</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input type="range" min={0} max={10} step={1} value={todayIdentity}
            onChange={e => upsertHabitLog(todayStr(), { identityScore: Number(e.target.value) })}
            style={{ flex: 1, accentColor: VIOLET }} />
          <div style={{ width: 30, textAlign: "center", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700, color: VIOLET }}>{todayIdentity}</div>
        </div>
      </Section>

      <Section title="Weekly review" right={
        <span style={{ fontSize: 10, fontWeight: 700, color: VIOLET, background: VIOLET_BG, padding: "3px 9px", borderRadius: 10 }}>Sundays</span>
      }>
        {!showReviewForm ? (
          <SmallBtn onClick={() => setShowReviewForm(true)} style={{ background: VIOLET }}><Plus size={13} /> New review</SmallBtn>
        ) : (
          <>
            {[
              ["wentWell", "What went well?"], ["wastedTime", "Where did I waste time?"], ["proud", "What made me proud?"],
              ["hurtDecision", "What decisions hurt me?"], ["lesson", "Biggest lesson?"], ["nextFocus", "What deserves attention next week?"]
            ].map(([key, label]) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11.5, color: SLATE, marginBottom: 4 }}>{label}</div>
                <textarea style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} value={review[key]} onChange={e => setReview({ ...review, [key]: e.target.value })} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <SmallBtn onClick={submitReview} style={{ background: VIOLET }}><Check size={13} /> Save review</SmallBtn>
              <SmallBtn tone="ghost" onClick={() => setShowReviewForm(false)}>Cancel</SmallBtn>
            </div>
          </>
        )}
        {data.weeklyReviews.length === 0 && !showReviewForm && <Empty text="No reviews yet — first one starts this Sunday." />}
        {data.weeklyReviews.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {data.weeklyReviews.slice(0, 4).map(w => (
              <div key={w.id} style={{ padding: "10px 0", borderBottom: `1px solid ${INK_SOFT}18` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: VIOLET }}>{w.date}</span>
                  <DeleteBtn onDelete={() => deleteWeeklyReview(w.id)} />
                </div>
                <div style={{ fontSize: 11.5, color: SLATE }}>{w.lesson || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Weight tracking">
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: SLATE, marginBottom: 5 }}>Goal weight</div>
          <button onClick={() => setShowWeightPicker(true)} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", width: 140,
            background: PAPER_DIM, border: `1px solid ${INK_SOFT}30`, borderRadius: 14, padding: "8px 12px", cursor: "pointer"
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>{data.goalWeight} kg</span>
            <Edit2 size={12} color={SLATE} />
          </button>
        </div>
        {showWeightPicker && (
          <BottomSheet title="Set goal weight" onClose={() => setShowWeightPicker(false)}>
            <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {Array.from({ length: 16 }, (_, i) => 80 + i).map(w => (
                <button key={w} onClick={() => { setGoalWeight(w); setShowWeightPicker(false); }} style={{
                  display: "block", width: "100%", textAlign: "left", padding: "12px 6px", cursor: "pointer",
                  background: "none", border: "none", borderBottom: `1px solid ${INK_SOFT}18`,
                  fontSize: 15, fontWeight: Number(data.goalWeight) === w ? 700 : 400,
                  color: Number(data.goalWeight) === w ? GOLD : TEXT
                }}>{w} kg</button>
              ))}
            </div>
          </BottomSheet>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: SLATE }}>Latest</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 16 }}>{latestWeight ? latestWeight.weight + " kg" : "—"}</div>
            <div style={{ fontSize: 9.5, color: SLATE }}>{latestDow}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: SLATE }}>{periodAvgLabel}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 16 }}>{periodAvg ? periodAvg + " kg" : "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: SLATE }}>To goal</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 15 }}>{toGoalLabel}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: SLATE }}>Since last</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 16, color: incrementColor }}>{incrementLabel}</div>
          </div>
        </div>
        <ProgressBar pct={progressPct} tone="gold" />
      </Section>

      <Section title="Charts" right={
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setRangeIdx((rangeIdx + 1) % RANGE_OPTIONS.length)} style={{
            fontSize: 11, fontWeight: 600, border: `1px solid ${INK_SOFT}40`, borderRadius: 999, padding: "4px 11px",
            background: "transparent", color: TEXT, cursor: "pointer"
          }}>{chartRange.label}</button>
          <button onClick={() => setShowSleep(!showSleep)} style={{
            fontSize: 11, fontWeight: 600, border: `1px solid ${INK_SOFT}40`, borderRadius: 999, padding: "4px 11px",
            background: showSleep ? TEAL : "transparent", color: showSleep ? "white" : TEXT, cursor: "pointer"
          }}>{showSleep ? "Weight" : "Sleep hours"}</button>
        </div>
      }>
        {!showSleep ? (
          weightChartData.length > 1 ? (
            <div style={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={PAPER_DIM} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: SLATE }} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 10, fill: SLATE }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" stroke={TEAL} strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty text="Log weight on at least 2 days to see a trend line." />
        ) : (
          sleepChartData.length > 0 ? (
            <div>
              <div style={{ display: "flex", gap: 14, marginBottom: 6, fontSize: 10.5, color: SLATE }}>
                <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: AMBER, marginRight: 4 }} />{chartRange.days <= 14 ? "Sleep hours" : "Avg sleep hours/wk"}</span>
                <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: CORAL, marginRight: 4 }} />{chartRange.days <= 14 ? "Drinks that day" : "Total drinks/wk"}</span>
              </div>
              <div style={{ height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sleepChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={PAPER_DIM} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: SLATE }} />
                    <YAxis tick={{ fontSize: 10, fill: SLATE }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="hours" fill={AMBER} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="drinks" fill={CORAL} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : <Empty text="Log both sleep time and wake time to see sleep hours." />
        )}
      </Section>

      <Section title="Log a day" eyebrow="wake time, sleep, weight, training">
        <SmallBtn onClick={() => setShowLogDaySheet(true)} style={{ background: TEAL }}><Plus size={13} /> Add day</SmallBtn>
        {showLogDaySheet && (
          <BottomSheet title="Log a day" onClose={() => setShowLogDaySheet(false)}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Field label="Date"><input style={minimalInputStyle} type="date" value={dayForm.date} onChange={e => setDayForm({ ...dayForm, date: e.target.value })} /></Field>
              <Field label="Sleep time"><input style={minimalInputStyle} type="time" value={dayForm.sleepTime} onChange={e => setDayForm({ ...dayForm, sleepTime: e.target.value })} /></Field>
              <Field label="Wake time"><input style={minimalInputStyle} type="time" value={dayForm.wakeTime} onChange={e => setDayForm({ ...dayForm, wakeTime: e.target.value })} /></Field>
              <Field label="Weight (kg)"><input style={minimalInputStyle} type="number" value={dayForm.weight} onChange={e => setDayForm({ ...dayForm, weight: e.target.value })} /></Field>
              <Field label="Training note"><input style={minimalInputStyle} value={dayForm.trainingNote} onChange={e => setDayForm({ ...dayForm, trainingNote: e.target.value })} placeholder="e.g. RDL 3x10" /></Field>
            </div>
            <SmallBtn onClick={() => { saveDayForm(); setShowLogDaySheet(false); }} style={{ marginTop: 18, background: TEAL, width: "100%", justifyContent: "center" }}><Plus size={13} /> Save day</SmallBtn>
          </BottomSheet>
        )}
      </Section>

      <NutritionLog data={data} addFoodItem={addFoodItem} editFoodItem={editFoodItem} deleteFoodItem={deleteFoodItem} />

      <div style={{ marginBottom: 28 }}>
        <button onClick={() => setShowAbstinence(true)} style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "none", border: "none", borderBottom: `1px solid ${INK_SOFT}22`, paddingBottom: 8, cursor: "pointer"
        }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 19, color: TEXT, margin: 0 }}>Abstinence</h2>
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ marginBottom: 28 }}>
        <button onClick={() => setHistoryOpen(!historyOpen)} style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "none", border: "none", borderBottom: `1px solid ${INK_SOFT}22`, paddingBottom: 8, marginBottom: 10, cursor: "pointer"
        }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 19, color: TEXT, margin: 0 }}>History</h2>
          {historyOpen ? <ChevronLeft size={16} style={{ transform: "rotate(-90deg)" }} /> : <ChevronRight size={16} style={{ transform: "rotate(90deg)" }} />}
        </button>
        {historyOpen && (
          <>
            {data.habits.length === 0 && <Empty text="No days logged yet." />}
            {data.habits.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map(h => (
              <HabitLogRow key={h.id} log={h} onSave={updates => editHabitLog(h.id, updates)} onDelete={() => deleteHabitLog(h.id)} />
            ))}
          </>
        )}
      </div>
    </>
  );
}

function FoodItemRow({ item, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [f, setF] = useState({ name: item.name, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat });
  const longPress = useLongPress(() => setRevealed(true));
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
    <div {...longPress} onClick={() => revealed && setRevealed(false)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${INK_SOFT}18`, fontSize: 12.5, cursor: "pointer", userSelect: "none" }}>
      <div>
        <div style={{ fontWeight: 600 }}>{item.name}</div>
        <div style={{ color: SLATE, fontSize: 11 }}>P {item.protein || 0}g · C {item.carbs || 0}g · F {item.fat || 0}g</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 700, color: AMBER }}>{item.calories || 0} cal</span>
        {revealed && (
          <>
            <IconBtn icon={Edit2} onClick={() => setEditing(true)} />
            <DeleteBtn onDelete={onDelete} />
          </>
        )}
      </div>
    </div>
  );
}

function NutritionLog({ data, addFoodItem, editFoodItem, deleteFoodItem }) {
  const [viewDate, setViewDate] = useState(todayStr());
  const [form, setForm] = useState({ name: "", protein: "", carbs: "", fat: "", calories: "" });
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const items = data.foodItems.filter(f => f.date === viewDate);
  const totals = items.reduce((acc, f) => ({
    protein: acc.protein + Number(f.protein || 0),
    carbs: acc.carbs + Number(f.carbs || 0),
    fat: acc.fat + Number(f.fat || 0),
    calories: acc.calories + Number(f.calories || 0),
  }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

  function submit() {
    if (!form.name) return;
    addFoodItem({ date: viewDate, name: form.name, protein: Number(form.protein) || 0, carbs: Number(form.carbs) || 0, fat: Number(form.fat) || 0, calories: Number(form.calories) || 0 });
    setForm({ name: "", protein: "", carbs: "", fat: "", calories: "" });
    setShowAddSheet(false);
  }

  const historyDays = Array.from({ length: 14 }, (_, i) => addDays(todayStr(), -i));
  const historyTotals = historyDays.map(d => {
    const dayItems = data.foodItems.filter(f => f.date === d);
    return {
      date: d,
      calories: dayItems.reduce((s, f) => s + Number(f.calories || 0), 0),
      protein: dayItems.reduce((s, f) => s + Number(f.protein || 0), 0),
      count: dayItems.length,
    };
  }).filter(d => d.count > 0);

  return (
    <Section title="Nutrition log" eyebrow="logged separately, by item" right={
      <button onClick={() => setShowHistory(!showHistory)} style={{
        fontSize: 11, fontWeight: 600, border: `1px solid ${INK_SOFT}40`, borderRadius: 999, padding: "4px 11px",
        background: showHistory ? VIOLET : "transparent", color: showHistory ? "white" : TEXT, cursor: "pointer"
      }}>History</button>
    }>
      {showHistory ? (
        <div>
          {historyTotals.length === 0 && <Empty text="No nutrition logged in the past 2 weeks yet." />}
          {historyTotals.map(d => (
            <div key={d.date} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${INK_SOFT}18`, fontSize: 12.5 }}>
              <span style={{ color: SLATE }}>{d.date}</span>
              <span>{d.count} item{d.count === 1 ? "" : "s"} · P {d.protein.toFixed(0)}g</span>
              <span style={{ fontWeight: 700, color: AMBER }}>{d.calories.toFixed(0)} cal</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <Field label="Date"><input style={inputStyle} type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} /></Field>
          </div>

          {items.length > 0 && (
            <div style={{ background: PAPER_DIM, borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 10.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em" }}>Daily total</span>
                <span style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color: AMBER }}>{totals.calories.toFixed(0)} <span style={{ fontSize: 12, fontWeight: 400, color: SLATE }}>cal</span></span>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <span style={{ fontSize: 12, color: TEXT }}>P <b>{totals.protein.toFixed(0)}</b>g</span>
                <span style={{ fontSize: 12, color: TEXT }}>C <b>{totals.carbs.toFixed(0)}</b>g</span>
                <span style={{ fontSize: 12, color: TEXT }}>F <b>{totals.fat.toFixed(0)}</b>g</span>
              </div>
            </div>
          )}

          {items.length === 0 && <Empty text="No items logged for this date yet." />}
          {items.map(item => (
            <FoodItemRow key={item.id} item={item} onSave={updates => editFoodItem(item.id, updates)} onDelete={() => deleteFoodItem(item.id)} />
          ))}

          <SmallBtn onClick={() => setShowAddSheet(true)} style={{ marginTop: 12, background: AMBER }}><Plus size={13} /> Add item</SmallBtn>

          {showAddSheet && (
            <BottomSheet title="Add food item" onClose={() => setShowAddSheet(false)}>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <Field label="Item name"><input style={minimalInputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chicken breast" autoFocus /></Field>
                <Field label="Calories"><input style={minimalInputStyle} type="number" value={form.calories} onChange={e => setForm({ ...form, calories: e.target.value })} /></Field>
                <Field label="Protein (g)"><input style={minimalInputStyle} type="number" value={form.protein} onChange={e => setForm({ ...form, protein: e.target.value })} /></Field>
                <Field label="Carbs (g)"><input style={minimalInputStyle} type="number" value={form.carbs} onChange={e => setForm({ ...form, carbs: e.target.value })} /></Field>
                <Field label="Fat (g)"><input style={minimalInputStyle} type="number" value={form.fat} onChange={e => setForm({ ...form, fat: e.target.value })} /></Field>
              </div>
              <SmallBtn onClick={submit} style={{ marginTop: 18, background: AMBER, width: "100%", justifyContent: "center" }}><Plus size={13} /> Add item</SmallBtn>
            </BottomSheet>
          )}
        </>
      )}
    </Section>
  );
}

function HabitLogRow({ log, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({
    weight: log.weight || "", wakeTime: log.wakeTime || "", sleepTime: log.sleepTime || "",
    trainingNote: log.trainingNote || "", trained: !!log.trained, alcoholDrinks: log.alcoholDrinks || 0,
  });

  if (editing) {
    return (
      <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
          <Field label="Weight (kg)"><input style={minimalInputStyle} type="number" value={f.weight} onChange={e => setF({ ...f, weight: e.target.value })} /></Field>
          <Field label="Sleep time"><input style={minimalInputStyle} type="time" value={f.sleepTime} onChange={e => setF({ ...f, sleepTime: e.target.value })} /></Field>
          <Field label="Wake time"><input style={minimalInputStyle} type="time" value={f.wakeTime} onChange={e => setF({ ...f, wakeTime: e.target.value })} /></Field>
          <Field label="Drinks"><input style={minimalInputStyle} type="number" value={f.alcoholDrinks} onChange={e => setF({ ...f, alcoholDrinks: e.target.value })} /></Field>
          <Field label="Training note"><input style={minimalInputStyle} value={f.trainingNote} onChange={e => setF({ ...f, trainingNote: e.target.value })} placeholder="e.g. RDL 3x10" /></Field>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: SLATE, marginBottom: 10 }}>
          <input type="checkbox" checked={f.trained} onChange={e => setF({ ...f, trained: e.target.checked })} /> Trained
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <SmallBtn tone="gold" onClick={() => { onSave({ ...f, weight: Number(f.weight) || 0, alcoholDrinks: Number(f.alcoholDrinks) || 0 }); setEditing(false); }}><Check size={12} /> Save</SmallBtn>
          <SmallBtn tone="ghost" onClick={() => setEditing(false)}><X size={12} /> Cancel</SmallBtn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${INK_SOFT}18` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{log.date}</div>
        <div style={{ fontSize: 11, color: SLATE }}>
          {log.trained ? "Trained" : "Rest"}{log.weight ? ` · ${log.weight}kg` : ""}{log.alcoholDrinks ? ` · ${log.alcoholDrinks} drink${log.alcoholDrinks === 1 ? "" : "s"}` : ""}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <IconBtn icon={Edit2} onClick={() => setEditing(true)} />
        <DeleteBtn onDelete={onDelete} />
      </div>
    </div>
  );
}

function BottomSheet({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,35,46,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div style={{ background: CARD, borderRadius: "20px 20px 0 0", padding: "18px 16px 24px", width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 -10px 30px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, color: TEXT, margin: 0 }}>{title}</h3>
          <IconBtn icon={X} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

function PaycheckSheet({ onClose, onConfirm }) {
  const [amount, setAmount] = useState("");
  return (
    <BottomSheet title="Received a paycheck" onClose={onClose}>
      <Field label="Amount">
        <input style={inputStyle} type="number" value={amount} onChange={e => setAmount(e.target.value)} autoFocus placeholder="0.00" />
      </Field>
      <SmallBtn tone="gold" onClick={() => onConfirm(amount)} style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>
        <Check size={13} /> Confirm paycheck
      </SmallBtn>
    </BottomSheet>
  );
}

function AccountsTab({ data, setData, editAccount, deleteAccount }) {
  function addAccount(name, type) {
    if (!name) return;
    setData(d => ({ ...d, accounts: [...d.accounts, { id: uid(), name, balance: 0, type }] }));
  }
  return (
    <Section title="Accounts" eyebrow={`${data.accounts.length} account${data.accounts.length === 1 ? "" : "s"}`}>
      {data.accounts.length === 0 && <Empty text="No accounts yet — add one below." />}
      {data.accounts.map(a => (
        <AccountRow key={a.id} account={a} onSave={updates => editAccount(a.id, updates)} onDelete={() => deleteAccount(a.id)} />
      ))}
      <AddAccountForm onAdd={addAccount} />
    </Section>
  );
}

function AccountRow({ account, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
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
        <IconBtn icon={Check} color={SAGE} onClick={() => { onSave({ name, balance, type }); setEditing(false); }} />
        <IconBtn icon={X} onClick={() => setEditing(false)} />
      </div>
    );
  }
  const typeInfo = ACCOUNT_TYPES.find(t => t.id === account.type) || ACCOUNT_TYPES[0];
  const TypeIcon = typeInfo.icon;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${INK_SOFT}18` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: PAPER_DIM, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <TypeIcon size={15} color={SLATE} />
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{account.name}</div>
          <div style={{ fontSize: 11, color: SLATE }}>{typeInfo.label}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{fmt(account.balance)}</span>
        <IconBtn icon={Edit2} onClick={() => setEditing(true)} />
        <DeleteBtn onDelete={onDelete} />
      </div>
    </div>
  );
}

function AddAccountForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  if (!open) {
    return <SmallBtn onClick={() => setOpen(true)} style={{ marginTop: 10 }}><Plus size={13} /> Add account</SmallBtn>;
  }
  return (
    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {ACCOUNT_TYPES.map(t => {
          const TypeIcon = t.icon;
          const active = type === t.id;
          return (
            <button key={t.id} onClick={() => setType(t.id)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px 10px", borderRadius: 10, border: `1px solid ${active ? GOLD : INK_SOFT + "40"}`,
              background: active ? "rgba(201,161,61,0.12)" : "transparent", color: active ? GOLD : TEXT, cursor: "pointer"
            }}>
              <TypeIcon size={14} /> <span style={{ fontSize: 12.5 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="Account name" value={name} onChange={e => setName(e.target.value)} autoFocus />
        <SmallBtn tone="gold" onClick={() => { onAdd(name, type); setName(""); setOpen(false); }}><Check size={13} /></SmallBtn>
        <SmallBtn tone="ghost" onClick={() => setOpen(false)}><X size={13} /></SmallBtn>
      </div>
    </div>
  );
}

function TransactionsTab({ data, addIncome, addExpense, addTransfer, editTransaction, deleteTransaction }) {
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

  return (
    <>
      <Section title="Log a transaction">
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {["expense", "income", "transfer"].map(t => (
            <button key={t} onClick={() => setFormType(t)} style={{
              flex: 1, padding: "8px 0", borderRadius: 999, border: "none", cursor: "pointer",
              background: formType === t ? GOLD : PAPER_DIM, color: formType === t ? INK : TEXT,
              fontWeight: 700, fontSize: 12.5, textTransform: "capitalize"
            }}>{t}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Field label="Amount"><input style={inputStyle} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></Field>
          <Field label={formType === "transfer" ? "From account" : "Account"}>
            <select style={inputStyle} value={accountId} onChange={e => setAccountId(e.target.value)}>
              {data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          {formType === "transfer" && (
            <Field label="To account">
              <select style={inputStyle} value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
                {data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          )}
          {formType === "expense" && (
            <Field label="Category">
              <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Note"><input style={inputStyle} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" /></Field>
        </div>
        <SmallBtn tone="gold" onClick={submit} style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>
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
  const color = tx.type === "income" ? SAGE : tx.type === "expense" ? RUST : SLATE;

  if (editing) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
        <input style={{ ...inputStyle, flex: 1 }} type="number" value={amount} onChange={e => setAmount(e.target.value)} />
        <input style={{ ...inputStyle, flex: 2 }} value={note} onChange={e => setNote(e.target.value)} />
        <IconBtn icon={Check} color={SAGE} onClick={() => { onSave({ amount, note }); setEditing(false); }} />
        <IconBtn icon={X} onClick={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${INK_SOFT}18` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{tx.note || category?.name || (tx.type === "transfer" ? `Transfer to ${toAccount?.name || "—"}` : tx.type)}</div>
        <div style={{ fontSize: 11, color: SLATE }}>{tx.date} · {account?.name || "—"}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color }}>{sign}{fmt(tx.amount)}</span>
        <IconBtn icon={Edit2} onClick={() => setEditing(true)} />
        <DeleteBtn onDelete={onDelete} />
      </div>
    </div>
  );
}

function BillsTab({ data, setData, payBill, editBill, deleteBill }) {
  function addBill(bill) {
    setData(d => ({ ...d, bills: [...d.bills, { id: uid(), lastPaid: null, ...bill }] }));
  }
  const sorted = data.bills.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <Section title="Bills" eyebrow={`${data.bills.length} recurring`}>
      {sorted.length === 0 && <Empty text="No bills yet — add one below." />}
      {sorted.map(b => (
        <BillRow key={b.id} bill={b}
          onPay={() => payBill(b)}
          onSave={updates => editBill(b.id, updates)}
          onDelete={() => deleteBill(b.id)} />
      ))}
      <AddBillForm data={data} onAdd={addBill} />
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

  if (editing) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 10 }}>
        <input style={{ ...inputStyle, flex: 2, minWidth: 100 }} value={name} onChange={e => setName(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1, minWidth: 70 }} type="number" value={amount} onChange={e => setAmount(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1, minWidth: 120 }} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1, minWidth: 90 }} type="number" value={frequencyDays} onChange={e => setFrequencyDays(e.target.value)} />
        <IconBtn icon={Check} color={SAGE} onClick={() => { onSave({ name, amount, dueDate, frequencyDays }); setEditing(false); }} />
        <IconBtn icon={X} onClick={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${INK_SOFT}18` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: PAPER_DIM, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BillIcon size={15} color={SLATE} />
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{bill.name}</div>
          <div style={{ fontSize: 11, color: daysUntil <= 3 ? RUST : SLATE }}>
            {daysUntil < 0 ? "overdue" : daysUntil === 0 ? "due today" : `due in ${daysUntil}d`} · every {bill.frequencyDays}d
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{fmt(bill.amount)}</span>
        <SmallBtn tone="gold" onClick={onPay} style={{ padding: "5px 10px", fontSize: 11 }}>Mark paid</SmallBtn>
        <IconBtn icon={Edit2} onClick={() => setEditing(true)} />
        <DeleteBtn onDelete={onDelete} />
      </div>
    </div>
  );
}

function AddBillForm({ data, onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayStr());
  const [frequencyDays, setFrequencyDays] = useState(30);
  const [accountId, setAccountId] = useState(data.accounts[0]?.id || "");
  const [categoryId, setCategoryId] = useState(data.categories[0]?.id || "");

  if (!open) {
    return <SmallBtn onClick={() => setOpen(true)} style={{ marginTop: 10 }}><Plus size={13} /> Add bill</SmallBtn>;
  }

  function submit() {
    if (!name || !amount) return;
    onAdd({ name, amount: Number(amount), dueDate, frequencyDays: Number(frequencyDays), accountId, categoryId });
    setName("");
    setAmount("");
    setOpen(false);
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {BILL_TEMPLATES.map(t => (
          <button key={t} onClick={() => setName(t)} style={{
            padding: "5px 10px", borderRadius: 999, border: `1px solid ${name === t ? GOLD : INK_SOFT + "40"}`,
            background: name === t ? "rgba(201,161,61,0.12)" : "transparent", color: name === t ? GOLD : TEXT,
            fontSize: 11.5, cursor: "pointer"
          }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Field label="Name"><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Amount"><input style={inputStyle} type="number" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
        <Field label="Next due"><input style={inputStyle} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></Field>
        <Field label="Repeats every (days)"><input style={inputStyle} type="number" value={frequencyDays} onChange={e => setFrequencyDays(e.target.value)} /></Field>
        <Field label="Account">
          <select style={inputStyle} value={accountId} onChange={e => setAccountId(e.target.value)}>
            {data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <SmallBtn tone="gold" onClick={submit}><Check size={13} /> Save</SmallBtn>
        <SmallBtn tone="ghost" onClick={() => setOpen(false)}><X size={13} /> Cancel</SmallBtn>
      </div>
    </div>
  );
}

function GoalsTab({ data, setData, contributeGoal, editGoal, deleteGoal }) {
  function addGoal(name, target) {
    if (!name) return;
    setData(d => ({ ...d, goals: [...d.goals, { id: uid(), name, target: Number(target) || 0, saved: 0 }] }));
  }
  return (
    <Section title="Goals" eyebrow={`${data.goals.length} goal${data.goals.length === 1 ? "" : "s"}`}>
      {data.goals.length === 0 && <Empty text="No goals yet — add one below." />}
      {data.goals.map(g => (
        <GoalRow key={g.id} goal={g} data={data}
          onContribute={(amount, accountId) => contributeGoal(g, amount, accountId)}
          onSave={updates => editGoal(g.id, updates)}
          onDelete={() => deleteGoal(g.id)} />
      ))}
      <AddGoalForm onAdd={addGoal} />
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
        <IconBtn icon={Check} color={SAGE} onClick={() => { onSave({ name, target, saved: goal.saved }); setEditing(false); }} />
        <IconBtn icon={X} onClick={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{goal.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: SLATE }}>{fmt(goal.saved)} / {fmt(goal.target)}</span>
          <IconBtn icon={Edit2} onClick={() => setEditing(true)} />
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

function AddGoalForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  if (!open) return <SmallBtn onClick={() => setOpen(true)} style={{ marginTop: 8 }}><Plus size={13} /> Add goal</SmallBtn>;
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
      <input style={{ ...inputStyle, flex: 2 }} placeholder="Goal name" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="Target" value={target} onChange={e => setTarget(e.target.value)} />
      <SmallBtn tone="gold" onClick={() => { onAdd(name, target); setName(""); setTarget(""); setOpen(false); }}><Check size={13} /></SmallBtn>
      <SmallBtn tone="ghost" onClick={() => setOpen(false)}><X size={13} /></SmallBtn>
    </div>
  );
}

function DebtTab({ data, setData, payDebt, editDebt, deleteDebt }) {
  function addDebt(name, total, rate) {
    if (!name) return;
    setData(d => ({ ...d, debts: [...d.debts, { id: uid(), name, total: Number(total) || 0, rate: Number(rate) || 0, paid: 0 }] }));
  }
  return (
    <Section title="Debt" eyebrow={`${data.debts.length} tracked`}>
      {data.debts.length === 0 && <Empty text="No debts tracked — add one below." />}
      {data.debts.map(x => (
        <DebtRow key={x.id} debt={x} data={data}
          onPay={(amount, accountId) => payDebt(x, amount, accountId)}
          onSave={updates => editDebt(x.id, updates)}
          onDelete={() => deleteDebt(x.id)} />
      ))}
      <AddDebtForm onAdd={addDebt} />
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

  if (editing) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 12 }}>
        <input style={{ ...inputStyle, flex: 2, minWidth: 100 }} value={name} onChange={e => setName(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1, minWidth: 80 }} type="number" value={total} onChange={e => setTotal(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1, minWidth: 70 }} type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} />
        <IconBtn icon={Check} color={SAGE} onClick={() => { onSave({ name, total, rate, paid: debt.paid }); setEditing(false); }} />
        <IconBtn icon={X} onClick={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{debt.name} <span style={{ color: SLATE, fontWeight: 400 }}>({debt.rate}% APR)</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: SLATE }}>{fmt(remaining)} left</span>
          <IconBtn icon={Edit2} onClick={() => setEditing(true)} />
          <DeleteBtn onDelete={onDelete} />
        </div>
      </div>
      <ProgressBar pct={pct} tone="sage" />
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

function AddDebtForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [total, setTotal] = useState("");
  const [rate, setRate] = useState("");
  if (!open) return <SmallBtn onClick={() => setOpen(true)} style={{ marginTop: 8 }}><Plus size={13} /> Add debt</SmallBtn>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      <input style={{ ...inputStyle, flex: 2, minWidth: 100 }} placeholder="Debt name" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <input style={{ ...inputStyle, flex: 1, minWidth: 80 }} type="number" placeholder="Total" value={total} onChange={e => setTotal(e.target.value)} />
      <input style={{ ...inputStyle, flex: 1, minWidth: 70 }} type="number" step="0.1" placeholder="APR %" value={rate} onChange={e => setRate(e.target.value)} />
      <SmallBtn tone="gold" onClick={() => { onAdd(name, total, rate); setName(""); setTotal(""); setRate(""); setOpen(false); }}><Check size={13} /></SmallBtn>
      <SmallBtn tone="ghost" onClick={() => setOpen(false)}><X size={13} /></SmallBtn>
    </div>
  );
}
