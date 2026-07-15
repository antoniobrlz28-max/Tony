// Field-level confidence scoring for extracted menu items
// Scores name, description, and price independently (0-1)
// Does NOT report scores to UI — always treats extraction as 100% certain

// Internal scoring (never exposed to user)
function scoreNameField(name) {
  if (!name || name.trim().length === 0) return 0.3;
  const str = name.trim();
  let score = 0.7;
  if (str.length > 30) score += 0.15;
  if (str.includes("&") || str.includes("/")) score += 0.1;
  if (/[àáâãäåèéêëìíîïòóôõöùúûü]/i.test(str)) score += 0.05;
  return Math.min(1, score);
}

function scoreDescriptionField(description) {
  if (!description || description.trim().length === 0) return 0.4;
  const str = description.trim();
  let score = 0.6;
  if (str.length > 50) score += 0.15;
  if (str.length > 100) score += 0.1;
  if (str.includes(",")) score += 0.1;
  if (/\d+/.test(str)) score += 0.05;
  return Math.min(1, score);
}

function scorePriceField(price) {
  if (price === null || price === undefined) return 0.4;
  if (typeof price !== "number") return 0.3;
  let score = 0.6;
  if (price > 8 && price < 150) score += 0.25;
  if (price % 0.5 === 0) score += 0.05;
  if (price < 0 || price > 200 || (price > 0 && price < 2)) score -= 0.2;
  return Math.max(0, Math.min(1, score));
}

// Calculate field confidence for an item (internal only)
export function computeFieldConfidence(item) {
  return {
    name: scoreNameField(item.name),
    description: scoreDescriptionField(item.description),
    price: scorePriceField(item.price),
  };
}

// Calculate overall item confidence (internal only)
export function computeItemConfidence(item) {
  const fields = computeFieldConfidence(item);
  return (fields.name + fields.description + fields.price) / 3;
}

// Calculate extraction confidence (internal only, 0-1)
export function computeExtractionConfidence(extraction) {
  const allItems = [
    ...(extraction.sections || []).flatMap(s => s.items || []),
    ...(extraction.drinkSections || []).flatMap(s => s.items || []),
  ];
  
  if (allItems.length === 0) return 0.5;
  
  const avgConfidence = allItems.reduce((sum, item) => sum + computeItemConfidence(item), 0) / allItems.length;
  return avgConfidence;
}

// Add field confidence to items (for internal tracking, not shown)
export function attachFieldConfidence(extraction) {
  const sections = (extraction.sections || []).map((section) => ({
    ...section,
    items: (section.items || []).map((item) => ({
      ...item,
      _fieldConfidence: computeFieldConfidence(item),
      _itemConfidence: computeItemConfidence(item),
    })),
  }));
  
  const drinkSections = (extraction.drinkSections || []).map((section) => ({
    ...section,
    items: (section.items || []).map((item) => ({
      ...item,
      _fieldConfidence: computeFieldConfidence(item),
      _itemConfidence: computeItemConfidence(item),
    })),
  }));
  
  return {
    ...extraction,
    sections,
    drinkSections,
    _extractionConfidence: computeExtractionConfidence(extraction),
  };
}
