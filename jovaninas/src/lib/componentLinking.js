// Auto-links parsed components to known dictionary entries
// Uses fuzzy matching + normalized forms to find existing ingredients

import { nameSimilarity } from "./diff.js";

// Match a single component to dictionary
export function linkComponentToDict(component, dictionary = {}) {
  if (!component || !dictionary) return null;
  
  const normalized = (component.normalized || "").toLowerCase().trim();
  const raw = (component.raw || "").toLowerCase().trim();
  
  if (!normalized && !raw) return null;
  
  // Exact match (normalized)
  if (dictionary[normalized]) {
    return {
      entryKey: normalized,
      entry: dictionary[normalized],
      matchType: "exact",
    };
  }
  
  // Exact match (raw)
  if (dictionary[raw]) {
    return {
      entryKey: raw,
      entry: dictionary[raw],
      matchType: "exact_raw",
    };
  }
  
  // Fuzzy match against all dictionary entries
  let bestMatch = null;
  let bestScore = 0.6;
  
  for (const [key, entry] of Object.entries(dictionary)) {
    const scoreNormalized = nameSimilarity(normalized, key);
    const scoreRaw = nameSimilarity(raw, key);
    const score = Math.max(scoreNormalized, scoreRaw);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { key, entry, score };
    }
  }
  
  if (bestMatch) {
    return {
      entryKey: bestMatch.key,
      entry: bestMatch.entry,
      matchType: bestMatch.score > 0.85 ? "fuzzy_high" : "fuzzy_low",
    };
  }
  
  return null;
}

// Link all components in an item
export function linkItemComponents(item, dictionary = {}) {
  if (!item.components || item.components.length === 0) {
    return { ...item, linkedComponents: [] };
  }
  
  const linkedComponents = item.components.map((comp) => {
    const link = linkComponentToDict(comp, dictionary);
    return {
      ...comp,
      link,
      linkedEntry: link ? link.entry : null,
    };
  });
  
  return { ...item, linkedComponents };
}

// Build suggestions for new dictionary entries from unlinked components
export function suggestNewDictEntries(items, dictionary = {}) {
  const suggestions = {};
  
  items.forEach((item) => {
    if (!item.components) return;
    
    item.components.forEach((comp) => {
      const link = linkComponentToDict(comp, dictionary);
      if (!link) {
        const normalized = (comp.normalized || "").toLowerCase().trim();
        if (normalized && !suggestions[normalized]) {
          suggestions[normalized] = {
            normalized,
            raw: comp.raw,
            count: 0,
            allergens: comp.allergens || [],
            role: comp.role || null,
          };
        }
        if (suggestions[normalized]) {
          suggestions[normalized].count += 1;
        }
      }
    });
  });
  
  return Object.values(suggestions).sort((a, b) => b.count - a.count);
}

// Link entire extraction to dictionary
export function linkExtraction(extraction, dictionary = {}) {
  const sections = (extraction.sections || []).map((section) => ({
    ...section,
    items: (section.items || []).map((item) => linkItemComponents(item, dictionary)),
  }));
  
  const drinkSections = (extraction.drinkSections || []).map((section) => ({
    ...section,
    items: (section.items || []).map((item) => linkItemComponents(item, dictionary)),
  }));
  
  const allItems = [
    ...sections.flatMap(s => s.items),
    ...drinkSections.flatMap(s => s.items),
  ];
  const newEntrySuggestions = suggestNewDictEntries(allItems, dictionary);
  
  return {
    ...extraction,
    sections,
    drinkSections,
    newEntrySuggestions,
  };
}

// Report on link coverage
export function linkCoverageReport(extraction) {
  let totalComponents = 0;
  let linkedComponents = 0;
  
  const allItems = [
    ...(extraction.sections || []).flatMap(s => s.items || []),
    ...(extraction.drinkSections || []).flatMap(s => s.items || []),
  ];
  
  allItems.forEach((item) => {
    if (!item.linkedComponents) return;
    
    item.linkedComponents.forEach((comp) => {
      totalComponents += 1;
      if (comp.link) {
        linkedComponents += 1;
      }
    });
  });
  
  return {
    totalComponents,
    linkedComponents,
    coveragePercent: totalComponents > 0 ? Math.round((linkedComponents / totalComponents) * 100) : 0,
  };
}
