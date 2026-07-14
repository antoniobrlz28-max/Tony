// Heuristic text -> structured menu parser. Designed for pasted/typed menu
// text (no OCR available in this environment). Keeps the raw line alongside
// the parsed fields so nothing is silently discarded.

const PRICE_RE = /\$?\s*(\d{1,3}(?:\.\d{2})?)\s*$/;
const DASH_SPLIT_RE = /\s+[—–-]\s+/;

function looksLikeSectionHeader(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (PRICE_RE.test(trimmed) && /\d/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/);
  if (words.length > 5) return false;
  const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  const isTitleShort = words.length <= 4 && !trimmed.includes(",");
  return isAllCaps || (isTitleShort && trimmed.length < 40 && !DASH_SPLIT_RE.test(trimmed));
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

export function parseMenuText(rawText) {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const sections = [];
  let current = null;
  let title = null;
  let warnings = [];
  // Tracks the most recently added item so a following no-price line (very
  // common in PDF menus, where the description wraps to its own line under
  // the name+price line) can be folded in as more description instead of
  // becoming a bogus standalone dish.
  let lastItem = null;

  lines.forEach((line, idx) => {
    if (idx === 0 && looksLikeSectionHeader(line) === false && !PRICE_RE.test(line)) {
      // could be a menu title line, e.g. "JOVANINA'S — DINNER"; keep as
      // title candidate only if no section has started and it's short.
    }
    if (looksLikeSectionHeader(line)) {
      current = { name: line.replace(/:$/, ""), items: [] };
      sections.push(current);
      lastItem = null;
      return;
    }
    const { price, rest } = extractPrice(line);
    if (!rest) {
      warnings.push(`Could not parse line: "${line}"`);
      return;
    }

    // A no-price line is treated as a wrapped description of the previous
    // dish only when it reads like an ingredient list (starts lowercase, or
    // contains a comma) — a genuine Title Case no-price dish name (e.g. a
    // market-price item) still becomes its own item.
    const looksLikeContinuation = /^[a-z]/.test(rest) || rest.includes(",");
    if (price === null && lastItem && looksLikeContinuation) {
      lastItem.description = lastItem.description ? `${lastItem.description}, ${rest}` : rest;
      lastItem.rawLine += `\n${line}`;
      return;
    }

    const { name, description } = splitNameDescription(rest);
    if (!current) {
      current = { name: "Menu", items: [] };
      sections.push(current);
    }
    if (!name) {
      warnings.push(`Could not parse line: "${line}"`);
      return;
    }
    lastItem = {
      rawLine: line,
      name,
      description,
      price,
      confidence: price === null ? 0.6 : 0.85,
    };
    current.items.push(lastItem);
  });

  return { title, sections, warnings };
}
