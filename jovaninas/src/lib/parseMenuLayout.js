/**
 * Layout-aware menu parser for Jovanina's
 *
 * Works with structured line data (from PDF geometry extraction) or plain text.
 * Uses priceExtractor for all price parsing so food and wine share one engine.
 */

import { extractPrice, stripPrice } from "./priceExtractor.js";

// ─── known section headers ───────────────────────────────────────────────────

const FOOD_SECTIONS = new Set([
  "STARTERS",
  "RAW, ROASTED & GRILLED",
  "WOOD FIRED PIZZA",
  "HANDMADE FRESH PASTA",
  "PASTA",
  "MAIN PLATES",
  "MAINS",
  "ENTREES",
  "SWEET",
  "DESSERT",
]);

const DRINK_SECTIONS = new Set([
  "SUMMER SPRITZES",
  "COCKTAILS",
  "DRAFT BEER",
  "BOTTLED BEER",
  "N/A BEVERAGES",
  "WINES BY THE GLASS",
  "SPARKLING",
  "STILL ROSÉ",
  "WHITE",
  "RED",
  "ORANGE",
  "BEER",
]);

// ─── helpers ─────────────────────────────────────────────────────────────────

function isFoodSection(name) {
  return FOOD_SECTIONS.has(name.trim().toUpperCase());
}

function isDrinkSection(name) {
  return DRINK_SECTIONS.has(name.trim().toUpperCase());
}

function looksLikeHeader(text) {
  const t = text.trim();
  // All-caps, not too long, no price embedded
  return (
    t === t.toUpperCase() &&
    t.length >= 3 &&
    t.length <= 60 &&
    !/\$?\d+\s*[|/]/.test(t)
  );
}

function isKnownHeader(text) {
  const u = text.trim().toUpperCase();
  return FOOD_SECTIONS.has(u) || DRINK_SECTIONS.has(u);
}

// ─── text-line parsing ───────────────────────────────────────────────────────

/**
 * Parse one text line into an item { name, description, price, priceType, prices }.
 * Returns null if the line doesn't look like a menu item.
 */
function parseItemLine(line) {
  const priceResult = extractPrice(line);
  if (!priceResult && !line.includes("—") && !line.includes("-")) return null;

  let rest = priceResult ? stripPrice(line, priceResult.priceText) : line;

  // Split name from description on common separators
  let name = rest;
  let description = "";
  const seps = [" — ", " – ", " - "];
  for (const sep of seps) {
    const idx = rest.indexOf(sep);
    if (idx > 1) {
      name = rest.slice(0, idx).trim();
      description = rest.slice(idx + sep.length).trim();
      break;
    }
  }

  name = name.trim();
  if (!name || name.length < 2) return null;

  return {
    name,
    description: description.trim(),
    price: priceResult?.price ?? null,
    priceText: priceResult?.priceText ?? "",
    priceType: priceResult?.priceType ?? "simple",
    prices: priceResult?.prices ?? {},
    confidence: priceResult ? 0.85 : 0.5,
  };
}

// ─── exported: parse plain text ──────────────────────────────────────────────

/**
 * Parse menu text into sections and items.
 *
 * @param {string} text
 * @param {object} [opts]
 * @param {string[]} [opts.extraFoodHeaders] - Extra section headers to treat as food
 * @returns {{ sections: Array, drinkSections: Array, warnings: string[], menuNumber: string|null }}
 */
export function parseMenuFromText(text, opts = {}) {
  if (!text || !text.trim()) {
    return { sections: [], drinkSections: [], warnings: [], menuNumber: null };
  }

  const extraFood = new Set((opts.extraFoodHeaders || []).map((h) => h.toUpperCase()));
  const sections = [];
  const drinkSections = [];
  const warnings = [];
  let menuNumber = null;
  let current = null;
  let currentIsDrink = false;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    // Menu number detection  "Menu No. 47" / "MENU #12"
    const menuNoMatch = line.match(/menu\s*(?:no\.?|#|number)\s*(\d+)/i);
    if (menuNoMatch) {
      menuNumber = menuNoMatch[1];
      continue;
    }

    const upper = line.toUpperCase();

    // Section header detection
    if (isKnownHeader(line) || extraFood.has(upper)) {
      const isDrink = isDrinkSection(line) && !extraFood.has(upper);
      current = { name: line.trim(), items: [] };
      currentIsDrink = isDrink;
      if (isDrink) drinkSections.push(current);
      else sections.push(current);
      continue;
    }

    // Heuristic header: all-caps short line with no price
    if (looksLikeHeader(line) && !extractPrice(line)) {
      current = { name: line.trim(), items: [] };
      currentIsDrink = false;
      sections.push(current);
      continue;
    }

    // Skip short non-item lines
    if (line.length < 3) continue;

    // Try to parse as an item
    const item = parseItemLine(line);

    if (!item) {
      // Could be a description continuation
      if (current && current.items.length > 0) {
        const last = current.items[current.items.length - 1];
        last.description = (last.description ? last.description + " " + line : line).trim();
      }
      continue;
    }

    if (!current) {
      current = { name: "Menu", items: [] };
      currentIsDrink = false;
      sections.push(current);
    }

    current.items.push(item);
  }

  const clean = (arr) =>
    arr
      .map((s) => ({ ...s, items: s.items.filter((i) => i.name?.trim()) }))
      .filter((s) => s.items.length > 0);

  return {
    sections: clean(sections),
    drinkSections: clean(drinkSections),
    warnings,
    menuNumber,
  };
}
