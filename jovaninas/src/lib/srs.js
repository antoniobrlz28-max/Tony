// Lightweight SM-2-style spaced repetition.

import { todayStr } from "./id.js";

export function newCardState() {
  return {
    interval: 0,
    ease: 2.3,
    reps: 0,
    lastReviewed: null,
    nextReview: todayStr(),
    history: [], // { date, grade }
    accuracyRate: null,
  };
}

// grade: "again" | "hard" | "good" | "easy"
export function reviewCard(card, grade) {
  const state = { ...card };
  const today = todayStr();
  let interval = state.interval || 0;
  let ease = state.ease || 2.3;

  if (grade === "again") {
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    if (interval === 0) interval = 1;
    else if (interval === 1) interval = grade === "easy" ? 4 : 2;
    else interval = Math.round(interval * (grade === "easy" ? ease + 0.3 : grade === "hard" ? Math.max(1.2, ease - 0.4) : ease));
    if (grade === "easy") ease += 0.1;
    if (grade === "hard") ease = Math.max(1.3, ease - 0.15);
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + Math.max(1, interval));

  const history = [...(state.history || []), { date: today, grade }].slice(-20);
  const correct = history.filter((h) => h.grade !== "again").length;

  return {
    ...state,
    interval,
    ease,
    reps: (state.reps || 0) + 1,
    lastReviewed: today,
    nextReview: interval === 0 ? today : nextDate.toISOString().slice(0, 10),
    history,
    accuracyRate: history.length ? Math.round((correct / history.length) * 100) : null,
  };
}

export function isDue(card) {
  return !card.nextReview || card.nextReview <= todayStr();
}
