import { todayStr } from "./id.js";

export function getShiftLog(data, date = todayStr()) {
  return data.shiftLog?.[date] || { covers: null, specialEvent: "" };
}

export function setShiftLog(draft, date, patch) {
  draft.shiftLog = draft.shiftLog || {};
  draft.shiftLog[date] = { ...getShiftLog(draft, date), ...patch };
}

// 86'ing a dish is temporary (tonight only) by default. A dish only
// becomes permanently 86'd once master reviews it with the chef and
// explicitly marks it so — that's a separate, deliberate action, not the
// default outcome of tapping the toggle.
export function get86List(data, date = todayStr()) {
  const temp = data.eightySixed?.[date] || [];
  const permanent = data.eightySixedPermanent || [];
  return Array.from(new Set([...temp, ...permanent]));
}

export function isPermanently86d(data, dishId) {
  return (data.eightySixedPermanent || []).includes(dishId);
}

export function toggle86(draft, dishId, date = todayStr()) {
  draft.eightySixed = draft.eightySixed || {};
  const list = draft.eightySixed[date] || [];
  draft.eightySixed[date] = list.includes(dishId) ? list.filter((id) => id !== dishId) : [...list, dishId];
  // bringing a dish back off the temporary list also clears any permanent
  // flag, so re-adding it later starts fresh as temporary again
  if (list.includes(dishId)) {
    draft.eightySixedPermanent = (draft.eightySixedPermanent || []).filter((id) => id !== dishId);
  }
}

export function setPermanent86(draft, dishId, permanent) {
  draft.eightySixedPermanent = draft.eightySixedPermanent || [];
  draft.eightySixedPermanent = permanent
    ? Array.from(new Set([...draft.eightySixedPermanent, dishId]))
    : draft.eightySixedPermanent.filter((id) => id !== dishId);
}

export function toggleFeaturedWine(draft, term) {
  const entry = draft.dictionary[term];
  if (!entry) return;
  entry.featured = !entry.featured;
}

export function featuredBeverages(data) {
  return Object.values(data.dictionary).filter(
    (e) => e.featured && ["wine", "cocktail", "amaro", "beer"].includes(e.category)
  );
}

// Changes since the given ISO timestamp (or all-time if none), newest menu
// first. Used both by the stat row and the "since my last shift" list.
export function changesSince(data, sinceIso) {
  if (!sinceIso) return [];
  return data.changes.filter((c) => {
    const menu = data.menus.find((m) => m.id === c.menuId);
    return menu && menu.uploadDate > sinceIso;
  });
}

export function chefNotesSince(data, sinceIso) {
  if (!sinceIso) return [];
  return data.notes.filter((n) => n.noteType === "chef note" && n.createdAt > sinceIso);
}

export function estimateReviewMinutes(changeCount, dueCardCount) {
  return Math.max(1, Math.round(changeCount * 0.5 + dueCardCount * 0.6));
}
