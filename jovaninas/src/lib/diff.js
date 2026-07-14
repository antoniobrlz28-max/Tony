import { extractDishComponents, allergensForComponents, detectTechniques } from "./components.js";

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

export function nameSimilarity(a, b) {
  const na = (a || "").toLowerCase().trim();
  const nb = (b || "").toLowerCase().trim();
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length);
}

export function componentOverlap(compsA, compsB) {
  const setA = new Set(compsA.map((c) => c.normalized));
  const setB = new Set(compsB.map((c) => c.normalized));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const x of setA) if (setB.has(x)) intersection++;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

const ALLERGEN_KEYS = ["gluten", "dairy", "tree nuts", "peanut", "shellfish", "fish", "egg", "soy", "sesame"];

// Build a lightweight "prior dish" index from an existing menu's items
// (already-saved dishVersions augmented with parsed components).
function indexPreviousItems(prevItems) {
  return prevItems.map((item) => ({
    ...item,
    components: item.components || extractDishComponents(item.name, item.description),
  }));
}

function classifyComponentDelta(oldComps, newComps) {
  const oldSet = new Set(oldComps.map((c) => c.normalized));
  const newSet = new Set(newComps.map((c) => c.normalized));
  const added = newComps.filter((c) => !oldSet.has(c.normalized));
  const removed = oldComps.filter((c) => !newSet.has(c.normalized));
  return { added, removed };
}

function explainDishChange(oldItem, newItem, added, removed, priceChanged) {
  const lines = [];
  for (const c of added) lines.push(`${capitalize(c.raw)} was added.`);
  for (const c of removed) lines.push(`${capitalize(c.raw)} was removed.`);
  if (priceChanged) {
    lines.push(
      `Price changed from $${oldItem.price?.toFixed ? oldItem.price.toFixed(2) : oldItem.price} to $${newItem.price?.toFixed ? newItem.price.toFixed(2) : newItem.price}.`
    );
  }
  if (oldItem.name !== newItem.name) {
    lines.push(`Name changed from "${oldItem.name}" to "${newItem.name}".`);
  }
  return lines;
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function scoreImportance(added, removed, priceChanged, oldItem, newItem) {
  const allergenTouched = [...added, ...removed].some((c) =>
    (c.allergens || []).some((a) => ALLERGEN_KEYS.includes(a))
  );
  const proteinTouched = [...added, ...removed].some((c) => c.role === "protein");
  const sauceTouched = [...added, ...removed].some((c) => c.role === "sauce");

  let culinaryImportance = "Low";
  if (proteinTouched || sauceTouched) culinaryImportance = "High";
  else if (added.length + removed.length > 0) culinaryImportance = "Medium";

  let serviceImportance = "Low";
  if (allergenTouched) serviceImportance = "High";
  else if (culinaryImportance !== "Low" || priceChanged) serviceImportance = "Medium";

  let trainingPriority = "Low";
  if (allergenTouched) trainingPriority = "Immediate";
  else if (culinaryImportance === "High") trainingPriority = "This week";
  else if (culinaryImportance === "Medium" || priceChanged) trainingPriority = "Before next shift";

  return { culinaryImportance, serviceImportance, trainingPriority, allergenTouched };
}

// Core comparison: given previous menu items (with dishId already assigned)
// and freshly parsed new items, produce matches + changes.
export function compareMenuVersions(prevItems, newItems, dictionary = {}) {
  const prev = indexPreviousItems(prevItems);
  const remainingPrev = [...prev];
  const results = { matches: [], added: [], removed: [], uncertain: [] };

  const newWithComponents = newItems.map((item) => ({
    ...item,
    components: extractDishComponents(item.name, item.description, dictionary),
  }));

  for (const newItem of newWithComponents) {
    // 1. Exact match: same section + same normalized name
    let matchIdx = remainingPrev.findIndex(
      (p) => p.section === newItem.section && p.name.toLowerCase().trim() === newItem.name.toLowerCase().trim()
    );
    let matchType = "exact";

    // 2. Fuzzy match: high name similarity, same section
    if (matchIdx === -1) {
      let best = { idx: -1, score: 0 };
      remainingPrev.forEach((p, i) => {
        if (p.section !== newItem.section) return;
        const score = nameSimilarity(p.name, newItem.name);
        if (score > best.score) best = { idx: i, score };
      });
      if (best.score >= 0.6) {
        matchIdx = best.idx;
        matchType = best.score >= 0.85 ? "fuzzy-high" : "fuzzy-rename";
      }
    }

    // 3. Component / semantic match: strong ingredient overlap even with a
    // different name (covers renames + evolved dishes).
    if (matchIdx === -1) {
      let best = { idx: -1, score: 0 };
      remainingPrev.forEach((p, i) => {
        const score = componentOverlap(p.components, newItem.components);
        if (score > best.score) best = { idx: i, score };
      });
      if (best.score >= 0.4) {
        matchIdx = best.idx;
        matchType = "component";
      }
    }

    if (matchIdx === -1) {
      results.added.push(newItem);
      continue;
    }

    const oldItem = remainingPrev[matchIdx];
    remainingPrev.splice(matchIdx, 1);

    const { added, removed } = classifyComponentDelta(oldItem.components, newItem.components);
    const priceChanged = oldItem.price != null && newItem.price != null && oldItem.price !== newItem.price;
    const nameChanged = oldItem.name.trim().toLowerCase() !== newItem.name.trim().toLowerCase();
    const explanation = explainDishChange(oldItem, newItem, added, removed, priceChanged);
    const importance = scoreImportance(added, removed, priceChanged, oldItem, newItem);

    const noChange = added.length === 0 && removed.length === 0 && !priceChanged && !nameChanged;

    const match = {
      oldItem,
      newItem,
      matchType,
      nameChanged,
      priceChanged,
      priceDelta: priceChanged ? +(newItem.price - oldItem.price).toFixed(2) : 0,
      componentsAdded: added,
      componentsRemoved: removed,
      explanation,
      noChange,
      ...importance,
      confidence: matchType === "exact" ? 0.98 : matchType === "fuzzy-high" ? 0.9 : matchType === "fuzzy-rename" ? 0.65 : 0.55,
      needsReview: matchType === "fuzzy-rename" || matchType === "component",
    };

    if (match.needsReview) results.uncertain.push(match);
    else results.matches.push(match);
  }

  // Anything left in remainingPrev was not matched -> removed
  results.removed = remainingPrev;

  return results;
}

export { ALLERGEN_KEYS };
