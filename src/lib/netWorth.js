// Net worth = what you own (account balances) minus what you owe (debt still
// outstanding). We can even reconstruct the trend without storing history:
// walk backward from today's totals, undoing each transaction and debt payment,
// to recover the balance at the end of each past month. Real data, no snapshots.
import { todayStr, shiftMonth } from "./helpers.js";
import { currentMonth, monthShort, daysInMonth } from "./budgetEngine.js";

// A transaction's effect on total assets (sum across all accounts):
//  income → +amount, expense → -amount, transfer between two accounts nets 0,
//  transfer with no destination (goal contribution) leaves the accounts → -amount.
const assetDelta = t =>
  t.type === "income" ? t.amount
    : t.type === "expense" ? -t.amount
      : (t.toAccountId ? 0 : -t.amount);

export function netWorthNow(data) {
  const assets = data.accounts.reduce((s, a) => s + a.balance, 0);
  const liabilities = data.debts.reduce((s, x) => s + Math.max(0, x.total - x.paid), 0);
  return { assets, liabilities, net: assets - liabilities };
}

function lastDayOf(ym) {
  return `${ym}-${String(daysInMonth(ym)).padStart(2, "0")}`;
}

// Monthly points (oldest → newest) for the last `months` months.
export function netWorthSeries(data, months = 6) {
  const assetsNow = data.accounts.reduce((s, a) => s + a.balance, 0);
  const liabilitiesNow = data.debts.reduce((s, x) => s + Math.max(0, x.total - x.paid), 0);
  const now = currentMonth();
  const points = [];
  for (let i = months - 1; i >= 0; i--) {
    const ym = shiftMonth(now, -i);
    const asOf = i === 0 ? todayStr() : lastDayOf(ym);
    const futureAssets = data.transactions.filter(t => t.date > asOf).reduce((s, t) => s + assetDelta(t), 0);
    const futurePayments = data.debts.reduce(
      (s, x) => s + (x.payments || []).filter(p => p.date > asOf).reduce((a, p) => a + p.amount, 0), 0);
    const assets = assetsNow - futureAssets;
    const liabilities = liabilitiesNow + futurePayments;
    points.push({ label: monthShort(ym), assets: Math.round(assets), liabilities: Math.round(liabilities), net: Math.round(assets - liabilities) });
  }
  return points;
}
