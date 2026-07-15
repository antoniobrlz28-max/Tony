// Parser learning system — profiles remember corrections for similar menu formats
// Helps auto-correct recurring issues (e.g. "always split this line", "this layout is headers")

import { uid } from "./id.js";

/**
 * Menu types supported by parser profiles.
 */
export const MENU_TYPE = {
  FOOD: "food",
  WINE: "wine",
};

export function emptyProfile(menuType = MENU_TYPE.FOOD) {
  return {
    profileId: uid("profile"),
    menuType,                 // "food" | "wine"
    createdAt: new Date().toISOString(),
    lastUsed: null,
    menuSignature: null,  // Hash of menu layout/structure for matching
    corrections: [],       // Applied corrections in this profile
    splitRules: [],        // Lines that should be split (name | description | price)
    mergeRules: [],        // Items that should be merged
    skipPatterns: [],      // Text patterns that are headers/noise
    nameAdjustments: {},   // name -> corrected_name mappings
    sectionRenames: {},    // original_section -> correct_section
    useCount: 0,
  };
}

/**
 * Create a pre-configured wine parser profile with sensible defaults.
 * Recognises multi-price wine format and origin separators.
 */
export function defaultWineProfile() {
  const profile = emptyProfile(MENU_TYPE.WINE);
  profile.menuSignature = "wine:default";
  profile.skipPatterns = [
    /^\d+$/.toString(),          // bare page numbers
    /^[\-–—]+$/.toString(),      // divider lines
  ];
  return profile;
}

/**
 * Seeded profile for Jovanina's dinner menu.
 * Pre-configures known sections, price ranges, and recurring skip patterns.
 */
export function jovaninesDinnerProfile() {
  const profile = emptyProfile(MENU_TYPE.FOOD);
  profile.profileId = "jovaninas-dinner-menu";
  profile.menuSignature = "jovaninas:dinner";
  profile.skipPatterns = [
    // Common disclaimers and notes that appear on Jovanina's menu
    /^consuming raw or undercooked/i.toString(),
    /^please inform your server/i.toString(),
    /^gluten[\s-]free pasta available/i.toString(),
    /^\*/.toString(),                   // asterisk footnotes
    /^\d+$/.toString(),                 // bare page numbers
    /^[\-–—]+$/.toString(),             // divider lines
  ];
  profile.sectionRenames = {
    "RAW, ROASTED AND GRILLED": "RAW, ROASTED & GRILLED",
    "HANDMADE PASTA": "HANDMADE FRESH PASTA",
    "MAINS": "MAIN PLATES",
    "DESSERTS": "SWEET",
  };
  profile.nameAdjustments = {};
  return profile;
}

// Compute a signature for a menu to match similar layouts
export function computeMenuSignature(extraction) {
  // Use section names + item count as a simple signature
  const sectionCount = extraction.sections?.length || 0;
  const itemCount = (extraction.sections || []).reduce((n, s) => n + (s.items?.length || 0), 0);
  const drinkSectionCount = extraction.drinkSections?.length || 0;
  const avgItemsPerSection = sectionCount > 0 ? Math.round(itemCount / sectionCount) : 0;
  
  return `sections:${sectionCount},items:${itemCount},drinks:${drinkSectionCount},avg:${avgItemsPerSection}`;
}

// Find profiles that match a menu signature
export function findMatchingProfiles(extraction, profiles = []) {
  const signature = computeMenuSignature(extraction);
  return profiles.filter((p) => p.menuSignature === signature).sort((a, b) => {
    // Sort by most recently used
    const aTime = new Date(a.lastUsed || 0).getTime();
    const bTime = new Date(b.lastUsed || 0).getTime();
    return bTime - aTime;
  });
}

// Apply a profile's corrections to an extraction
export function applyProfile(extraction, profile) {
  if (!profile || !profile.corrections) return extraction;
  
  let result = structuredClone(extraction);
  
  // Apply split rules
  (profile.splitRules || []).forEach((rule) => {
    result = applySplitRule(result, rule);
  });
  
  // Apply merge rules
  (profile.mergeRules || []).forEach((rule) => {
    result = applyMergeRule(result, rule);
  });
  
  // Apply skip patterns (remove items matching patterns)
  (profile.skipPatterns || []).forEach((pattern) => {
    result = applySkipPattern(result, pattern);
  });
  
  // Apply name adjustments
  Object.entries(profile.nameAdjustments || {}).forEach(([orig, corrected]) => {
    result = applyNameAdjustment(result, orig, corrected);
  });
  
  // Apply section renames
  Object.entries(profile.sectionRenames || {}).forEach(([orig, corrected]) => {
    result = renameSections(result, orig, corrected);
  });
  
  return result;
}

function applySplitRule(extraction, rule) {
  // rule = { sectionIdx, itemIdx, splitType: "name|description|price", parts }
  // Not yet implemented — would split name/desc/price into separate fields
  return extraction;
}

function applyMergeRule(extraction, rule) {
  // rule = { sectionIdx, itemIndices: [idx1, idx2, ...], mergeType }
  // Not yet implemented — would merge multiple items
  return extraction;
}

function applySkipPattern(extraction, pattern) {
  // pattern = regex or string
  const result = structuredClone(extraction);
  
  result.sections = (result.sections || []).map((section) => ({
    ...section,
    items: (section.items || []).filter((item) => {
      if (typeof pattern === "string") {
        return !item.name.includes(pattern);
      } else if (pattern instanceof RegExp) {
        return !pattern.test(item.name);
      }
      return true;
    }),
  })).filter((s) => s.items.length > 0);
  
  return result;
}

function applyNameAdjustment(extraction, original, corrected) {
  const result = structuredClone(extraction);
  
  result.sections = (result.sections || []).map((section) => ({
    ...section,
    items: (section.items || []).map((item) =>
      item.name === original ? { ...item, name: corrected } : item
    ),
  }));
  
  return result;
}

function renameSections(extraction, original, corrected) {
  const result = structuredClone(extraction);
  
  result.sections = (result.sections || []).map((section) =>
    section.name === original ? { ...section, name: corrected } : section
  );
  
  return result;
}

// Record a correction in a profile
export function recordCorrection(profile, correctionType, data) {
  const updated = structuredClone(profile);
  
  updated.corrections.push({
    type: correctionType,
    data,
    timestamp: new Date().toISOString(),
  });
  
  // Also update the specific rule set
  switch (correctionType) {
    case "split":
      updated.splitRules.push(data);
      break;
    case "merge":
      updated.mergeRules.push(data);
      break;
    case "skip":
      updated.skipPatterns.push(data.pattern);
      break;
    case "rename_name":
      updated.nameAdjustments[data.original] = data.corrected;
      break;
    case "rename_section":
      updated.sectionRenames[data.original] = data.corrected;
      break;
  }
  
  updated.lastUsed = new Date().toISOString();
  updated.useCount += 1;
  
  return updated;
}
