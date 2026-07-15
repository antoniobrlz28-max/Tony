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
  if (trimmed.length < 4 && /^[A-Z]\w?$/.test(trimmed)) return true; // single letter or 2-char
  return false;
}

// Detect if price is unusual for a restaurant (too high/low/fractional)
function isUnusualPrice(price) {
  if (price === null || price === undefined) return false;
  if (price < 0) return true;
  if (price > 200) return true;  // Jovanina's doesn't typically go this high
  if (price > 0 && price < 2) return true;  // Too cheap
  if (price % 1 !== 0 && price % 0.5 !== 0) return true;  // Unusual fractional (not .00 or .50)
  return false;
}

// Score individual fields for confidence
export function scoreFieldConfidence(field, value, context = {}) {
  if (!value) return 0.3;  // Missing field
  
  const str = String(value).trim();
  if (str.length === 0) return 0.2;
  
  let score = 0.5;  // baseline
  
  switch (field) {
    case "name":
      if (str.length > 30) score += 0.15;  // Longer names are usually more confident
      if (str.includes("&") || str.includes("/")) score += 0.1;  // Complex names often real
      if (/[àáâãäåèéêëìíîïòóôõöùúûü]/i.test(str)) score += 0.1;  // Accent marks = likely real
      if (isSuspiciousName(str)) score -= 0.2;
      break;
      
    case "description":
      if (str.length > 50) score += 0.2;
      if (str.length > 100) score += 0.1;
      if (str.includes(",")) score += 0.1;  // Lists of ingredients
      if (/\d+/.test(str)) score += 0.05;  // Has numbers (quantities, temps)
      break;
      
    case "price":
      if (typeof value === "number" && value > 8 && value < 150) score += 0.25;
      if (value % 0.5 === 0) score += 0.05;  // Clean .00 or .50
      if (isUnusualPrice(value)) score -= 0.2;
      break;
  }
  
  return Math.max(0, Math.min(1, score));
}

// Generate issues for a single item
export function validateItem(item, sectionIdx, itemIdx, allItems, dictionary = {}) {
  const issues = [];
  const { name, description, price } = item;
  
  // Critical: likely a header leak
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
  
  // Critical: missing name
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
  
  // Warning: suspicious name
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
  
  // Info: no price
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
  
  // Warning: unusual price
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
  
  // Info: weak description
  if (!description || description.trim().length < 10) {
    issues.push({
      type: ISSUE_TYPES.WEAK_DESCRIPTION,
      severity: ISSUE_SEVERITY.INFO,
      field: "description",
      message: "Description is missing or very short. Add ingredients/notes if available.",
      itemIdx,
      sectionIdx,
    });
  }
  
  // Warning: likely duplicate in same section
  if (name && name.trim().length > 0) {
    const sectionItems = allItems[sectionIdx]?.items || [];
    const duplicates = sectionItems.filter(
      (it, idx) => idx !== itemIdx && 
      it.name && 
      it.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (duplicates.length > 0) {
      issues.push({
        type: ISSUE_TYPES.DUPLICATE_IN_SECTION,
        severity: ISSUE_SEVERITY.WARNING,
        field: "name",
        message: `This dish name already appears in this section.`,
        itemIdx,
        sectionIdx,
      });
    }
  }
  
  return issues;
}

// Validate entire extraction result
export function validateExtraction(extraction, dictionary = {}) {
  const allIssues = [];
  const sections = extraction.sections || [];
  
  sections.forEach((section, sIdx) => {
    const items = section.items || [];
    items.forEach((item, iIdx) => {
      const itemIssues = validateItem(item, sIdx, iIdx, sections, dictionary);
      allIssues.push(...itemIssues);
    });
  });
  
  // Summary: count by severity
  const summary = {
    critical: allIssues.filter(i => i.severity === ISSUE_SEVERITY.CRITICAL).length,
    warning: allIssues.filter(i => i.severity === ISSUE_SEVERITY.WARNING).length,
    info: allIssues.filter(i => i.severity === ISSUE_SEVERITY.INFO).length,
  };
  
  return { issues: allIssues, summary };
}

// Score overall extraction confidence (0-1) based on issues
export function extractionConfidence(extraction, dictionary = {}) {
  const { summary } = validateExtraction(extraction, dictionary);
  const totalItems = (extraction.sections || []).reduce((n, s) => n + (s.items?.length || 0), 0);
  
  if (totalItems === 0) return 0;
  
  // Deduct from 1.0 based on critical/warning issues
  let score = 1.0;
  score -= (summary.critical / totalItems) * 0.4;  // Critical issues worth 40% deduction
  score -= (summary.warning / totalItems) * 0.2;   // Warnings worth 20% deduction
  
  return Math.max(0, Math.min(1, score));
}
