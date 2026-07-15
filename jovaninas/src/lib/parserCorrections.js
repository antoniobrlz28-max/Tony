/**
 * Parser correction utilities.
 *
 * Each function takes an extraction result (immutable) and returns a new one
 * with the correction applied.  They are designed to be composed — the output
 * of one can be passed as the input of the next.
 *
 * All functions perform a structuredClone so callers never need to worry about
 * mutating state.
 */

// ─── 1. splitItem ─────────────────────────────────────────────────────────────

/**
 * Split a single item into two items at `splitAt` within the name.
 *
 * @param {object} extraction
 * @param {{ sectionIdx: number, itemIdx: number, splitAt: string }} opts
 *   `splitAt` is a substring of the name.  Everything up to (and not including)
 *   the first occurrence becomes the first item; the remainder becomes the second.
 * @returns {object} new extraction
 */
export function splitItem(extraction, { sectionIdx, itemIdx, splitAt }) {
  const result = structuredClone(extraction);
  const sections = result.sections;
  if (!sections?.[sectionIdx]?.items?.[itemIdx]) return result;

  const original = sections[sectionIdx].items[itemIdx];
  const cutPos = original.name.indexOf(splitAt);
  if (cutPos < 0) return result;

  const nameA = original.name.slice(0, cutPos).trim();
  const nameB = original.name.slice(cutPos + splitAt.length).trim();

  const itemA = { ...original, name: nameA };
  const itemB = { ...original, name: nameB, description: "", price: null, priceText: "" };

  sections[sectionIdx].items.splice(itemIdx, 1, itemA, itemB);
  return result;
}

// ─── 2. mergeItems ───────────────────────────────────────────────────────────

/**
 * Merge two adjacent items within the same section into one.
 * The first item's name is kept; the second item's name is appended to the
 * description.  Price is taken from whichever item has one (first wins).
 *
 * @param {object} extraction
 * @param {{ sectionIdx: number, itemIdxA: number, itemIdxB: number }} opts
 * @returns {object} new extraction
 */
export function mergeItems(extraction, { sectionIdx, itemIdxA, itemIdxB }) {
  const result = structuredClone(extraction);
  const items = result.sections?.[sectionIdx]?.items;
  if (!items) return result;

  const lo = Math.min(itemIdxA, itemIdxB);
  const hi = Math.max(itemIdxA, itemIdxB);
  if (!items[lo] || !items[hi]) return result;

  const a = items[lo];
  const b = items[hi];

  const merged = {
    ...a,
    description: [a.description, b.name, b.description].filter(Boolean).join(" — ").trim(),
    price: a.price ?? b.price,
    priceText: a.priceText || b.priceText,
    prices: { ...b.prices, ...a.prices },
  };

  items.splice(lo, 2, merged);
  return result;
}

// ─── 3. renameItem ───────────────────────────────────────────────────────────

/**
 * Rename a single item.
 *
 * @param {object} extraction
 * @param {{ sectionIdx: number, itemIdx: number, newName: string }} opts
 * @returns {object} new extraction
 */
export function renameItem(extraction, { sectionIdx, itemIdx, newName }) {
  const result = structuredClone(extraction);
  const item = result.sections?.[sectionIdx]?.items?.[itemIdx];
  if (!item) return result;
  item.name = (newName || "").trim();
  return result;
}

// ─── 4. updateItemPrice ──────────────────────────────────────────────────────

/**
 * Set the price of an item.  Pass `null` to clear the price.
 *
 * @param {object} extraction
 * @param {{ sectionIdx: number, itemIdx: number, price: number|null, priceText?: string }} opts
 * @returns {object} new extraction
 */
export function updateItemPrice(extraction, { sectionIdx, itemIdx, price, priceText = "" }) {
  const result = structuredClone(extraction);
  const item = result.sections?.[sectionIdx]?.items?.[itemIdx];
  if (!item) return result;
  item.price = price;
  item.priceText = priceText;
  if (price === null) item.prices = {};
  return result;
}

// ─── 5. updateItemDescription ────────────────────────────────────────────────

/**
 * Replace the description of an item.
 *
 * @param {object} extraction
 * @param {{ sectionIdx: number, itemIdx: number, description: string }} opts
 * @returns {object} new extraction
 */
export function updateItemDescription(extraction, { sectionIdx, itemIdx, description }) {
  const result = structuredClone(extraction);
  const item = result.sections?.[sectionIdx]?.items?.[itemIdx];
  if (!item) return result;
  item.description = (description || "").trim();
  return result;
}

// ─── 6. removeItem ───────────────────────────────────────────────────────────

/**
 * Remove an item from a section.  If the section becomes empty it is also
 * removed.
 *
 * @param {object} extraction
 * @param {{ sectionIdx: number, itemIdx: number }} opts
 * @returns {object} new extraction
 */
export function removeItem(extraction, { sectionIdx, itemIdx }) {
  const result = structuredClone(extraction);
  const section = result.sections?.[sectionIdx];
  if (!section?.items?.[itemIdx] === undefined) return result;
  section.items.splice(itemIdx, 1);
  if (section.items.length === 0) {
    result.sections.splice(sectionIdx, 1);
  }
  return result;
}

// ─── 7. renameSection ────────────────────────────────────────────────────────

/**
 * Rename a section.  Searches both `sections` and `drinkSections`.
 *
 * @param {object} extraction
 * @param {{ sectionIdx: number, newName: string, pool?: "food"|"drink" }} opts
 *   `pool` defaults to "food".  Use "drink" for drinkSections.
 * @returns {object} new extraction
 */
export function renameSection(extraction, { sectionIdx, newName, pool = "food" }) {
  const result = structuredClone(extraction);
  const arr = pool === "drink" ? result.drinkSections : result.sections;
  if (!arr?.[sectionIdx]) return result;
  arr[sectionIdx].name = (newName || "").trim();
  return result;
}

// ─── 8. moveItemToSection ────────────────────────────────────────────────────

/**
 * Move an item from one section to another (both in `sections`).
 * If `toSectionIdx` equals the number of existing sections a new section is
 * created with `newSectionName`.
 *
 * @param {object} extraction
 * @param {{
 *   fromSectionIdx: number,
 *   fromItemIdx: number,
 *   toSectionIdx: number,
 *   newSectionName?: string,
 * }} opts
 * @returns {object} new extraction
 */
export function moveItemToSection(extraction, {
  fromSectionIdx,
  fromItemIdx,
  toSectionIdx,
  newSectionName = "New Section",
}) {
  const result = structuredClone(extraction);
  const fromSection = result.sections?.[fromSectionIdx];
  if (!fromSection?.items?.[fromItemIdx] === undefined) return result;

  const [item] = fromSection.items.splice(fromItemIdx, 1);

  // Remove source section if now empty
  if (fromSection.items.length === 0) {
    result.sections.splice(fromSectionIdx, 1);
    // Adjust toSectionIdx if needed
    if (toSectionIdx > fromSectionIdx) toSectionIdx--;
  }

  if (toSectionIdx >= result.sections.length) {
    result.sections.push({ name: newSectionName, items: [item] });
  } else {
    result.sections[toSectionIdx].items.push(item);
  }

  return result;
}
