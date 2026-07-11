import { useState, useEffect } from "react";
import { LayoutDashboard, Wallet, ArrowLeftRight, Receipt, Target, TrendingDown, TrendingUp, Plus, X, Check, Edit2, Activity, ChevronRight, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import { Cell, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { STORAGE_KEY, INK, INK_SOFT, CARD, TEXT, PAPER, PAPER_DIM, GOLD, RUST, SAGE, SLATE, TEAL, TEAL_BG, VIOLET, VIOLET_BG, SKY } from "./lib/constants.js";
import { uid, fmt, todayStr, addDays, daysBetween, formatShortDate, lerpColor, urgencyColor, progressColor, formatDuration, getPeriod } from "./lib/helpers.js";
import { defaultData, generateDemoData, migrate } from "./lib/data.js";
import { Section, ProgressBar, CountdownPill, SmallBtn, useLongPress, IconBtn, DeleteBtn, inputStyle, Empty, Row, StatTile } from "./components/shared.jsx";
import { PaycheckSheet, DailyCheckInSheet } from "./components/sheets.jsx";
import { AccountsTab } from "./components/AccountsTab.jsx";
import { TransactionsTab } from "./components/TransactionsTab.jsx";
import { BillsTab } from "./components/BillsTab.jsx";
import { GoalsTab } from "./components/GoalsTab.jsx";
import { DebtTab } from "./components/DebtTab.jsx";
import { HabitsTab } from "./components/HabitsTab.jsx";
import { SettingsTab } from "./components/SettingsTab.jsx";

export default function FinanceOS() {
  const [data, setData] = useState(() => defaultData());
  const [tab, setTab] = useState("dashboard");
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // "demo" | "empty" | null
  const [showPaycheckSheet, setShowPaycheckSheet] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [editingRent, setEditingRent] = useState(false);
  const paydayLongPress = useLongPress(() => setShowPaycheckSheet(true));
  const rentLongPress = useLongPress(() => setEditingRent(true));
  function loadDemoData() {
    setData(generateDemoData());
    setConfirmAction(null);
  }
  function clearData() {
    setData(defaultData());
    setConfirmAction(null);
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

  // Last 6 pay periods (oldest to newest), for the spending trend chart
  const spendTrend = (() => {
    const periods = [{ start: period.start, end: period.end }];
    let cursor = period.start;
    for (let i = 0; i < 5; i++) {
      const pEnd = addDays(cursor, -1);
      const pStart = addDays(cursor, -period.totalDays);
      periods.push({ start: pStart, end: pEnd });
      cursor = pStart;
    }
    return periods.reverse().map(p => {
      const inc = data.transactions.filter(t => t.type === "income" && t.date >= p.start && t.date <= p.end).reduce((s, t) => s + t.amount, 0);
      const exp = data.transactions.filter(t => t.type === "expense" && t.date >= p.start && t.date <= p.end).reduce((s, t) => s + t.amount, 0);
      return { label: formatShortDate(p.start), spend: Math.round(exp), income: Math.round(inc) };
    });
  })();

  // Consecutive pay periods (most recent first) spent at or under income
  const budgetStreak = (() => {
    const periods = [{ start: period.start, end: period.end }];
    let cursor = period.start;
    for (let i = 0; i < 11; i++) {
      const pEnd = addDays(cursor, -1);
      const pStart = addDays(cursor, -period.totalDays);
      periods.push({ start: pStart, end: pEnd });
      cursor = pStart;
    }
    let streak = 0;
    for (const p of periods) {
      const inc = data.transactions.filter(t => t.type === "income" && t.date >= p.start && t.date <= p.end).reduce((s, t) => s + t.amount, 0);
      if (inc <= 0) break;
      const exp = data.transactions.filter(t => t.type === "expense" && t.date >= p.start && t.date <= p.end).reduce((s, t) => s + t.amount, 0);
      if (exp > inc) break;
      streak++;
    }
    return streak;
  })();

  const longestAbstinence = data.abstinence.length
    ? data.abstinence.reduce((best, a) => {
        const elapsed = Date.now() - new Date(a.startedAt).getTime();
        return (!best || elapsed > best.elapsed) ? { ...a, elapsed } : best;
      }, null)
    : null;

  // Cross-domain patterns: does spend differ on drinking days, does identity differ on training days
  const drinkSpendInsight = (() => {
    const cutoff = addDays(todayStr(), -60);
    const relevant = data.habits.filter(h => h.date >= cutoff && h.date <= todayStr());
    const drinkDays = relevant.filter(h => h.alcoholDrinks > 0).map(h => h.date);
    const soberDays = relevant.filter(h => !(h.alcoholDrinks > 0)).map(h => h.date);
    if (drinkDays.length < 3 || soberDays.length < 3) return null;
    const avgSpend = dates => {
      const total = data.transactions.filter(t => t.type === "expense" && dates.includes(t.date)).reduce((s, t) => s + t.amount, 0);
      return total / dates.length;
    };
    const drinkAvg = avgSpend(drinkDays);
    const soberAvg = avgSpend(soberDays);
    if (Math.abs(drinkAvg - soberAvg) < 1) return null;
    return { drinkAvg, soberAvg, diff: drinkAvg - soberAvg };
  })();
  const trainingIdentityInsight = (() => {
    const cutoff = addDays(todayStr(), -30);
    const relevant = data.habits.filter(h => h.date >= cutoff && h.date <= todayStr() && h.identityScore !== undefined);
    const trainedScores = relevant.filter(h => h.trained).map(h => h.identityScore);
    const restScores = relevant.filter(h => !h.trained).map(h => h.identityScore);
    if (trainedScores.length < 3 || restScores.length < 3) return null;
    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const trainedAvg = avg(trainedScores);
    const restAvg = avg(restScores);
    if (Math.abs(trainedAvg - restAvg) < 0.3) return null;
    return { trainedAvg, restAvg, diff: trainedAvg - restAvg };
  })();

  const todayLog = data.habits.find(h => h.date === todayStr());
  const checkedInToday = !!(todayLog && (todayLog.identityScore !== undefined || todayLog.wakeTime || todayLog.weight));

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

  function computeSuggestedSplit(incomeAmount) {
    const fixedRent = Number(data.fixedRent) || 0;
    const remainingAfterRent = Math.max(0, incomeAmount - fixedRent);
    // "future expenses" — bills other than rent already due before the next paycheck
    const cycleEnd = addDays(todayStr(), data.cycleDays);
    const upcomingBills = data.bills
      .filter(b => !b.name.toLowerCase().includes("rent") && b.dueDate >= todayStr() && b.dueDate <= cycleEnd)
      .reduce((s, b) => s + b.amount, 0);
    const afterBills = Math.max(0, remainingAfterRent - upcomingBills);
    const essentials = Math.round(afterBills * 0.45);
    const discretionary = Math.round(afterBills * 0.25);
    const savings = Math.max(0, Math.round(afterBills - essentials - discretionary));
    return { income: incomeAmount, rent: fixedRent, upcomingBills, essentials, discretionary, savings };
  }
  function setFixedRent(val) {
    setData(d => ({ ...d, fixedRent: Number(val) || 0 }));
  }
  function setNextPaycheck(val) {
    setData(d => ({ ...d, nextPaycheck: val }));
  }
  function setCycleDays(val) {
    setData(d => ({ ...d, cycleDays: Math.max(1, Number(val) || 1) }));
  }
  function receivePaycheck(amount, shouldBudget) {
    const amt = Number(amount);
    if (!amt) return;
    const checkingAccount = data.accounts.find(a => a.type === "checking") || data.accounts[0];
    addIncome({ amount: amt, accountId: checkingAccount.id, note: "Paycheck" });
    setData(d => ({ ...d, nextPaycheck: addDays(todayStr(), d.cycleDays) }));
    if (shouldBudget) applySplit(computeSuggestedSplit(amt));
    setShowPaycheckSheet(false);
  }
  function applySplit(split) {
    const { income, rent, essentials, discretionary, savings } = split;
    const pct = n => Math.round((n / income) * 100);
    const map = { rent: pct(rent), essentials: pct(essentials), discretionary: pct(discretionary), savings: pct(savings) };
    setData(d => ({
      ...d,
      categories: d.categories.map(c => {
        const key = ["rent", "essentials", "discretionary", "savings"].find(k => c.name.toLowerCase().includes(k));
        return key ? { ...c, percent: map[key] } : c;
      }),
    }));
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
    const checkingAccount = data.accounts.find(a => a.type === "checking") || data.accounts[0];
    updateAccountBalance(checkingAccount.id, -bill.amount);
    addTransaction({ type: "expense", amount: bill.amount, accountId: checkingAccount.id, categoryId: bill.categoryId, note: "Bill: " + bill.name });
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
    setData(d => ({
      ...d,
      debts: d.debts.map(x => x.id === debt.id
        ? { ...x, paid: x.paid + Number(amount), payments: [...(x.payments || []), { date: todayStr(), amount: Number(amount) }] }
        : x)
    }));
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
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: saving ? GOLD : SLATE }}>
              {saving && <RefreshCw size={11} className="spinner" />}
              {saving ? "saving…" : "saved"}
            </span>
            <button onClick={() => setTab("settings")} aria-label="Settings" style={{
              background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex",
              color: tab === "settings" ? GOLD : "#8A97A3"
            }}>
              <SettingsIcon size={18} />
            </button>
          </div>
        </div>
        {tab !== "habits" ? (
          daysUntilPayday === 0 && (
            <div style={{ marginTop: 14 }}>
              <button onClick={() => setShowPaycheckSheet(true)} style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "rgba(201,161,61,0.14)", border: `1px solid ${GOLD}55`, borderRadius: 14, padding: "12px 14px", cursor: "pointer"
              }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: GOLD }}>Payday is today — tap to add your paycheck</span>
                <Plus size={16} color={GOLD} />
              </button>
            </div>
          )
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
            <button
              onClick={() => setShowCheckIn(true)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                background: checkedInToday ? CARD : VIOLET_BG,
                border: `1px solid ${checkedInToday ? INK_SOFT + "22" : VIOLET + "55"}`,
                borderRadius: 16, padding: "14px 16px", marginBottom: 20, cursor: "pointer", textAlign: "left"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", background: checkedInToday ? PAPER_DIM : VIOLET,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  <Activity size={16} color={checkedInToday ? VIOLET : "white"} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: checkedInToday ? TEXT : VIOLET }}>
                    {checkedInToday ? "Today's check-in logged" : "Daily check-in"}
                  </div>
                  <div style={{ fontSize: 11, color: SLATE, marginTop: 1 }}>
                    {checkedInToday ? "Tap to edit" : "Identity, sleep, weight — one screen"}
                  </div>
                </div>
              </div>
              <ChevronRight size={16} color={SLATE} />
            </button>

            <Section
              title="Spend this period"
              right={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {daysUntilPayday > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em" }}>Safe to spend</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: SAGE }}>
                        {fmt(Math.max(0, (incomeThisPeriod - spentThisPeriod) / daysUntilPayday))}
                        <span style={{ fontSize: 10, fontWeight: 400, color: SLATE }}>/day</span>
                      </div>
                    </div>
                  )}
                </div>
              }
            >
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

              <button
                onClick={() => { if (daysUntilPayday === 0) setShowPaycheckSheet(true); }}
                {...paydayLongPress}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 10, padding: "12px 14px", cursor: "pointer"
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: TEAL_BG, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Wallet size={16} color={TEAL} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: TEXT }}>
                    {daysUntilPayday === 0 ? "Payday is today" : `Payday in ${daysUntilPayday} day${daysUntilPayday === 1 ? "" : "s"}`}
                  </div>
                  {daysUntilPayday > 0 && <div style={{ fontSize: 10, color: SLATE, marginTop: 1 }}>Hold to log it early</div>}
                </div>
              </button>

              {(() => {
                const leftover = incomeThisPeriod - spentThisPeriod;
                const openGoal = data.goals.find(g => g.saved < g.target);
                if (leftover <= 0 || !openGoal) return null;
                const suggestion = Math.min(Math.round(leftover * 0.2), openGoal.target - openGoal.saved);
                if (suggestion <= 0) return null;
                return (
                  <div style={{ background: PAPER_DIM, borderRadius: 10, padding: "12px 14px", marginTop: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: SAGE }}>{fmt(leftover)} unspent so far this period</div>
                    <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>Consider moving {fmt(suggestion)} toward "{openGoal.name}"</div>
                  </div>
                );
              })()}
            </Section>

            {(budgetStreak > 0 || longestAbstinence || drinkSpendInsight || trainingIdentityInsight) && (
              <Section title="Momentum">
                {(budgetStreak > 0 || longestAbstinence) && (
                  <div style={{
                    display: "grid", gridTemplateColumns: budgetStreak > 0 && longestAbstinence ? "1fr 1fr" : "1fr", gap: 8,
                    marginBottom: (drinkSpendInsight || trainingIdentityInsight) ? 14 : 0
                  }}>
                    {budgetStreak > 0 && (
                      <StatTile icon={TrendingUp} color={SAGE} value={budgetStreak} label="Budget streak" caption={`pay period${budgetStreak === 1 ? "" : "s"} under budget`} />
                    )}
                    {longestAbstinence && (
                      <StatTile icon={RefreshCw} color={longestAbstinence.color} value={formatDuration(Math.floor(longestAbstinence.elapsed / 1000), true)} label={longestAbstinence.name} caption="current streak" />
                    )}
                  </div>
                )}
                {drinkSpendInsight && (
                  <div style={{ fontSize: 12.5, color: TEXT, lineHeight: 1.5, marginBottom: trainingIdentityInsight ? 8 : 0 }}>
                    You spend <b style={{ color: drinkSpendInsight.diff > 0 ? RUST : SAGE }}>{fmt(Math.abs(drinkSpendInsight.diff))} {drinkSpendInsight.diff > 0 ? "more" : "less"}</b> on days you log a drink, on average.
                  </div>
                )}
                {trainingIdentityInsight && (
                  <div style={{ fontSize: 12.5, color: TEXT, lineHeight: 1.5 }}>
                    Identity score averages <b style={{ color: VIOLET }}>{trainingIdentityInsight.trainedAvg.toFixed(1)}</b> on training days vs <b style={{ color: VIOLET }}>{trainingIdentityInsight.restAvg.toFixed(1)}</b> on rest days.
                  </div>
                )}
              </Section>
            )}

            {spendTrend.some(p => p.spend > 0) && (
              <Section title="Spending trend" eyebrow="last 6 pay periods">
                <div style={{ height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spendTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid stroke={PAPER_DIM} strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: SLATE }} />
                      <YAxis tick={{ fontSize: 9, fill: SLATE }} />
                      <Tooltip formatter={v => fmt(v)} />
                      <Bar dataKey="spend" radius={[4, 4, 0, 0]}>
                        {spendTrend.map((p, i) => (
                          <Cell key={i} fill={p.income > 0 && p.spend > p.income ? RUST : TEAL} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            )}

            <Section title="Accounts" eyebrow="quick view">
              {data.accounts.map(a => (
                <Row key={a.id} left={a.name} right={fmt(a.balance)} accent={a.type === "savings" ? GOLD : TEAL} />
              ))}
              <Row left="Net cash" right={fmt(totalBalance)} accent={SKY} />
            </Section>

            <Section
              title="Budget split"
              eyebrow={`Income this period: ${fmt(incomeThisPeriod)}`}
              right={<span style={{ fontSize: 11, color: catPercentTotal !== 100 ? RUST : SLATE }}>{catPercentTotal}% allocated</span>}
            >
              {editingRent ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: SLATE, flexShrink: 0 }}>Rent</span>
                  <input
                    type="number" inputMode="decimal" value={data.fixedRent} autoFocus
                    onChange={e => setFixedRent(e.target.value)}
                    onBlur={() => setEditingRent(false)}
                    onKeyDown={e => { if (e.key === "Enter") setEditingRent(false); }}
                    style={{ ...inputStyle, flex: 1, padding: "6px 10px", fontWeight: 700 }}
                  />
                  <IconBtn icon={Check} color={SAGE} onClick={() => setEditingRent(false)} label="Save" />
                </div>
              ) : (
                <button
                  {...rentLongPress}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                    background: "none", border: "none", padding: "4px 2px", marginBottom: 14, cursor: "pointer", textAlign: "left"
                  }}
                >
                  <span style={{ fontSize: 12, color: SLATE }}>Rent</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: SAGE }}>{fmt(data.fixedRent)}</span>
                </button>
              )}

              {incomeThisPeriod > 0 && (
                <button
                  onClick={() => applySplit(computeSuggestedSplit(incomeThisPeriod))}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
                    padding: "9px 0", marginBottom: 14, borderRadius: 8, border: `1px solid ${GOLD}55`,
                    background: "rgba(201,161,61,0.10)", color: GOLD, fontSize: 12, fontWeight: 700, cursor: "pointer"
                  }}
                >
                  <RefreshCw size={12} /> Rebuild budget from actual rent
                </button>
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
                <Row key={b.id} left={b.name} mid={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <CountdownPill days={daysBetween(todayStr(), b.dueDate)} totalDays={b.frequencyDays} />
                    {formatShortDate(b.dueDate)}
                  </span>
                } right={fmt(b.amount)} accent={urgencyColor(daysBetween(todayStr(), b.dueDate), b.frequencyDays)} />
              ))}
            </Section>

            <Section title="Goals">
              {data.goals.length === 0 && <Empty text="No goals yet — add one in the Goals tab." />}
              {data.goals.map(g => {
                const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
                return (
                  <div key={g.id} style={{
                    marginBottom: 8, padding: "9px 10px", borderRadius: 6,
                    borderLeft: `3px solid ${progressColor(pct)}`, background: PAPER_DIM
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{g.name}</span>
                      <span style={{ color: SAGE }}>{fmt(g.saved)} / {fmt(g.target)}</span>
                    </div>
                    <ProgressBar pct={pct} tone="gold" />
                  </div>
                );
              })}
            </Section>
          </>
        )}

        {tab === "habits" && (
          <HabitsTab data={data} upsertHabitLog={upsertHabitLog} toggleHabitBool={toggleHabitBool}
            incrementAlcohol={incrementAlcohol} editHabitLog={editHabitLog}
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

        {tab === "settings" && (
          <SettingsTab
            data={data}
            setFixedRent={setFixedRent}
            setGoalWeight={setGoalWeight}
            setNextPaycheck={setNextPaycheck}
            setCycleDays={setCycleDays}
            confirmAction={confirmAction}
            setConfirmAction={setConfirmAction}
            loadDemoData={loadDemoData}
            clearData={clearData}
            onBack={() => setTab("dashboard")}
          />
        )}
      </div>

      {showPaycheckSheet && (
        <PaycheckSheet onClose={() => setShowPaycheckSheet(false)} onConfirm={receivePaycheck} computeSplit={computeSuggestedSplit} />
      )}

      {showCheckIn && (
        <DailyCheckInSheet
          onClose={() => setShowCheckIn(false)}
          todayLog={todayLog}
          upsertHabitLog={upsertHabitLog}
          safeToSpendPerDay={daysUntilPayday > 0 ? Math.max(0, (incomeThisPeriod - spentThisPeriod) / daysUntilPayday) : 0}
          daysUntilPayday={daysUntilPayday}
        />
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
        <IconBtn icon={Check} color={SAGE} onClick={() => { onSave({ name, percent }); setEditing(false); }} label="Save" />
        <IconBtn icon={X} onClick={() => setEditing(false)} label="Cancel" />
      </div>
    );
  }
  const barColor = lerpColor(SAGE, RUST, Math.min(1, pct / 100));
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{category.name} <span style={{ color: SLATE, fontWeight: 400 }}>({category.percent}%)</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: pct > 100 ? RUST : SAGE }}>{fmt(spent)} / {fmt(budget)}</span>
          <IconBtn icon={Edit2} onClick={() => setEditing(true)} label="Edit" />
          <DeleteBtn onDelete={onDelete} />
        </div>
      </div>
      <div style={{ height: 8, background: PAPER_DIM, borderRadius: 4, overflow: "hidden", border: `1px solid ${INK_SOFT}18` }}>
        <div style={{ height: "100%", width: Math.min(100, pct) + "%", background: barColor, borderRadius: 4, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: 10.5, color: pct > 100 ? RUST : SAGE, marginTop: 4 }}>
        {pct > 100 ? `${fmt(spent - budget)} over budget` : `${fmt(Math.max(0, budget - spent))} left`}
      </div>
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
