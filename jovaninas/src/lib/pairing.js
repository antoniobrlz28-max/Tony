// Flavor-logic pairing suggestions. Restaurant-specific pairings should come
// from the current beverage menu (Library entries with category
// wine/cocktail/amaro/beer and a `pairingStyle` tag) — when none are
// present for a style, we fall back to a generic style description rather
// than inventing a specific bottle or brand.

const STYLE_LABELS = {
  "high-acid-white": "A high-acid white wine",
  "sparkling": "Something sparkling",
  "tannic-red": "A tannic, structured red",
  "light-red": "A lighter, low-tannin red",
  "off-dry-white": "An off-dry white",
  "bitter-aperitif": "A bitter aperitif",
  "bitter-digestif": "An amaro digestif",
  "earthy-red": "An earthy, savory red",
};

export function pairingStylesForDish(flavorTags, components) {
  const styles = [];
  const push = (style, reason) => styles.push({ style, reason });
  const roles = (components || []).map((c) => c.role);
  const names = (components || []).map((c) => c.normalized);

  if (flavorTags.includes("Crisp") && flavorTags.includes("Rich")) {
    push("high-acid-white", "The acidity cuts through fried richness and fat.");
  }
  if (flavorTags.includes("Spicy")) {
    push("off-dry-white", "A touch of sweetness balances the heat without fighting it.");
  }
  if (flavorTags.includes("Bright")) {
    push("sparkling", "Bright acidity in the dish plays well with sparkling wine's own lift.");
  }
  if (roles.includes("protein") && names.some((n) => ["elk", "venison", "beef", "lamb", "short rib", "oxtail"].some((p) => n.includes(p)))) {
    push("tannic-red", "Red meat and rendered fat call for a structured, tannic red to match the weight.");
  }
  if (flavorTags.includes("Umami") && !flavorTags.includes("Spicy")) {
    push("earthy-red", "Umami-forward sauces (mushroom, ragù) pair naturally with earthy, savory reds.");
  }
  if (flavorTags.includes("Bitter")) {
    push("bitter-aperitif", "Bitterness in the dish mirrors an aperitif's own bitter edge rather than clashing with it.");
  }
  if (flavorTags.includes("Slightly Sweet") && roles.includes("cheese")) {
    push("light-red", "A light, low-tannin red won't overpower the dish's sweeter, creamier notes.");
  }
  if (styles.length === 0) {
    push("high-acid-white", "A safe default: high acidity works with most Italian-leaning preparations.");
  }
  // de-dupe by style, keep first reason
  const seen = new Set();
  return styles.filter((s) => (seen.has(s.style) ? false : (seen.add(s.style), true))).slice(0, 3);
}

export function suggestPairings(dishVersion, flavorTags, dictionary = {}) {
  const styles = pairingStylesForDish(flavorTags, dishVersion.components || []);
  const beverages = Object.values(dictionary).filter((e) =>
    ["wine", "cocktail", "amaro", "beer"].includes(e.category)
  );

  return styles.map(({ style, reason }) => {
    const matches = beverages.filter((b) => (b.pairingStyle || []).includes(style));
    return {
      style,
      label: STYLE_LABELS[style] || style,
      reason,
      matches,
    };
  });
}
