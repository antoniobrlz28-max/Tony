// Heuristic text -> structured menu parser. Designed for both pasted/typed
// menu text and PDF-extracted text (no OCR available in this environment).
// Keeps the raw line alongside the parsed fields so nothing is silently
// discarded.
//
// Real restaurant PDF menus (verified against Jovanina's actual menus)
// commonly lay a dish out across two lines: the dish name on its own line
// in ALL CAPS, then a second line with the ingredient list and price
// ("HOUSEMADE FOCACCIA" / "Whipped Ricotta + Lavender Honey    14").
// Category headers ("STARTERS", "SWEET", "WOOD FIRED PIZZA"...) look
// structurally identical to a dish-name line (short, no price), so they're
// told apart with a known-category-keyword list rather than guessing from
// capitalization alone.

import { FOOD_HEADERS, DRINK_HEADERS, normalizeHeaderText } from "./menuHeaders.js";

const PRICE_RE = /\$?\s*(\d{1,3}(?:\.\d{2})?)\s*$/;
const DASH_SPLIT_RE = /\s+[—–-]\s+/;
// A "+6" / "+4" glued directly to a number (no space) is a surcharge/add-on
// note ("Gluten Free Crust +6"), not a dish price — real prices in these
// menus are right-aligned with a large gap before the digits.
const SURCHARGE_RE = /\+\d{1,3}\s*$/;
// "No. 248", "No.248", "Menu No. 248", "#248" — a print/archive number,
// never a dish.
const MENU_NUMBER_RE = /^(?:menu\s+)?no\.?\s*#?\s*(\d{1,6})\s*\.?$|^#\s*(\d{1,6})$/i;

// Exact (not substring) category titles — many real dish names contain
// category-ish words ("La Scala Salad", "Oak Ember Roasted Rainbow
// Carrots", "Roasted Butternut Squash Ravioli"), so a loose "contains
// roasted/salad/pasta" match would misfire and turn those dishes into
// phantom sections. Matching the whole (normalized) line against a known
// set of category titles avoids that.
function isSectionHeaderLine(line) {
  const trimmed = line.trim();
  if (!trimmed || PRICE_RE.test(trimmed)) return false;
  if (trimmed.split(/\s+/).length > 6) return false;
  return FOOD_HEADERS.has(normalizeHeaderText(trimmed));
}

// Same idea, but for a drinks-menu header (Cocktails, Wines by the Glass,
// Bottled Beer...) so a single pass over the page's text can pull out a
// dishes list and a drinks list side by side, rather than needing the
// drinks content isolated into its own clean block first.
function isDrinkHeaderLine(line) {
  const trimmed = line.trim();
  if (!trimmed || PRICE_RE.test(trimmed)) return false;
  if (trimmed.split(/\s+/).length > 6) return false;
  return DRINK_HEADERS.has(normalizeHeaderText(trimmed));
}

// True when a no-price line reads like an ingredient/description fragment
// rather than a title fragment: starts lowercase, uses "+"/"," separators,
// or is simply long.
function looksLikeIngredientText(line) {
  return /^[a-z]/.test(line) || line.includes(",") || line.includes("+") || line.split(/\s+/).length > 6;
}

function looksLikeTitleFragment(line) {
  if (!line || PRICE_RE.test(line) || SURCHARGE_RE.test(line)) return false;
  if (looksLikeIngredientText(line)) return false;
  return line.split(/\s+/).length <= 6;
}

function extractPrice(line) {
  const m = line.match(PRICE_RE);
  if (!m) return { price: null, rest: line.trim() };
  const price = parseFloat(m[1]);
  const rest = line.slice(0, m.index).trim();
  return { price: Number.isFinite(price) ? price : null, rest };
}

function splitNameDescription(rest) {
  if (DASH_SPLIT_RE.test(rest)) {
    const [name, ...descParts] = rest.split(DASH_SPLIT_RE);
    return { name: name.trim(), description: descParts.join(" — ").trim() };
  }
  const commaIdx = rest.indexOf(",");
  if (commaIdx > -1) {
    const beforeComma = rest.slice(0, commaIdx);
    if (beforeComma.split(/\s+/).length <= 6) {
      return { name: beforeComma.trim(), description: rest.slice(commaIdx + 1).trim() };
    }
  }
  // fall back: multiple spaces often separate name from description on
  // typed/pasted menus copied from PDFs
  const bigGap = rest.split(/\s{2,}/);
  if (bigGap.length >= 2) {
    return { name: bigGap[0].trim(), description: bigGap.slice(1).join(" ").trim() };
  }
  return { name: rest.trim(), description: "" };
}

// Parses a page of menu text into a food dish list AND a drinks list in
// one pass, rather than requiring the drinks content to already be
// isolated. A designed one-page menu commonly interleaves food and drinks
// headers as the page layout dictates (not always food-first, drinks-
// last) — whichever kind of header was most recently seen is the "active
// track", and items are appended to that track's currently-open section
// until the next header (of either kind) switches it. This can't recover
// perfect column-by-column reading order on a very creatively laid-out
// page (see pdfExtract.js), but it keeps food and drinks cleanly
// separated into their own lists rather than mixed into one, and the
// existing per-item heuristics below are unchanged.
export function parseMenuText(rawText) {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const sections = [];
  const drinkSections = [];
  let current = null;
  let currentDrink = null;
  let activeTrack = "food";
  let warnings = [];
  let menuNumber = null;
  let lastItem = null;

  // A dish/drink name spotted on its own line, waiting for its
  // description/price (possibly spanning further title-fragment lines,
  // e.g. a name that itself wraps across two lines).
  let pendingName = null;
  let pendingDescription = "";

  function finalizeItem(name, description, price, rawLine) {
    let target;
    if (activeTrack === "drinks") {
      if (!currentDrink) {
        currentDrink = { name: "Drinks", items: [] };
        drinkSections.push(currentDrink);
      }
      target = currentDrink;
    } else {
      if (!current) {
        current = { name: "Menu", items: [] };
        sections.push(current);
      }
      target = current;
    }
    lastItem = {
      rawLine,
      name: name.replace(/\*+$/, "").trim(),
      description: description.trim(),
      price,
      confidence: price === null ? 0.6 : 0.9,
    };
    target.items.push(lastItem);
  }

  for (const line of lines) {
    const numberMatch = line.match(MENU_NUMBER_RE);
    if (numberMatch) {
      menuNumber = numberMatch[1] || numberMatch[2];
      continue;
    }

    if (SURCHARGE_RE.test(line) && !PRICE_RE.test(line.replace(SURCHARGE_RE, ""))) {
      // an add-on/surcharge note like "Gluten Free Crust +6" — not a dish
      warnings.push(`Skipped add-on note (not a dish): "${line}"`);
      continue;
    }

    if (pendingName !== null) {
      const { price, rest } = extractPrice(line);
      if (!rest) {
        // A bare price on its own line (common once a wide right-justified
        // price gap forces its own line/segment) finishes off the pending
        // item — dropping it here would silently discard the price and
        // leave pendingName open to wrongly absorb the next dish's title.
        if (price !== null) {
          finalizeItem(pendingName, pendingDescription, price, `${pendingName}\n${line}`);
          pendingName = null;
          pendingDescription = "";
        }
        continue;
      }
      if (price !== null || looksLikeIngredientText(rest)) {
        pendingDescription = pendingDescription ? `${pendingDescription}, ${rest}` : rest;
        if (price !== null) {
          finalizeItem(pendingName, pendingDescription, price, `${pendingName}\n${line}`);
          pendingName = null;
          pendingDescription = "";
        }
        continue;
      }
      if (looksLikeTitleFragment(rest) && !isSectionHeaderLine(rest) && !isDrinkHeaderLine(rest)) {
        // the dish name itself wraps across another line
        pendingName = `${pendingName} ${rest}`;
        continue;
      }
      // fell through: whatever we were building didn't resolve cleanly —
      // flush it as-is (better to surface an imperfect item than lose it)
      finalizeItem(pendingName, pendingDescription, null, pendingName);
      pendingName = null;
      pendingDescription = "";
      // then re-process this line fresh below by falling through
    }

    if (isSectionHeaderLine(line)) {
      activeTrack = "food";
      current = { name: line.replace(/:$/, ""), items: [] };
      sections.push(current);
      lastItem = null;
      continue;
    }

    if (isDrinkHeaderLine(line)) {
      activeTrack = "drinks";
      currentDrink = { name: line.replace(/:$/, ""), items: [] };
      drinkSections.push(currentDrink);
      lastItem = null;
      continue;
    }

    if (looksLikeTitleFragment(line)) {
      pendingName = line;
      pendingDescription = "";
      continue;
    }

    const { price, rest } = extractPrice(line);
    if (!rest) {
      // A bare price on its own line: attach it to whichever item is still
      // missing a price (its description line may itself have wrapped
      // without a price attached, with the price landing on a separate
      // line right after) rather than dropping it as unparseable.
      if (price !== null && lastItem && lastItem.price == null) {
        lastItem.price = price;
        lastItem.confidence = Math.max(lastItem.confidence, 0.9);
        lastItem.rawLine += `\n${line}`;
        continue;
      }
      warnings.push(`Could not parse line: "${line}"`);
      continue;
    }

    // A no-price line that reads like an ingredient list continues the
    // previous dish's description (common when a long description wraps).
    // An "add ..." line ("add a Digestivo from the Cart  9", "add
    // Fernet-Branca  5") is a priced upsell note on the previous dish, not
    // a new standalone dish, even though it does have its own price.
    const isUpsellNote = /^add\s/i.test(rest);
    if (lastItem && (isUpsellNote || (price === null && looksLikeIngredientText(rest)))) {
      const noted = isUpsellNote && price !== null ? `${rest} ($${price})` : rest;
      lastItem.description = lastItem.description ? `${lastItem.description}, ${noted}` : noted;
      lastItem.rawLine += `\n${line}`;
      continue;
    }

    const { name, description } = splitNameDescription(rest);
    if (!name) {
      warnings.push(`Could not parse line: "${line}"`);
      continue;
    }
    finalizeItem(name, description, price, line);
  }

  // Anything still pending at the end (e.g. a title-only last line) is
  // surfaced rather than silently dropped.
  if (pendingName !== null) {
    finalizeItem(pendingName, pendingDescription, null, pendingName);
  }

  return { title: null, sections, drinkSections, warnings, menuNumber };
}
