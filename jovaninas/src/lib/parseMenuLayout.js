/**
 * Layout-aware menu parser for Jovanina's
 *
 * Two parsing modes:
 *   1. parseMenuFromLayout(positionedLines)  — spatial, geometry-aware
 *   2. parseMenuFromText(text)               — text-only fallback (unchanged)
 *
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

const KNOWN_SECTIONS = [...FOOD_SECTIONS, ...DRINK_SECTIONS];

// ─── helpers ─────────────────────────────────────────────────────────────────

function isFoodSection(name) {
  return FOOD_SECTIONS.has(name.trim().toUpperCase());
}

function isDrinkSection(name) {
  return DRINK_SECTIONS.has(name.trim().toUpperCase());
}

function looksLikeHeader(text) {
  const t = text.trim();
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

// Levenshtein distance for fuzzy header matching
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function stringSimilarity(a, b) {
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length < b.length ? a : b;
  if (longer.length === 0) return 1;
  return (longer.length - levenshtein(longer, shorter)) / longer.length;
}

function findClosestKnownSection(text) {
  let best = { name: null, score: 0 };
  for (const s of KNOWN_SECTIONS) {
    const score = stringSimilarity(text, s);
    if (score > best.score) best = { name: s, score };
  }
  return best.score > 0 ? best : null;
}

// Note patterns to skip (section disclaimers, add-on lines, etc.)
const NOTE_PATTERNS = [
  /^add\s+.+\s+\+?\d+$/i,
  /^gluten[\s-]free/i,
  /^vegan/i,
  /^vegetarian/i,
  /^\s*[-–—]+\s*or\s*[-–—]+\s*$/i,
  /^consuming raw or undercooked/i,
  /^please inform your server/i,
  /^\*+\s*/i,                       // asterisk disclaimers
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,   // bare dates
];

function isSectionNote(text) {
  const t = text.trim();
  return NOTE_PATTERNS.some((re) => re.test(t));
}

// ─── layout parser ───────────────────────────────────────────────────────────

/**
 * Group geometry text items into visual lines.
 * Items within `fontSize * 0.35` of the same baseline are merged left-to-right.
 *
 * @param {Array} items - Raw items with {x0, x1, y0, y1, fontSize, isBold, isItalic, fontFamily, text, page}
 * @returns {Array} Lines: {id, page, text, x0, x1, y0, y1, fontSize, isBold, isItalic, fontFamilies}
 */
export function groupItemsIntoLines(items) {
  if (!items || items.length === 0) return [];

  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y0 - b.y0) > 0.5) return a.y0 - b.y0;
    return a.x0 - b.x0;
  });

  const lines = [];
  for (const item of sorted) {
    const tol = item.fontSize * 0.35;
    const last = lines[lines.length - 1];
    if (last && Math.abs(item.y0 - last._refY) <= Math.max(tol, last._tol)) {
      last._parts.push(item);
      last.x1 = Math.max(last.x1, item.x1);
      last.y1 = Math.max(last.y1, item.y1);
      last.isBold = last.isBold || item.isBold;
      last.isItalic = last.isItalic || item.isItalic;
      if (item.fontFamily && !last.fontFamilies.includes(item.fontFamily)) {
        last.fontFamilies.push(item.fontFamily);
      }
    } else {
      lines.push({
        id: `line_${item.page}_${lines.length}`,
        page: item.page,
        text: "",
        x0: item.x0,
        x1: item.x1,
        y0: item.y0,
        y1: item.y1,
        fontSize: item.fontSize,
        isBold: item.isBold,
        isItalic: item.isItalic,
        fontFamilies: item.fontFamily ? [item.fontFamily] : [],
        _refY: item.y0,
        _tol: tol,
        _parts: [item],
      });
    }
  }

  for (const line of lines) {
    line._parts.sort((a, b) => a.x0 - b.x0);
    line.text = line._parts.map((p) => p.text).join("");
    delete line._refY;
    delete line._tol;
    delete line._parts;
  }

  return lines.filter((l) => l.text.trim().length > 0);
}

/**
 * Detect section headers from positioned lines.
 * Handles exact, wrapped (two-line), and heuristic matches.
 *
 * @param {Array} lines
 * @returns {Array} Subset of lines annotated with {sectionName, confidence, matchType}
 */
export function detectSectionHeaders(lines) {
  const headers = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.text.trim().toUpperCase();

    // Exact match
    if (KNOWN_SECTIONS.includes(upper)) {
      headers.push({ ...line, sectionName: upper, confidence: 1.0, matchType: "exact" });
      continue;
    }

    // Wrapped header: try combining with next line
    if (i + 1 < lines.length) {
      const next = lines[i + 1];
      const combined = (upper + " " + next.text.trim().toUpperCase()).trim();
      if (KNOWN_SECTIONS.includes(combined)) {
        headers.push({
          id: `header_${line.page}_${i}`,
          page: line.page,
          text: `${line.text} ${next.text}`,
          sectionName: combined,
          x0: Math.min(line.x0, next.x0),
          x1: Math.max(line.x1, next.x1),
          y0: line.y0,
          y1: next.y1,
          fontSize: Math.max(line.fontSize, next.fontSize),
          isBold: line.isBold || next.isBold,
          isItalic: line.isItalic || next.isItalic,
          fontFamilies: [...new Set([...line.fontFamilies, ...next.fontFamilies])],
          confidence: 0.95,
          matchType: "wrapped",
        });
        i++; // consume the next line
        continue;
      }
    }

    // Heuristic: large/bold all-caps text
    if (
      (line.isBold && line.fontSize >= 10.5) ||
      (upper === line.text.trim().toUpperCase() && upper.length > 2 && line.fontSize >= 11.5)
    ) {
      const match = findClosestKnownSection(upper);
      if (match && match.score > 0.75) {
        headers.push({
          ...line,
          sectionName: match.name,
          confidence: match.score,
          matchType: "heuristic",
        });
      }
    }
  }

  return headers;
}

/**
 * Detect column regions on a page by looking for consistent x0 gaps in lines.
 * Returns an array of column boundary ranges: [{x0, x1}]
 * Falls back to a single full-width column if no clear split is found.
 *
 * @param {Array} lines
 * @param {number} [pageWidth]
 * @returns {Array<{x0: number, x1: number}>}
 */
export function detectColumns(lines, pageWidth) {
  if (!lines || lines.length < 4) return null;

  const midX = lines.map((l) => (l.x0 + l.x1) / 2);
  midX.sort((a, b) => a - b);

  // Look for a significant gap in the middle of the distribution
  const minX = midX[0];
  const maxX = midX[midX.length - 1];
  const width = maxX - minX;
  if (width < 50) return null;

  // Histogram with 20 buckets
  const buckets = new Array(20).fill(0);
  for (const x of midX) {
    const idx = Math.min(19, Math.floor(((x - minX) / width) * 20));
    buckets[idx]++;
  }

  // Find largest gap in middle 40-60% of page
  let gapBucket = -1;
  let gapSize = 0;
  for (let b = 6; b <= 13; b++) {
    if (buckets[b] === 0) {
      const runLen = buckets.slice(b).findIndex((v) => v > 0);
      const run = runLen === -1 ? 20 - b : runLen;
      if (run > gapSize) {
        gapSize = run;
        gapBucket = b;
      }
    }
  }

  if (gapBucket < 0 || gapSize < 2) return null;

  const splitX = minX + (gapBucket / 20) * width;
  const pw = pageWidth || (maxX + 50);
  return [
    { x0: 0, x1: splitX },
    { x0: splitX, x1: pw },
  ];
}

/**
 * Assign each content line to its best preceding header.
 *
 * @param {Array} lines
 * @param {Array} headers - from detectSectionHeaders
 * @returns {Object} { [sectionName]: lines[] }
 */
export function assignLinesToSections(lines, headers) {
  const sections = {};
  headers.forEach((h) => { sections[h.sectionName] = []; });

  const headerIds = new Set(headers.map((h) => h.id));

  for (const line of lines) {
    if (headerIds.has(line.id)) continue;
    if (headers.length === 0) continue;

    let best = null;
    let bestScore = -Infinity;

    for (const h of headers) {
      // Header must appear above this line (smaller y0 in top-down coords)
      if (h.y0 >= line.y0) continue;

      const vertDist = line.y0 - h.y0;
      const hCenterX = (h.x0 + h.x1) / 2;
      const lCenterX = (line.x0 + line.x1) / 2;
      const horizDist = Math.abs(hCenterX - lCenterX);

      const overlapStart = Math.max(h.x0, line.x0);
      const overlapEnd = Math.min(h.x1, line.x1);
      const overlap = Math.max(0, overlapEnd - overlapStart);
      const overlapRatio = overlap / Math.max(h.x1 - h.x0, line.x1 - line.x0, 1);

      const score =
        100 / (1 + vertDist / 20) +
        overlapRatio * 50 -
        horizDist / 50;

      if (score > bestScore) {
        bestScore = score;
        best = h;
      }
    }

    if (best) sections[best.sectionName].push(line);
  }

  return sections;
}

// Score a line as an item title vs description
function scoreTitleLine(line) {
  let score = 0;
  if (line.isBold && line.fontSize >= 10.5) score += 40;
  if (line.fontSize >= 11.5) score += 20;
  if (extractPrice(line.text)) score += 15;
  if (line.text.includes(" — ") || line.text.includes(" – ") || line.text.includes(" - ")) score += 10;
  if (isSectionNote(line.text)) score -= 60;
  return score;
}

/**
 * Parse menu items within a section's lines.
 * Handles:
 *  - Bold title lines + following description lines
 *  - Oyster/shared-price groups (price appears on a right-aligned line shared
 *    by multiple items listed above it)
 *  - Wine pricing (glass | carafe | bottle)
 *
 * @param {Array} lines
 * @param {string} sectionName
 * @returns {Array} items
 */
export function parseItemsInSection(lines, sectionName) {
  const items = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isSectionNote(line.text)) { i++; continue; }

    const titleScore = scoreTitleLine(line);
    if (titleScore >= 10) {
      const item = {
        section: sectionName,
        name: line.text.trim(),
        description: "",
        price: null,
        priceText: "",
        prices: {},
        rawLine: line.text,
        confidence: Math.min(1, 0.5 + titleScore / 100),
        source: { page: line.page, x0: line.x0, y0: line.y0, x1: line.x1, y1: line.y1 },
      };

      const priceResult = extractPrice(line.text);
      if (priceResult) {
        item.price = priceResult.price;
        item.priceText = priceResult.priceText || priceResult.text || "";
        item.prices = priceResult.prices || {};
        item.name = stripPrice(line.text, item.priceText).trim();
      }

      // Consume following description lines
      i++;
      while (i < lines.length) {
        const next = lines[i];
        if (isSectionNote(next.text)) { i++; break; }
        const nextScore = scoreTitleLine(next);
        if (nextScore >= 10) break;           // next item starts

        const nextPrice = extractPrice(next.text);
        if (nextPrice && !item.price) {
          item.price = nextPrice.price;
          item.priceText = nextPrice.priceText || nextPrice.text || "";
          item.prices = nextPrice.prices || {};
        } else {
          const descText = item.price && nextPrice
            ? stripPrice(next.text, nextPrice.priceText || nextPrice.text || "")
            : next.text;
          if (descText.trim()) {
            item.description = (item.description ? item.description + " " : "") + descText.trim();
          }
        }
        i++;
      }

      item.name = item.name.trim();
      if (item.name && item.name.length >= 2) items.push(item);
    } else {
      i++;
    }
  }

  // Post-process: detect oyster-style shared prices.
  // If a section has items without prices followed by a right-aligned price line,
  // assign that price to all preceding priceless items in the group.
  applyOysterSharedPrices(items);

  return items;
}

/**
 * Oyster menus list multiple origins on separate lines then show a shared price.
 * e.g.:
 *   Kumamoto, Humboldt Bay CA
 *   Blue Point, Long Island NY
 *   $4 each
 *
 * Any trailing item whose name matches a price-only pattern gets treated as a
 * shared price and assigned back to the preceding priceless items.
 */
function applyOysterSharedPrices(items) {
  const PRICE_ONLY = /^\$?\d+(?:\.\d{1,2})?\s*(?:each|ea\.?|\/\s*pc)?$/i;
  for (let i = items.length - 1; i >= 1; i--) {
    const item = items[i];
    if (PRICE_ONLY.test(item.name.trim())) {
      const sharedPrice = extractPrice(item.name);
      if (!sharedPrice) continue;
      // Assign the shared price to all preceding priceless items in the run
      let j = i - 1;
      while (j >= 0 && !items[j].price) {
        items[j].price = sharedPrice.price;
        items[j].priceText = item.name.trim();
        items[j].prices = sharedPrice.prices || {};
        j--;
      }
      // Remove the synthetic price-only "item"
      items.splice(i, 1);
    }
  }
}

/**
 * Main layout-aware entry point.
 *
 * @param {Array} positionedLines - from extractPositionedLines or groupItemsIntoLines
 * @returns {{
 *   sections: Array<{name: string, items: Array, isDrink: boolean}>,
 *   drinkSections: Array,
 *   warnings: string[],
 *   menuNumber: string|null,
 *   metadata: { parser: string, itemCount: number, sectionCount: number, confidence: number },
 * }}
 */
export function parseMenuFromLayout(positionedLines) {
  if (!positionedLines || positionedLines.length === 0) {
    return {
      sections: [],
      drinkSections: [],
      warnings: [],
      menuNumber: null,
      metadata: { parser: "layout-aware", itemCount: 0, sectionCount: 0, confidence: 0 },
    };
  }

  const headers = detectSectionHeaders(positionedLines);
  if (headers.length === 0) {
    // No layout headers found — return empty so caller can fall back to text parser
    return {
      sections: [],
      drinkSections: [],
      warnings: ["No section headers detected; falling back to text parser."],
      menuNumber: null,
      metadata: { parser: "layout-aware", itemCount: 0, sectionCount: 0, confidence: 0 },
    };
  }

  const sectionLineMap = assignLinesToSections(positionedLines, headers);

  const foodSections = [];
  const drinkSections = [];
  let totalItems = 0;

  // Preserve header order
  const orderedHeaders = headers.filter(
    (h, idx, arr) => arr.findIndex((x) => x.sectionName === h.sectionName) === idx
  );

  for (const header of orderedHeaders) {
    const sectionLines = sectionLineMap[header.sectionName] || [];
    const items = parseItemsInSection(sectionLines, header.sectionName);
    if (items.length === 0) continue;

    const section = { name: header.sectionName, items };
    totalItems += items.length;

    if (isDrinkSection(header.sectionName)) drinkSections.push(section);
    else foodSections.push(section);
  }

  // Menu number from any line
  let menuNumber = null;
  for (const line of positionedLines) {
    const m = line.text.match(/menu\s*(?:no\.?|#|number)\s*(\d+)/i);
    if (m) { menuNumber = m[1]; break; }
  }

  return {
    sections: foodSections,
    drinkSections,
    warnings: [],
    menuNumber,
    metadata: {
      parser: "layout-aware",
      itemCount: totalItems,
      sectionCount: foodSections.length + drinkSections.length,
      confidence: headers.length > 0 ? 0.85 : 0.5,
    },
  };
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
    const menuNoMatch = line.match(/menu\s*(?:no\.?|#|number)\s*(\d+)/i);
    if (menuNoMatch) {
      menuNumber = menuNoMatch[1];
      continue;
    }

    const upper = line.toUpperCase();

    if (isKnownHeader(line) || extraFood.has(upper)) {
      const isDrink = isDrinkSection(line) && !extraFood.has(upper);
      current = { name: line.trim(), items: [] };
      currentIsDrink = isDrink;
      if (isDrink) drinkSections.push(current);
      else sections.push(current);
      continue;
    }

    if (looksLikeHeader(line) && !extractPrice(line)) {
      current = { name: line.trim(), items: [] };
      currentIsDrink = false;
      sections.push(current);
      continue;
    }

    if (line.length < 3) continue;

    const item = parseItemLine(line);

    if (!item) {
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
