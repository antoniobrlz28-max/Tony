// Validates extracted menu data and detects issues at field and item level
// Issues include: ambiguous names, missing descriptions, confidence flags, etc.

export const ISSUE_SEVERITY = {
  CRITICAL: "critical",    // Missing required field or high ambiguity
  WARNING: "warning",       // Unclear/low confidence; needs review
  INFO: "info",            // Informational; nice-to-have
};

export const ISSUE_TYPES = {
  MISSING_NAME: "missing_name",
  AMBIGUOUS_NAME: "ambiguous_name",
  NO_PRICE: "no_price",
  UNUSUAL_PRICE: "unusual_price",
  WEAK_DESCRIPTION: "weak_description",
  LIKELY_HEADER: "likely_header",
  SHORT_NAME: "short_name",
  DUPLICATE_IN_SECTION: "duplicate_in_section",
  EMPTY_SECTION: "empty_section",
};

// Detect if text looks like a section header (ALL CAPS, short, minimal description)
function looksLikeHeader(name, description) {
  const isAllCaps = name && /^[A-Z\s&,.-]+$/.test(name.trim());
  const isShort = (name || "").length < 25;
  const hasNoDesc = !description || description.trim().length === 0;
  return isAllCaps && isShort && hasNoDesc;
}

// Detect if name is suspiciously short or generic
function isSuspiciousName(name) {
  const trimmed = (name || "").trim();
  if (trimmed.length < 2) return true;
  if (trimmed.length < 4 && /^[A-Z]\w?$/.test(trimmed)) return true;
  return false;
}

// Detect if price is unusual for a restaurant (too high/low/fractional)
function isUnusualPrice(price) {
  if (price === null || price === undefined) return false;
  if (price < 0) return true;
  if (price > 200) return true;
  if (price > 0 && price < 2) return true;
  if (price % 1 !== 0 && price % 0.5 !== 0) return true;
  return false;
}

// Score individual fields for confidence
export function scoreFieldConfidence(field, value, context = {}) {
  if (!value) return 0.3;
  
  const str = String(value).trim();
  if (str.length === 0) return 0.2;
  
  let score = 0.5;
  
  switch (field) {
    case "name":
      if (str.length > 30) score += 0.15;
      if (str.includes("&") || str.includes("/")) score += 0.1;
      if (/[àáâãäåèéêëìíîïòóôõöùúûü]/i.test(str)) score += 0.1;
      if (isSuspiciousName(str)) score -= 0.2;
      break;
      
    case "description":
      if (str.length > 50) score += 0.2;
      if (str.length > 100) score += 0.1;
      if (str.includes(",")) score += 0.1;
      if (/\d+/.test(str)) score += 0.05;
      break;
      
    case "price":
      if (typeof value === "number" && value > 8 && value < 150) score += 0.25;
      if (value % 0.5 === 0) score += 0.05;
      if (isUnusualPrice(value)) score -= 0.2;
      break;
  }
  
  return Math.max(0, Math.min(1, score));
}

// ─── spec-required validators ─────────────────────────────────────────────────

/**
 * Validate a single parsed item.
 * @param {object} item - { name, description, price, ... }
 * @param {{ sectionIdx?: number, itemIdx?: number }} [ctx]
 * @returns {Array} issues
 */
export function validateParsedItem(item, ctx = {}) {
  const issues = [];
  const { sectionIdx = 0, itemIdx = 0 } = ctx;
  const { name, description, price } = item || {};

  if (looksLikeHeader(name, description)) {
    issues.push({
      type: ISSUE_TYPES.LIKELY_HEADER,
      severity: ISSUE_SEVERITY.CRITICAL,
      field: "name",
      message: `Looks like a section header, not a dish: "${name}"`,
      itemIdx,
      sectionIdx,
    });
  }

  if (!name || name.trim().length === 0) {
    issues.push({
      type: ISSUE_TYPES.MISSING_NAME,
      severity: ISSUE_SEVERITY.CRITICAL,
      field: "name",
      message: "Dish name is required.",
      itemIdx,
      sectionIdx,
    });
  }

  if (isSuspiciousName(name)) {
    issues.push({
      type: ISSUE_TYPES.SHORT_NAME,
      severity: ISSUE_SEVERITY.WARNING,
      field: "name",
      message: `Dish name "${name}" is very short or unclear.`,
      itemIdx,
      sectionIdx,
    });
  }

  if (price === null || price === undefined) {
    issues.push({
      type: ISSUE_TYPES.NO_PRICE,
      severity: ISSUE_SEVERITY.INFO,
      field: "price",
      message: "No price found. Add one if available.",
      itemIdx,
      sectionIdx,
    });
  }

  if (isUnusualPrice(price)) {
    issues.push({
      type: ISSUE_TYPES.UNUSUAL_PRICE,
      severity: ISSUE_SEVERITY.WARNING,
      field: "price",
      message: `Price $${price} seems unusual for this restaurant.`,
      itemIdx,
      sectionIdx,
    });
  }

  if (!description || description.trim().length < 10) {
    issues.push({
      type: ISSUE_TYPES.WEAK_DESCRIPTION,
      severity: ISSUE_SEVERITY.INFO,
      field: "description",
      message: "Description is missing or very short.",
      itemIdx,
      sectionIdx,
    });
  }

  return issues;
}

/**
 * Validate a parsed section (name + items, including cross-item duplicate check).
 * @param {object} section - { name, items: [] }
 * @param {{ sectionIdx?: number }} [ctx]
 * @returns {Array} issues
 */
export function validateParsedSection(section, ctx = {}) {
  const issues = [];
  const { sectionIdx = 0 } = ctx;
  const items = section?.items || [];

  if (items.length === 0) {
    issues.push({
      type: ISSUE_TYPES.EMPTY_SECTION,
      severity: ISSUE_SEVERITY.WARNING,
      field: "items",
      message: `Section "${section?.name || "?"}" has no items.`,
      sectionIdx,
    });
    return issues;
  }

  const seenNames = new Set();
  items.forEach((item, itemIdx) => {
    const itemIssues = validateParsedItem(item, { sectionIdx, itemIdx });
    issues.push(...itemIssues);

    const lower = (item.name || "").toLowerCase().trim();
    if (lower && seenNames.has(lower)) {
      issues.push({
        type: ISSUE_TYPES.DUPLICATE_IN_SECTION,
        severity: ISSUE_SEVERITY.WARNING,
        field: "name",
        message: `Dish name "${item.name}" already appears in this section.`,
        itemIdx,
        sectionIdx,
      });
    }
    seenNames.add(lower);
  });

  return issues;
}

/**
 * Validate an entire parsed menu.
 * @param {object} menu - { sections: [], drinkSections: [] }
 * @returns {{ issues: Array, summary: { critical, warning, info } }}
 */
export function validateParsedMenu(menu) {
  const allIssues = [];
  const sections = [...(menu?.sections || []), ...(menu?.drinkSections || [])];

  sections.forEach((section, sIdx) => {
    allIssues.push(...validateParsedSection(section, { sectionIdx: sIdx }));
  });

  const summary = {
    critical: allIssues.filter((i) => i.severity === ISSUE_SEVERITY.CRITICAL).length,
    warning: allIssues.filter((i) => i.severity === ISSUE_SEVERITY.WARNING).length,
    info: allIssues.filter((i) => i.severity === ISSUE_SEVERITY.INFO).length,
  };

  return { issues: allIssues, summary };
}

/**
 * Collect all issues from a parsed menu (alias for validateParsedMenu that only
 * returns the flat issues array for convenience).
 * @param {object} menu
 * @returns {Array}
 */
export function collectParserIssues(menu) {
  return validateParsedMenu(menu).issues;
}

/**
 * Map a confidence score (0–1) to a named state.
 * @param {number} confidence
 * @returns {"high"|"medium"|"low"|"critical"}
 */
export function getConfidenceState(confidence) {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.6) return "medium";
  if (confidence >= 0.4) return "low";
  return "critical";
}

/**
 * Return true when the issues list contains critical-severity entries that
 * the user must resolve before the menu can be published.
 * @param {Array} issues
 * @returns {boolean}
 */
export function requiresImmediateResolution(issues) {
  return (issues || []).some((i) => i.severity === ISSUE_SEVERITY.CRITICAL);
}

// ─── legacy exports (kept for backwards compatibility) ─────────────────────

/** @deprecated Use validateParsedItem instead */
export function validateItem(item, sectionIdx, itemIdx, allItems, dictionary = {}) {
  return validateParsedItem(item, { sectionIdx, itemIdx });
}

/** @deprecated Use validateParsedMenu instead */
export function validateExtraction(extraction, dictionary = {}) {
  return validateParsedMenu(extraction);
}

/** Compute overall extraction confidence (0-1) based on issue density. */
export function extractionConfidence(extraction, dictionary = {}) {
  const { summary } = validateParsedMenu(extraction);
  const totalItems = [...(extraction?.sections || []), ...(extraction?.drinkSections || [])]
    .reduce((n, s) => n + (s.items?.length || 0), 0);

  if (totalItems === 0) return 0;

  let score = 1.0;
  score -= (summary.critical / totalItems) * 0.4;
  score -= (summary.warning / totalItems) * 0.2;
  return Math.max(0, Math.min(1, score));
}
