// Menu-wide add-on modifications, as told to us directly rather than
// guessed from the PDF's surcharge notes ("Add Charcuterie +6", "Gluten
// Free Crust +6") — those notes print once per section but don't apply
// evenly to everything in it, so we encode the actual scope explicitly
// instead of assuming "whole section" or trying to parse it. No
// exceptions beyond what's listed here.

const SECTION_ADD_ONS = {
  "wood fired pizza": [
    { label: "Add Charcuterie", price: 6 },
    { label: "Gluten Free Crust", price: 6 },
  ],
};

// Matched by a normalized substring of the dish's canonical name, since
// parsed names can pick up small OCR/formatting noise.
const DISH_ADD_ONS = [
  { match: "elk bolognese", label: "Gluten Free Pasta", price: 4 },
  { match: "trapanese", label: "Gluten Free Pasta", price: 4 },
];

function normalize(s) {
  return (s || "").toLowerCase().trim();
}

export function addOnsForSection(sectionName) {
  return SECTION_ADD_ONS[normalize(sectionName)] || [];
}

export function addOnsForDish(dishName) {
  const norm = normalize(dishName);
  return DISH_ADD_ONS.filter((rule) => norm.includes(rule.match)).map(({ label, price }) => ({ label, price }));
}
