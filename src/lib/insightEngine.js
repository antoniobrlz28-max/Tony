import { addDays, todayStr } from "./helpers.js";

// Deterministic cross-domain insights over the last 60 days. Each rule compares
// two groups of days and only speaks when both groups have enough observations
// and the difference is meaningful. Confidence comes from sample size, and the
// language stays associative ("tend to") — never causal.

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function sleepHours(log) {
  if (!log?.sleepTime || !log?.wakeTime) return null;
  const [sh, sm] = log.sleepTime.split(":").map(Number);
  const [wh, wm] = log.wakeTime.split(":").map(Number);
  let diff = (wh * 60 + wm) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
}

function confidenceFor(nA, nB) {
  const m = Math.min(nA, nB);
  if (m >= 20) return "strong pattern";
  if (m >= 10) return "moderate";
  if (m >= 5) return "early signal";
  return null;
}

export function computeInsights(data, asOf = todayStr()) {
  const cutoff = addDays(asOf, -60);
  const logs = data.habits.filter(h => h.date >= cutoff && h.date <= asOf);
  const spendByDate = {};
  for (const t of data.transactions) {
    if (t.type === "expense" && t.date >= cutoff && t.date <= asOf) {
      spendByDate[t.date] = (spendByDate[t.date] || 0) + t.amount;
    }
  }
  const spendOn = date => spendByDate[date] || 0;
  const out = [];

  // 1. Drinking days vs sober days -> daily spend
  {
    const drinkDays = logs.filter(h => (h.alcoholDrinks || 0) > 0).map(h => h.date);
    const soberDays = logs.filter(h => !(h.alcoholDrinks > 0)).map(h => h.date);
    const conf = confidenceFor(drinkDays.length, soberDays.length);
    if (conf) {
      const a = avg(drinkDays.map(spendOn)), b = avg(soberDays.map(spendOn));
      const diff = a - b;
      if (Math.abs(diff) >= 10) {
        out.push({
          id: "drinks-spending",
          headline: `You tend to spend $${Math.round(Math.abs(diff))} ${diff > 0 ? "more" : "less"} on days you drink`,
          comparison: `$${Math.round(a)} vs $${Math.round(b)} daily average`,
          sample: `${drinkDays.length} drinking · ${soberDays.length} sober days`,
          confidence: conf,
          direction: diff > 0 ? "negative" : "positive",
        });
      }
    }
  }

  // 2. Training days vs rest days -> identity score
  {
    const withId = logs.filter(h => h.identityScore !== undefined);
    const trainDays = withId.filter(h => h.trained);
    const restDays = withId.filter(h => !h.trained);
    const conf = confidenceFor(trainDays.length, restDays.length);
    if (conf) {
      const a = avg(trainDays.map(h => Number(h.identityScore)));
      const b = avg(restDays.map(h => Number(h.identityScore)));
      const diff = a - b;
      if (Math.abs(diff) >= 0.5) {
        out.push({
          id: "training-identity",
          headline: `Identity runs ${Math.abs(diff).toFixed(1)} points ${diff > 0 ? "higher" : "lower"} on training days`,
          comparison: `${a.toFixed(1)} vs ${b.toFixed(1)} average score`,
          sample: `${trainDays.length} training · ${restDays.length} rest days`,
          confidence: conf,
          direction: diff > 0 ? "positive" : "neutral",
        });
      }
    }
  }

  // 3. 7+ hours of sleep vs less -> identity score
  {
    const withBoth = logs.filter(h => sleepHours(h) !== null && h.identityScore !== undefined);
    const rested = withBoth.filter(h => sleepHours(h) >= 7);
    const short = withBoth.filter(h => sleepHours(h) < 7);
    const conf = confidenceFor(rested.length, short.length);
    if (conf) {
      const a = avg(rested.map(h => Number(h.identityScore)));
      const b = avg(short.map(h => Number(h.identityScore)));
      const diff = a - b;
      if (Math.abs(diff) >= 0.5) {
        out.push({
          id: "sleep-identity",
          headline: `Identity runs ${Math.abs(diff).toFixed(1)} points ${diff > 0 ? "higher" : "lower"} after 7+ hours of sleep`,
          comparison: `${a.toFixed(1)} vs ${b.toFixed(1)} average score`,
          sample: `${rested.length} rested · ${short.length} short-sleep days`,
          confidence: conf,
          direction: diff > 0 ? "positive" : "neutral",
        });
      }
    }
  }

  // 4. Short sleep -> next-day drinks
  {
    const byDate = Object.fromEntries(logs.map(h => [h.date, h]));
    const pairs = logs
      .filter(h => sleepHours(h) !== null)
      .map(h => ({ hours: sleepHours(h), next: byDate[addDays(h.date, 1)] }))
      .filter(p => p.next && p.next.alcoholDrinks !== undefined);
    const shortNights = pairs.filter(p => p.hours < 6.5);
    const fullNights = pairs.filter(p => p.hours >= 6.5);
    const conf = confidenceFor(shortNights.length, fullNights.length);
    if (conf) {
      const a = avg(shortNights.map(p => Number(p.next.alcoholDrinks) || 0));
      const b = avg(fullNights.map(p => Number(p.next.alcoholDrinks) || 0));
      const diff = a - b;
      if (Math.abs(diff) >= 0.4) {
        out.push({
          id: "sleep-drinks",
          headline: `Short sleep tends to mean ${diff > 0 ? "more" : "fewer"} drinks the next day`,
          comparison: `${a.toFixed(1)} vs ${b.toFixed(1)} drinks after <6.5h vs more sleep`,
          sample: `${shortNights.length} short · ${fullNights.length} full nights`,
          confidence: conf,
          direction: diff > 0 ? "negative" : "positive",
        });
      }
    }
  }

  // 5. Fasting days vs non-fasting days -> daily spend
  {
    const fastDays = logs.filter(h => (h.fastingHours || 0) > 0).map(h => h.date);
    const otherDays = logs.filter(h => !(h.fastingHours > 0)).map(h => h.date);
    const conf = confidenceFor(fastDays.length, otherDays.length);
    if (conf) {
      const a = avg(fastDays.map(spendOn)), b = avg(otherDays.map(spendOn));
      const diff = a - b;
      if (Math.abs(diff) >= 8) {
        out.push({
          id: "fasting-spending",
          headline: `Fasting days tend to cost $${Math.round(Math.abs(diff))} ${diff > 0 ? "more" : "less"}`,
          comparison: `$${Math.round(a)} vs $${Math.round(b)} daily average`,
          sample: `${fastDays.length} fasting · ${otherDays.length} regular days`,
          confidence: conf,
          direction: diff < 0 ? "positive" : "neutral",
        });
      }
    }
  }

  return out.slice(0, 4);
}
