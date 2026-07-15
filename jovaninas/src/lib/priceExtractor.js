/**
 * Unified price parser for menu items.
 *
 * Handles all price formats found on Jovanina's menus:
 *   - Simple:           "$29"  /  "29"  /  "29.00"
 *   - Per-unit:         "29 per 6"  (oysters, etc.)
 *   - Wine two-price:   "13 | 48"  /  "13 / 48"  /  "13 glass | 48 bottle"
 *   - Wine three-price: "13 / 34 (carafe) / 48"  /  "13 | 34 | 48 btl"
 *   - Beer:             "7 draft"  /  "8 can"
 *   - Cocktail range:   "14 – 16"
 *
 * Every successful parse returns a PriceResult object:
 *   {
 *     price:     number,          // Primary / display price
 *     priceText: string,          // Raw matched text
 *     priceType: string,          // "simple" | "per_unit" | "wine" | "beer" | "range"
 *     prices:    {                // Structured breakdown (empty for simple)
 *       glass?:   number,
 *       carafe?:  number,
 *       bottle?:  number,
 *       perUnit?: number,
 *       unitQty?: number,
 *       min?:     number,
 *       max?:     number,
 *     }
 *   }
 *
 * Returns null if no price is found.
 */

// ─── helpers ────────────────────────────────────────────────────────────────

const NUM = String.raw`\d+(?:\.\d{1,2})?`;   // e.g. "13" or "13.50"
// Supported separators between multi-part prices: pipe (|), slash (/), en-dash (–), hyphen (-)
const SEP = String.raw`\s*[|/–-]\s*`;

/** Parse a string as a float, returning null for NaN */
function pf(s) {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// ─── exported parser ────────────────────────────────────────────────────────

/**
 * Extract price information from a text string.
 * @param {string} text
 * @returns {import('./priceExtractor').PriceResult|null}
 */
export function extractPrice(text) {
  if (!text || typeof text !== "string") return null;
  const t = text.trim();

  // 1. Wine / multi-price:  "13 | 34 | 48",  "13 glass | 48 bottle",
  //    "13 / 34 (3-glass carafe) / 48 per Btl"
  const wineThree = new RegExp(
    `(${NUM})\\s*(?:glass|gls|g)?\\s*${SEP}\\s*(${NUM})\\s*(?:carafe|crf|3[- ]glass)?\\s*${SEP}\\s*(${NUM})\\s*(?:bottle|btl|b)?`,
    "i"
  );
  const m3 = t.match(wineThree);
  if (m3) {
    const [glass, carafe, bottle] = [pf(m3[1]), pf(m3[2]), pf(m3[3])];
    return {
      price: glass,
      priceText: m3[0],
      priceType: "wine",
      prices: { glass, carafe, bottle },
    };
  }

  const wineTwo = new RegExp(
    `(${NUM})\\s*(?:glass|gls|g)?\\s*${SEP}\\s*(${NUM})\\s*(?:bottle|btl|b)?`,
    "i"
  );
  const m2 = t.match(wineTwo);
  if (m2) {
    const [glass, bottle] = [pf(m2[1]), pf(m2[2])];
    return {
      price: glass,
      priceText: m2[0],
      priceType: "wine",
      prices: { glass, bottle },
    };
  }

  // 2. Per-unit:  "29 per 6"  /  "$29 per dozen"
  const perUnit = new RegExp(`\\$?(${NUM})\\s+per\\s+(${NUM}|dozen|half\\s+dozen)`, "i");
  const mPer = t.match(perUnit);
  if (mPer) {
    const unitPrice = pf(mPer[1]);
    const rawQty = mPer[2].toLowerCase();
    const qty = rawQty === "dozen" ? 12 : rawQty === "half dozen" ? 6 : pf(rawQty);
    return {
      price: unitPrice,
      priceText: mPer[0],
      priceType: "per_unit",
      prices: { perUnit: unitPrice, unitQty: qty },
    };
  }

  // 3. Price range:  "14 – 16"  /  "14-16"
  const range = new RegExp(`\\$?(${NUM})\\s*[–\\-]\\s*\\$?(${NUM})\\s*$`);
  const mRange = t.match(range);
  if (mRange) {
    const [min, max] = [pf(mRange[1]), pf(mRange[2])];
    return {
      price: min,
      priceText: mRange[0],
      priceType: "range",
      prices: { min, max },
    };
  }

  // 4. Simple price at end of line: "$29" / "29" / "29.00"
  const simple = new RegExp(`\\$?(${NUM})\\s*$`);
  const mSimple = t.match(simple);
  if (mSimple) {
    return {
      price: pf(mSimple[1]),
      priceText: mSimple[0],
      priceType: "simple",
      prices: {},
    };
  }

  return null;
}

/**
 * Strip the price portion from a text string and return the remainder.
 * @param {string} text
 * @param {string} priceText - The priceText returned from extractPrice
 * @returns {string}
 */
export function stripPrice(text, priceText) {
  if (!priceText) return text;
  return text.replace(priceText, "").replace(/[\s,—–\-]+$/, "").trim();
}

/**
 * Format a prices object for display.
 * @param {{ glass?, carafe?, bottle?, perUnit?, unitQty?, min?, max? }} prices
 * @param {string} priceType
 * @returns {string}
 */
export function formatPrices(prices, priceType) {
  if (!prices) return "";
  if (priceType === "wine") {
    if (prices.glass && prices.carafe && prices.bottle) {
      return `$${prices.glass} glass · $${prices.carafe} carafe · $${prices.bottle} bottle`;
    }
    if (prices.glass && prices.bottle) {
      return `$${prices.glass} glass · $${prices.bottle} bottle`;
    }
  }
  if (priceType === "per_unit") {
    return `$${prices.perUnit} per ${prices.unitQty}`;
  }
  if (priceType === "range") {
    return `$${prices.min}–$${prices.max}`;
  }
  return "";
}
