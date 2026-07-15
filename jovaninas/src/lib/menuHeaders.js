// Known section-header phrases, split by which "track" they belong to.
// A real Jovanina's menu page often lays out food, cocktails, and wine/beer
// as separate columns that share the same vertical space — pdfExtract.js
// uses this list (keyed by track) to tell food content apart from drinks
// content when untangling a multi-column page. parseMenu.js uses the food
// list alone to find section breaks within already-separated food text.
//
// Matching is always exact-phrase (after normalization), never substring —
// real dish/drink names routinely contain these same words ("La Scala
// Salad", "Wheatley Vodka"), so a loose match would misfire.

export const FOOD_HEADERS = new Set([
  "starters", "antipasti", "antipasto", "appetizers", "appetizer",
  "raw bar", "raw and chilled", "raw roasted and grilled", "salads", "soups",
  "wood fired pizza", "pizza", "pizzas",
  "handmade fresh pasta", "fresh pasta", "handmade pasta", "pasta",
  "main plates", "mains", "main", "entrees", "entree",
  "sweet", "sweets", "dolce", "dessert", "desserts",
  "sides", "side dishes",
  "brunch", "lunch", "dinner", "specials", "happy hour",
  "small plates", "large plates", "snacks", "shareables", "bar menu",
]);

export const DRINK_HEADERS = new Set([
  "cocktails", "cocktail", "spritzes", "summer spritzes",
  "wines by the glass", "wine list", "wine", "wines",
  "bottled beer", "draft beer", "beer", "beers",
  "sparkling", "still rose", "white", "red", "n/a beverages",
  "non-alcoholic", "amaro", "amari", "digestivo", "digestivi",
]);

// The subset of DRINK_HEADERS that names a wine section specifically, so
// the app can present "Menu, Drink menu, Wine menu" as three adjacent,
// distinct tabs instead of lumping wine in with cocktails/beer under one
// generic Drinks tab.
export const WINE_HEADERS = new Set([
  "wines by the glass", "wine list", "wine", "wines",
  "sparkling", "still rose", "white", "red",
]);

export function isWineHeaderName(name) {
  return WINE_HEADERS.has(normalizeHeaderText(name || ""));
}

export function normalizeHeaderText(line) {
  return line
    .toLowerCase()
    .replace(/\*+$/, "")
    .replace(/[.,]/g, "")
    .replace(/&/g, "and")
    .replace(/:$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function headerTrack(line) {
  const norm = normalizeHeaderText(line.trim());
  if (!norm) return null;
  if (FOOD_HEADERS.has(norm)) return "food";
  if (DRINK_HEADERS.has(norm)) return "drinks";
  return null;
}
