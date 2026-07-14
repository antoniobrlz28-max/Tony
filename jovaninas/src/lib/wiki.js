import { latestDishVersion } from "./menuOps.js";

// Every dish (active or not) whose latest version contains this term
// ("current"), plus dishes where some earlier version contained it but the
// latest one doesn't, or the dish itself was removed ("past").
export function dishesContainingTerm(data, term) {
  const normalized = term.toLowerCase();
  const matches = (components) => (components || []).some((c) => c.normalized === normalized || c.normalized.includes(normalized));

  const current = [];
  const pastMap = {};

  for (const dish of Object.values(data.dishes)) {
    const latest = latestDishVersion(data, dish.id);
    const latestHas = latest && matches(latest.components);
    if (dish.status === "active" && latestHas) {
      current.push(latest);
      continue; // term is still on the current menu for this dish — not "past"
    }

    // dish is removed, or the term dropped out of the latest version — find
    // the most recent historical version that still had it.
    for (const vid of dish.versions) {
      const dv = data.dishVersions[vid];
      if (!dv || !matches(dv.components)) continue;
      if (!pastMap[dish.id] || dv.effectiveDate > pastMap[dish.id].effectiveDate) pastMap[dish.id] = dv;
    }
  }

  return { current, past: Object.values(pastMap) };
}

export function notesForTerm(data, term) {
  return data.notes.filter((n) => n.entityType === "term" && n.entityId === term);
}
