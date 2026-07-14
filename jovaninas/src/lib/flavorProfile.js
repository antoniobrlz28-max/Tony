import { detectTechniques } from "./components.js";

const SWEET_TERMS = ["mostarda", "saba", "honey", "fig", "apple", "squash", "carrot", "black garlic", "marsala"];
const BITTER_TERMS = ["radicchio", "arugula", "castelfranco", "chicory", "amaro", "espresso"];
const CREAMY_TERMS = ["burrata", "stracciatella", "mascarpone", "cream", "ricotta", "butter"];
const SMOKY_TECHNIQUES = ["smoked", "charred", "wood-fired", "grilled", "ember-roasted"];
const CRISP_TECHNIQUES = ["fried", "crispy", "breaded"];

// Heuristic flavor-tag scoring built only from parsed components/techniques —
// used for the "Flavor Profile" pill row on a dish page.
export function flavorProfile(dishVersion, dictionary = {}) {
  const components = dishVersion.components || [];
  const techniques = detectTechniques(`${dishVersion.displayName} ${dishVersion.description || ""}`);
  const names = components.map((c) => c.normalized);
  const scores = {};
  const bump = (tag, n = 1) => { scores[tag] = (scores[tag] || 0) + n; };

  const isCrisp = CRISP_TECHNIQUES.some((t) => techniques.includes(t));
  if (components.some((c) => c.role === "fat") || CREAMY_TERMS.some((t) => names.some((n) => n.includes(t))) || isCrisp) bump("Rich", isCrisp ? 1 : 2);
  if (components.some((c) => c.role === "protein")) bump("Savory", 2);
  if (isCrisp) bump("Crisp", 2);
  if (components.some((c) => c.role === "acid")) bump("Bright", 2);
  if (SWEET_TERMS.some((t) => names.some((n) => n.includes(t)))) bump("Slightly Sweet", 1);
  if (BITTER_TERMS.some((t) => names.some((n) => n.includes(t)))) bump("Bitter", 1);
  if (components.some((c) => c.role === "cheese") || names.some((n) => n.includes("mushroom") || n.includes("anchovy"))) bump("Umami", 1);
  if (components.some((c) => c.role === "spice" && (c.normalized.includes("chile") || c.normalized.includes("chili")))) bump("Spicy", 2);
  if (SMOKY_TECHNIQUES.some((t) => techniques.includes(t))) bump("Smoky", 1);
  if (components.some((c) => c.role === "herb")) bump("Herbal", 1);
  if (CREAMY_TERMS.some((t) => names.some((n) => n.includes(t)))) bump("Creamy", 1);

  for (const c of components) {
    const hit = dictionary[c.normalized];
    if (hit?.flavor) {
      for (const f of hit.flavor) {
        if (/sweet/.test(f)) bump("Slightly Sweet");
        if (/bitter/.test(f)) bump("Bitter");
        if (/hot|spicy/.test(f)) bump("Spicy");
        if (/smoky/.test(f)) bump("Smoky");
        if (/rich|creamy/.test(f)) bump("Rich");
        if (/bright|acid/.test(f)) bump("Bright");
      }
    }
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);
}
