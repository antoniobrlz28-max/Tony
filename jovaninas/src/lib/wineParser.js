/**
 * Wine menu parser
 *
 * Extracts wine catalog data from raw text (pasted or from PDF).
 *
 * Expected input format (any of these):
 *   WINES BY THE GLASS
 *   Pinot Grigio — Alto Adige, Italy  13 | 48
 *   Vermentino — Sardegna, Italy  14 | 52
 *
 *   RED
 *   Nebbiolo — Barolo DOCG, Piedmont  18 | 38 | 70
 *
 * Returns:
 *   {
 *     sections: [
 *       {
 *         name: "WINES BY THE GLASS",
 *         type: "wine",   // wine | spirits | na_bev
 *         items: [
 *           {
 *             name: string,
 *             origin: string,      // region/country if present
 *             description: string,
 *             price: number,       // primary (glass) price
 *             priceType: string,
 *             prices: { glass?, carafe?, bottle? },
 *             confidence: number,
 *           }
 *         ]
 *       }
 *     ],
 *     warnings: string[],
 *     menuType: "wine",
 *   }
 */

import { extractPrice, stripPrice } from "./priceExtractor.js";

// ─── known wine section headers ─────────────────────────────────────────────

const WINE_SECTION_HEADERS = new Set([
  "WINES BY THE GLASS",
  "WINES BY THE BOTTLE",
  "SPARKLING",
  "STILL ROSÉ",
  "ROSE",
  "WHITE",
  "RED",
  "ORANGE",
  "DESSERT",
  "DESSERT WINE",
  "FORTIFIED",
  "HALF BOTTLES",
  "LARGE FORMAT",
  "MAGNUMS",
  "BEER",
  "DRAFT BEER",
  "BOTTLED BEER",
  "CANNED BEER",
  "SPIRITS",
  "WHISKEY",
  "BOURBON",
  "RYE",
  "GIN",
  "VODKA",
  "TEQUILA",
  "MEZCAL",
  "RUM",
  "COGNAC",
  "ARMAGNAC",
  "DIGESTIFS",
  "DIGESTIF",
  "AMARO",
  "N/A BEVERAGES",
  "NON-ALCOHOLIC",
  "ZERO PROOF",
  "SOFT DRINKS",
  "COCKTAILS",
]);

/** Heuristic: does a line look like a wine section header? */
// Characters allowed in a wine section header (letters, digits, common punctuation)
const HEADER_ALLOWED_CHARS = /[^A-Z0-9\s&/,.'()-]/g;

function isWineSectionHeader(line) {
  const t = line.trim().toUpperCase();
  if (WINE_SECTION_HEADERS.has(t)) return true;
  // Heuristic: short, all-caps/title-case, no embedded price separators
  if (
    t === t.replace(HEADER_ALLOWED_CHARS, "") &&
    t.length <= 40 &&
    !/\d+\s*[|/]/.test(t) &&
    /^[A-Z]/.test(t)
  ) {
    return true;
  }
  return false;
}

/** Classify section type from its name */
function sectionType(name) {
  const u = name.toUpperCase();
  if (/BEER|DRAFT|BOTTLED|CANNED/.test(u)) return "beer";
  if (/SPIRIT|WHISKEY|BOURBON|GIN|VODKA|TEQUILA|MEZCAL|RUM|COGNAC|DIGESTIF|AMARO/.test(u)) return "spirits";
  if (/N\/A|NON.ALCOHOLIC|ZERO PROOF|SOFT/.test(u)) return "na_bev";
  if (/COCKTAIL/.test(u)) return "cocktail";
  return "wine";
}

// ─── parse a single wine item line ──────────────────────────────────────────

/**
 * Common separators between name and origin/description:
 *   "Pinot Grigio — Alto Adige, Italy  13 | 48"
 *   "Pinot Grigio / Alto Adige  13 | 48"
 *   "Pinot Grigio, Alto Adige  13 | 48"
 *   "Pinot Grigio  Alto Adige  13 | 48"   (double-space)
 */
function parseWineItemLine(line) {
  const priceResult = extractPrice(line);
  let rest = priceResult ? stripPrice(line, priceResult.priceText) : line;

  let name = rest;
  let origin = "";

  // Split on common separators between name and origin/description.
  // "  " (double-space) is used by many PDF exports where a tab character
  // collapses to two spaces during text extraction.
  const separators = [" — ", " – ", " - ", "  ", " / "];
  for (const sep of separators) {
    const idx = rest.indexOf(sep);
    if (idx > 2) {
      name = rest.slice(0, idx).trim();
      origin = rest.slice(idx + sep.length).trim();
      break;
    }
  }

  return {
    name: name.trim(),
    origin: origin.trim(),
    description: "",
    price: priceResult?.price ?? null,
    priceText: priceResult?.priceText ?? "",
    priceType: priceResult?.priceType ?? "simple",
    prices: priceResult?.prices ?? {},
    confidence: priceResult ? 0.85 : 0.5,
  };
}

// ─── main exported function ─────────────────────────────────────────────────

/**
 * Parse wine menu text into structured sections and items.
 *
 * @param {string} text - Raw text from PDF or paste
 * @param {object} [opts]
 * @param {string[]} [opts.extraHeaders] - Additional header names to recognise
 * @returns {{ sections: Array, warnings: string[], menuType: "wine" }}
 */
export function parseWineText(text, opts = {}) {
  if (!text || !text.trim()) {
    return { sections: [], warnings: [], menuType: "wine" };
  }

  const extraHeaders = new Set((opts.extraHeaders || []).map((h) => h.toUpperCase()));
  const warnings = [];
  const sections = [];
  let current = null;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const upper = line.toUpperCase();

    // Detect section header
    if (isWineSectionHeader(line) || extraHeaders.has(upper)) {
      current = {
        name: line.trim(),
        type: sectionType(line),
        items: [],
      };
      sections.push(current);
      continue;
    }

    // Skip very short lines (page numbers, decorators)
    if (line.length < 3) continue;

    // Parse as wine item
    const item = parseWineItemLine(line);

    if (!item.name || item.name.length < 2) {
      warnings.push(`Could not parse line: "${line}"`);
      continue;
    }

    if (!current) {
      // No section header seen yet — create a default section
      current = { name: "Wine List", type: "wine", items: [] };
      sections.push(current);
    }

    // Check if this looks like a description continuation (no price, short)
    const lastItem = current.items[current.items.length - 1];
    if (
      lastItem &&
      item.price === null &&
      item.name.length < 50 &&
      !extractPrice(line)
    ) {
      // Likely a continuation description line
      lastItem.description = (lastItem.description
        ? lastItem.description + " " + line
        : line
      ).trim();
      continue;
    }

    current.items.push(item);
  }

  // Remove empty sections
  const nonEmpty = sections.filter((s) => s.items.length > 0);

  return { sections: nonEmpty, warnings, menuType: "wine" };
}
