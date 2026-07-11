import { SAGE, RUST } from "./constants.js";

export function uid() { return Math.random().toString(36).slice(2, 10); }
export function fmt(n) {
  const v = Number(n) || 0;
  return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function todayStr() { return new Date().toISOString().slice(0, 10); }
export function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a, b) {
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}
export function formatShortDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
export function lerpColor(hexA, hexB, t) {
  const a = hexA.match(/\w\w/g).map(h => parseInt(h, 16));
  const b = hexB.match(/\w\w/g).map(h => parseInt(h, 16));
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
export function urgencyColor(daysLeft, totalDays) {
  const t = totalDays > 0 ? Math.min(1, Math.max(0, 1 - daysLeft / totalDays)) : 1;
  return lerpColor(SAGE, RUST, t);
}
export function progressColor(pct) {
  const t = Math.min(1, Math.max(0, pct / 100));
  return lerpColor(RUST, SAGE, t);
}
export function payoffProjection(debt) {
  const payments = (debt.payments || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  if (payments.length < 2) return null;
  const cutoff = addDays(todayStr(), -180);
  const recent = payments.filter(p => p.date >= cutoff);
  if (recent.length < 2) return null;
  const totalRecent = recent.reduce((s, p) => s + p.amount, 0);
  const monthsSpan = Math.max(1, daysBetween(recent[0].date, todayStr()) / 30);
  const monthlyPace = totalRecent / monthsSpan;
  const remaining = Math.max(0, debt.total - debt.paid);
  if (monthlyPace <= 0 || remaining <= 0) return null;
  const monthsLeft = remaining / monthlyPace;
  return { monthsLeft: Math.ceil(monthsLeft), payoffDate: addDays(todayStr(), Math.round(monthsLeft * 30)) };
}

export function daysInMonthCount(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
export function monthDates(ym) {
  const n = daysInMonthCount(ym);
  return Array.from({ length: n }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`);
}
export function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getPeriod(nextPaycheck, cycleDays) {
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

export function formatDuration(seconds, short = false) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (short) {
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  }
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
