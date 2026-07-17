// Tonight's Focus: a curated 5-10 minute pre-shift session, distinct from
// the full Learn backlog. It selects a small, prioritized mix of real
// dishes/beverages/terms/scenarios from data already in the app — it does
// not generate new flashcards, objections, recommendations, or pronunciation
// content of its own; Home.jsx launches the existing systems for each
// selected item.

import { latestDishVersion } from "./menuOps.js";
import { isDue } from "./srs.js";
import { generateObjectionScenarios } from "./objections.js";
import { suggestPairings } from "./pairing.js";
import { flavorProfile } from "./flavorProfile.js";

const BEVERAGE_CATEGORIES = ["wine", "cocktail", "amaro", "beer"];

const TARGET_COUNTS = { dish: 2, beverage: 1, term: 3, scenario: 1, pronunciation: 1 };

// Rough minutes-per-item-type, used by estimateFocusMinutes. A dish/scenario
// review takes longer to read than a quick term glance or a single
// pronunciation rep.
const MINUTES_BY_TYPE = {
  dish: 1.5,
  beverage: 1,
  term: 0.75,
  scenario: 1.5,
  pronunciation: 0.75,
};

// candidate: { isActive, isNew, isRecentlyChanged, isFeaturedBeverage,
//   hasChefNote, accuracyBelow60, isOverdueCard, notReviewedIn30Days }
// Returns a priority score, or -1 for an inactive item (exclude).
export function calculateFocusPriority(candidate) {
  if (candidate.isActive === false) return -1;
  let score = 0;
  if (candidate.isNew) score += 50;
  if (candidate.isRecentlyChanged) score += 40;
  if (candidate.isFeaturedBeverage) score += 40;
  if (candidate.hasChefNote) score += 35;
  if (candidate.accuracyBelow60) score += 30;
  if (candidate.isOverdueCard) score += 20;
  if (candidate.notReviewedIn30Days) score += 15;
  return score;
}

function activeDishes(data) {
  return Object.values(data.dishes)
    .filter((d) => d.status === "active")
    .map((d) => ({ dish: d, dv: latestDishVersion(data, d.id) }))
    .filter((x) => x.dv);
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return Infinity;
  return (Date.now() - then) / 86400000;
}

function cardsForDishVersion(data, dishVersionId) {
  return Object.values(data.cards).filter((c) => c.dishVersionId === dishVersionId);
}

function hasChefNoteFor(data, entityType, entityId) {
  return data.notes.some((n) => n.entityType === entityType && n.entityId === entityId && n.noteType === "chef note");
}

function changeForVersion(data, dishVersionId) {
  return data.changes.find((c) => c.newVersionId === dishVersionId) || null;
}

// Builds the pool of dish candidates: active dishes, scored by whether
// they're new/recently changed on the current menu, have a chef note, or
// have underperforming/overdue/stale training cards attached.
function buildDishCandidates(data) {
  const candidates = [];
  for (const { dish, dv } of activeDishes(data)) {
    const change = changeForVersion(data, dv.id);
    const cards = cardsForDishVersion(data, dv.id);
    const reviewedCards = cards.filter((c) => c.accuracyRate != null);
    const avgAccuracy = reviewedCards.length
      ? reviewedCards.reduce((s, c) => s + c.accuracyRate, 0) / reviewedCards.length
      : null;
    const oldestReview = cards.reduce((oldest, c) => {
      if (!c.lastReviewed) return oldest;
      return oldest === null || c.lastReviewed < oldest ? c.lastReviewed : oldest;
    }, null);

    const flags = {
      isActive: true,
      isNew: change?.changeType === "Added item",
      isRecentlyChanged: !!change && change.changeType !== "Added item" && change.changeType !== "Removed item",
      isFeaturedBeverage: false,
      hasChefNote: hasChefNoteFor(data, "dish", dish.id),
      accuracyBelow60: avgAccuracy != null && avgAccuracy < 60,
      isOverdueCard: cards.some(isDue),
      notReviewedIn30Days: cards.length > 0 && daysSince(oldestReview) >= 30,
    };

    const reasons = [];
    if (flags.isNew) reasons.push("New on the menu");
    if (flags.isRecentlyChanged) reasons.push("Recently changed");
    if (flags.hasChefNote) reasons.push("Chef note attached");
    if (flags.accuracyBelow60) reasons.push("Card accuracy below 60%");
    if (flags.isOverdueCard) reasons.push("Has an overdue card");
    if (flags.notReviewedIn30Days) reasons.push("Not reviewed in 30+ days");
    if (reasons.length === 0) reasons.push("Part of the current active menu");

    candidates.push({
      type: "dish",
      id: dish.id,
      dishId: dish.id,
      dishVersionId: dv.id,
      label: dv.displayName,
      priority: calculateFocusPriority(flags),
      reasons,
    });
  }
  return candidates;
}

function buildBeverageCandidates(data) {
  const candidates = [];
  for (const entry of Object.values(data.dictionary)) {
    if (!BEVERAGE_CATEGORIES.includes(entry.category)) continue;
    const flags = {
      isActive: true,
      isFeaturedBeverage: !!entry.featured,
      hasChefNote: hasChefNoteFor(data, "term", entry.term),
    };
    const reasons = [];
    if (flags.isFeaturedBeverage) reasons.push("Featured beverage tonight");
    if (flags.hasChefNote) reasons.push("Chef note attached");
    if (reasons.length === 0) continue; // only surface beverages with an actual reason to study them
    candidates.push({
      type: "beverage",
      id: entry.term,
      label: entry.term,
      priority: calculateFocusPriority(flags),
      reasons,
    });
  }
  return candidates;
}

// Culinary (non-beverage) terms, scored mainly by chef notes; ties are
// broken by preferring terms that actually appear on the current menu so
// the session stays grounded in tonight's real dishes.
function buildTermCandidates(data, relevantTermSet) {
  const candidates = [];
  for (const entry of Object.values(data.dictionary)) {
    if (BEVERAGE_CATEGORIES.includes(entry.category)) continue;
    const flags = {
      isActive: true,
      hasChefNote: hasChefNoteFor(data, "term", entry.term),
    };
    let priority = calculateFocusPriority(flags);
    const reasons = [];
    if (flags.hasChefNote) reasons.push("Chef note attached");
    if (relevantTermSet.has(entry.term)) {
      priority += 10; // grounds the pick in tonight's actual selected dishes
      reasons.push("Used in tonight's focus dishes");
    }
    if (reasons.length === 0) reasons.push("Glossary term");
    candidates.push({ type: "term", id: entry.term, label: entry.term, priority, reasons });
  }
  return candidates.sort((a, b) => b.priority - a.priority);
}

export function estimateFocusMinutes(items) {
  const total = (items || []).reduce((sum, item) => sum + (MINUTES_BY_TYPE[item.type] || 1), 0);
  return Math.max(5, Math.min(10, Math.round(total)));
}

// Assembles tonight's curated session: 2 dishes, 1 beverage/pairing, 3
// culinary terms, 1 objection-or-recommendation scenario, 1 pronunciation
// exercise — all references into real data, never invented content.
export function generateTonightsFocus(data) {
  const dishCandidates = buildDishCandidates(data).sort((a, b) => b.priority - a.priority);
  const selectedDishes = dishCandidates.slice(0, TARGET_COUNTS.dish);

  const selectedDishNames = new Set(selectedDishes.map((d) => d.label));
  const selectedDishComponentTerms = new Set();
  for (const sel of selectedDishes) {
    const dv = latestDishVersion(data, sel.dishId);
    for (const c of dv?.components || []) selectedDishComponentTerms.add(c.normalized);
  }

  // Beverage or pairing: prefer a featured/chef-noted beverage; otherwise
  // fall back to an existing pairing suggestion for the top selected dish.
  const beverageCandidates = buildBeverageCandidates(data).sort((a, b) => b.priority - a.priority);
  let beverageItem = null;
  if (beverageCandidates.length > 0) {
    const top = beverageCandidates[0];
    beverageItem = { type: "beverage", id: top.id, term: top.id, priority: top.priority, reasons: top.reasons, label: top.id };
  } else if (selectedDishes.length > 0) {
    const dv = latestDishVersion(data, selectedDishes[0].dishId);
    const flavors = flavorProfile(dv, data.dictionary).map((f) => f.name);
    const pairings = suggestPairings(dv, flavors, data.dictionary);
    const top = pairings[0];
    if (top) {
      beverageItem = {
        type: "pairing",
        id: `pairing_${dv.id}`,
        dishId: selectedDishes[0].dishId,
        dishVersionId: dv.id,
        pairing: top,
        priority: 0,
        reasons: [`Pairing suggestion for ${dv.displayName}`],
        label: top.name,
      };
    }
  }

  const termCandidates = buildTermCandidates(data, selectedDishComponentTerms);
  const selectedTerms = termCandidates.slice(0, TARGET_COUNTS.term);

  // Objection/recommendation scenario: reuse the existing generator
  // wholesale, preferring one tied to a dish already in tonight's session.
  const scenarios = generateObjectionScenarios(data);
  let scenarioItem = null;
  if (scenarios.length > 0) {
    const tied = scenarios.find((s) => s.dishName && selectedDishNames.has(s.dishName));
    const chosen = tied || scenarios[0];
    scenarioItem = {
      type: "scenario",
      id: chosen.id,
      scenario: chosen,
      priority: tied ? 10 : 0,
      reasons: [tied ? "Tied to tonight's focus dishes" : "Common guest scenario"],
      label: chosen.category,
    };
  }

  // Pronunciation: prefer a term already selected above for cohesion.
  const pronounceable = Object.values(data.dictionary).filter((e) => e.pronunciation);
  let pronunciationItem = null;
  if (pronounceable.length > 0) {
    const fromSelected = selectedTerms.map((t) => data.dictionary[t.id]).find((e) => e?.pronunciation);
    const chosen = fromSelected || pronounceable[0];
    pronunciationItem = {
      type: "pronunciation",
      id: chosen.term,
      term: chosen.term,
      priority: fromSelected ? 10 : 0,
      reasons: [fromSelected ? "Term from tonight's session" : "Pronunciation practice"],
      label: chosen.term,
    };
  }

  const items = [
    ...selectedDishes,
    ...(beverageItem ? [beverageItem] : []),
    ...selectedTerms,
    ...(scenarioItem ? [scenarioItem] : []),
    ...(pronunciationItem ? [pronunciationItem] : []),
  ];

  return {
    items,
    estimatedMinutes: estimateFocusMinutes(items),
    counts: {
      dish: selectedDishes.length,
      beverage: beverageItem ? 1 : 0,
      term: selectedTerms.length,
      scenario: scenarioItem ? 1 : 0,
      pronunciation: pronunciationItem ? 1 : 0,
    },
  };
}
