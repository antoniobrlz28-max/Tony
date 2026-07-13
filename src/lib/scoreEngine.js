import { addDays, todayStr } from "./helpers.js";

// Life Score: a structured self-management score computed from the last 7 days
// across five domains — Health, Mind, Energy, Finances, Purpose. Every component
// keeps its reason so the UI can always answer "why this number". Missing data
// lowers confidence (weights renormalize over available signals) and domains
// without data render as "learning" — never as failure.

function clamp(n, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)); }
// Map value linearly so that `bad` → 0 and `good` → 100 (works in either direction)
function lerpScore(value, bad, good) {
  if (bad === good) return 100;
  return clamp(((value - bad) / (good - bad)) * 100);
}

const CASH_NOTE = /atm|cash w|zelle out/i;

function scoreWindow(data, asOf) {
  const start = addDays(asOf, -6);
  const inWin = d => d >= start && d <= asOf;
  const tx = data.transactions.filter(t => inWin(t.date));
  const logs = data.habits.filter(h => inWin(h.date));

  const ready = logs.length >= 3 || tx.length >= 5;
  if (!ready) return { ready: false, daysLogged: logs.length };

  const components = [];
  const add = (domain, weight, label, hasData, score, reason) =>
    components.push({ domain, weight, label, hasData, score: Math.round(score), reason });

  // ---- Wealth ----
  const income28 = data.transactions
    .filter(t => t.type === "income" && t.date >= addDays(asOf, -27) && t.date <= asOf)
    .reduce((s, t) => s + t.amount, 0);
  const weeklyIncome = income28 / 4;
  const spend7 = tx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  if (weeklyIncome > 0) {
    const ratio = spend7 / weeklyIncome;
    add("finances", 0.6, "Spending pace", true, lerpScore(ratio, 1.4, 0.7),
      `Spent $${Math.round(spend7)} of ~$${Math.round(weeklyIncome)} weekly income`);
  } else {
    add("finances", 0.6, "Spending pace", false, 0, "No income logged in the last 4 weeks");
  }

  const cashCount = tx.filter(t => t.type !== "income" && CASH_NOTE.test(t.note || "")).length;
  add("finances", 0.25, "Cash & Zelle restraint", tx.length > 0, lerpScore(cashCount, 8, 0),
    cashCount === 0 ? "No cash or Zelle outflows this week" : `${cashCount} cash/Zelle outflow${cashCount === 1 ? "" : "s"} this week`);

  const savingsIds = data.accounts.filter(a => a.type === "savings").map(a => a.id);
  const savedThisWeek = tx.some(t =>
    (t.type === "transfer" && (savingsIds.includes(t.toAccountId) || /to goal:/i.test(t.note || ""))));
  add("finances", 0.15, "Saving action", tx.length > 0, savedThisWeek ? 100 : 30,
    savedThisWeek ? "Moved money toward savings or a goal" : "Nothing set aside this week");

  // ---- Body ----
  const trained = logs.filter(h => h.trained).length;
  add("health", 0.35, "Training", logs.length > 0, clamp((trained / 3) * 100),
    `Trained ${trained} of the last 7 days`);

  const drinks = logs.reduce((s, h) => s + (Number(h.alcoholDrinks) || 0), 0);
  add("health", 0.35, "Alcohol", logs.length > 0, lerpScore(drinks, 10, 0),
    drinks === 0 ? "No drinks logged this week" : `${drinks} drink${drinks === 1 ? "" : "s"} logged this week`);

  const fasts = logs.filter(h => (h.fastingHours || 0) > 0).length;
  add("health", 0.15, "Fasting", logs.length > 0, clamp((fasts / 2) * 100),
    `${fasts} fast${fasts === 1 ? "" : "s"} this week`);

  const weightsNow = logs.filter(h => h.weight).sort((a, b) => a.date.localeCompare(b.date));
  const prevLogs = data.habits.filter(h => h.date >= addDays(asOf, -13) && h.date < start && h.weight)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (weightsNow.length && prevLogs.length) {
    const now = Number(weightsNow[weightsNow.length - 1].weight);
    const prev = Number(prevLogs[prevLogs.length - 1].weight);
    const goal = Number(data.goalWeight) || now;
    const towardGoal = Math.abs(now - goal) < Math.abs(prev - goal);
    const delta = Math.round((now - prev) * 10) / 10;
    add("health", 0.15, "Weight trend", true, towardGoal ? 100 : (now === prev ? 60 : 30),
      `${delta > 0 ? "+" : ""}${delta} kg vs last week${towardGoal ? ", toward goal" : ""}`);
  } else {
    add("health", 0.15, "Weight trend", false, 0, "Not enough weigh-ins to compare weeks");
  }

  // ---- Mind ----
  const identityScores = logs.filter(h => h.identityScore !== undefined).map(h => Number(h.identityScore));
  if (identityScores.length >= 2) {
    const avgIdentity = identityScores.reduce((a, b) => a + b, 0) / identityScores.length;
    add("mind", 0.6, "Identity score", true, clamp(avgIdentity * 10),
      `Averaging ${avgIdentity.toFixed(1)}/10 across ${identityScores.length} days`);
  } else {
    add("mind", 0.6, "Identity score", false, 0, "Fewer than 2 identity check-ins this week");
  }

  add("mind", 0.4, "Check-in consistency", true, clamp((logs.length / 7) * 100),
    `${logs.length} of 7 days logged`);

  // ---- Energy (sleep duration + regularity) ----
  const sleepMinutes = log => {
    if (!log.sleepTime || !log.wakeTime) return null;
    const [sh, sm] = log.sleepTime.split(":").map(Number);
    const [wh, wm] = log.wakeTime.split(":").map(Number);
    let diff = (wh * 60 + wm) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60;
    return diff;
  };
  const sleepLogs = logs.map(sleepMinutes).filter(v => v !== null);
  if (sleepLogs.length >= 3) {
    const avgH = sleepLogs.reduce((a, b) => a + b, 0) / sleepLogs.length / 60;
    add("energy", 0.6, "Sleep duration", true, lerpScore(Math.abs(avgH - 7.5), 2.5, 0),
      `Averaging ${avgH.toFixed(1)}h of sleep across ${sleepLogs.length} nights`);
    // Bedtime regularity: minutes of spread in bedtimes (late-night times wrap past midnight)
    const bedMins = logs.filter(h => h.sleepTime).map(h => {
      const [bh, bm] = h.sleepTime.split(":").map(Number);
      return (bh < 12 ? bh + 24 : bh) * 60 + bm;
    });
    const meanBed = bedMins.reduce((a, b) => a + b, 0) / bedMins.length;
    const spread = Math.sqrt(bedMins.reduce((s, v) => s + (v - meanBed) ** 2, 0) / bedMins.length);
    add("energy", 0.4, "Sleep regularity", true, lerpScore(spread, 120, 20),
      `Bedtime varies by ~${Math.round(spread)} minutes`);
  } else {
    add("energy", 0.6, "Sleep duration", false, 0, "Fewer than 3 nights with sleep times logged");
    add("energy", 0.4, "Sleep regularity", false, 0, "Not enough sleep logs yet");
  }

  // ---- Purpose (review ritual, goal action, commitments) ----
  const lastReview = (data.weeklyReviews || []).map(w => w.date).sort().pop();
  const reviewFresh = lastReview && lastReview >= addDays(asOf, -9);
  add("purpose", 0.45, "Weekly review", (data.weeklyReviews || []).length > 0 || reviewFresh, reviewFresh ? 100 : 30,
    reviewFresh ? "Weekly review done" : "No weekly review in the last 9 days");

  const goalAction = data.transactions.some(t => /to goal:/i.test(t.note || "") && t.date >= addDays(asOf, -13) && t.date <= asOf);
  add("purpose", 0.3, "Goal progress", (data.goals || []).length > 0, goalAction ? 100 : 35,
    goalAction ? "Contributed to a goal in the last 2 weeks" : "No goal contributions in 2 weeks");

  const streaks = (data.abstinence || []).map(a => (Date.now() - new Date(a.startedAt).getTime()) / 86400000);
  const bestStreak = streaks.length ? Math.max(...streaks) : null;
  add("purpose", 0.25, "Commitments", bestStreak !== null, bestStreak >= 3 ? 100 : bestStreak >= 1 ? 60 : 35,
    bestStreak !== null ? `Longest active abstinence streak: ${Math.floor(bestStreak)} day${Math.floor(bestStreak) === 1 ? "" : "s"}` : "No abstinence trackers yet");

  // ---- Aggregate (renormalize over available signals) ----
  const DOMAIN_WEIGHTS = { health: 0.27, finances: 0.27, mind: 0.2, energy: 0.14, purpose: 0.12 };
  const DOMAIN_LABELS = { health: "Health", finances: "Finances", mind: "Mind", energy: "Energy", purpose: "Purpose" };
  const domains = Object.keys(DOMAIN_WEIGHTS).map(key => {
    const comps = components.filter(c => c.domain === key && c.hasData);
    const wSum = comps.reduce((s, c) => s + c.weight, 0);
    const score = wSum > 0 ? comps.reduce((s, c) => s + c.score * c.weight, 0) / wSum : null;
    return { key, label: DOMAIN_LABELS[key], score: score === null ? null : Math.round(score) };
  });
  const availDomains = domains.filter(d => d.score !== null);
  const dwSum = availDomains.reduce((s, d) => s + DOMAIN_WEIGHTS[d.key], 0);
  if (dwSum === 0) return { ready: false, daysLogged: logs.length };
  const score = Math.round(availDomains.reduce((s, d) => s + d.score * DOMAIN_WEIGHTS[d.key], 0) / dwSum);

  // Contributions: signed points vs a neutral-70 baseline, for the "why" list
  const contributions = components
    .filter(c => c.hasData)
    .map(c => ({
      label: c.label,
      reason: c.reason,
      impact: Math.round((c.score - 70) * c.weight * DOMAIN_WEIGHTS[c.domain]),
    }))
    .filter(c => c.impact !== 0)
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return {
    ready: true, score, domains,
    contributions,
    signals: components.filter(c => c.hasData).length,
    totalSignals: components.length,
  };
}

export function computeLifeScore(data, asOf = todayStr()) {
  const current = scoreWindow(data, asOf);
  if (!current.ready) return current;
  const previous = scoreWindow(data, addDays(asOf, -7));
  return { ...current, delta: previous.ready ? current.score - previous.score : null };
}
