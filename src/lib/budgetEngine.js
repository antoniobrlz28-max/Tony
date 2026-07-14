// Budget math, in one place. The model is deliberately simple: every category
// has ONE number — a monthly dollar budget — and we compare it against what was
// actually spent in a calendar month. No pro-rating, no percent-of-after-rent,
// no special-cased rent. "Spent $X of $Y · $Z left · $N/day for the rest of the
// month." Rocket-Money-clear, and trivial to reason about or extend.
import { todayStr, shiftMonth } from "./helpers.js";

export function currentMonth() {
  return todayStr().slice(0, 7); // "YYYY-MM"
}

export function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
export function monthShort(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
}
export function daysInMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function categoryMonthSpend(transactions, catId, ym) {
  return transactions
    .filter(t => t.type === "expense" && t.categoryId === catId && t.date.startsWith(ym))
    .reduce((s, t) => s + t.amount, 0);
}

export function monthIncome(transactions, ym) {
  return transactions
    .filter(t => t.type === "income" && t.date.startsWith(ym))
    .reduce((s, t) => s + t.amount, 0);
}

// Everything the budget UI needs for a given month, computed once.
export function computeBudget(data, ym) {
  const rows = data.categories.map(c => {
    const budget = Number(c.budget) || 0;
    const spent = categoryMonthSpend(data.transactions, c.id, ym);
    return { id: c.id, name: c.name, budget, spent, remaining: budget - spent, pct: budget > 0 ? (spent / budget) * 100 : 0 };
  });
  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const leftToSpend = totalBudget - totalSpent;
  const isCurrent = ym === currentMonth();
  const total = daysInMonth(ym);
  const dayOfMonth = isCurrent ? Number(todayStr().slice(8, 10)) : total;
  const daysLeft = isCurrent ? Math.max(1, total - dayOfMonth) : 0;
  const perDay = daysLeft > 0 ? Math.max(0, leftToSpend) / daysLeft : 0;
  return {
    ym, rows, totalBudget, totalSpent, leftToSpend,
    daysInMonth: total, dayOfMonth, daysLeft, perDay, isCurrent,
    income: monthIncome(data.transactions, ym),
  };
}

// Suggest a monthly budget per category from actual trailing spend — the
// "build my budget from how I really spend" move. Averages the months that
// actually have spend so a single big/empty month doesn't skew it, and rounds
// to a friendly number.
export function suggestBudgets(data, monthsBack = 3) {
  const now = currentMonth();
  const months = Array.from({ length: monthsBack }, (_, i) => shiftMonth(now, -(i + 1)));
  // Only propose budgets for categories we actually have spend for — leave the
  // rest untouched rather than zeroing them out.
  return data.categories.map(c => {
    const spends = months.map(ym => categoryMonthSpend(data.transactions, c.id, ym)).filter(s => s > 0);
    const avg = spends.length ? spends.reduce((a, b) => a + b, 0) / spends.length : 0;
    return { id: c.id, budget: Math.round(avg / 10) * 10 };
  }).filter(x => x.budget > 0);
}
