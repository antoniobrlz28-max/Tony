import { flavorProfile } from "./flavorProfile.js";
import { suggestPairings } from "./pairing.js";
import { latestDishVersion } from "./menuOps.js";

const STARTER_KEYWORDS = ["starter", "appetizer", "antipasti", "snack", "raw bar"];
const DESSERT_KEYWORDS = ["dessert", "dolci", "sweet"];

function activeDishVersions(data) {
  return Object.values(data.dishes)
    .filter((d) => d.status === "active")
    .map((d) => latestDishVersion(data, d.id))
    .filter(Boolean);
}

function isSection(name, keywords) {
  const lower = (name || "").toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

// preferences: { protein, avoidSpicy, richness ('rich'|'light'|null), excludeIngredients: string[] }
export function recommendDishes(data, preferences) {
  const dishes = activeDishVersions(data);
  const excluded = (preferences.excludeIngredients || []).map((s) => s.trim().toLowerCase()).filter(Boolean);

  const scored = [];
  for (const dv of dishes) {
    const components = dv.components || [];
    const names = components.map((c) => c.normalized);
    if (excluded.some((ex) => names.some((n) => n.includes(ex)) || dv.displayName.toLowerCase().includes(ex))) continue;

    const flavors = flavorProfile(dv, data.dictionary);
    const reasons = [];
    let score = 0;

    if (preferences.protein) {
      const hit = components.find((c) => c.role === "protein" && c.normalized.includes(preferences.protein.toLowerCase()));
      if (hit) { score += 3; reasons.push(`Main protein matches "${preferences.protein}"`); }
      else if (preferences.protein.toLowerCase() === "vegetarian" && !components.some((c) => c.role === "protein")) {
        score += 3; reasons.push("No listed protein — likely vegetarian, confirm with kitchen");
      }
    }

    if (preferences.avoidSpicy) {
      if (flavors.includes("Spicy")) { score -= 6; reasons.push("Has heat — guest wanted to avoid spice"); }
      else { score += 1; }
    }

    if (preferences.richness === "rich" && flavors.includes("Rich")) { score += 2; reasons.push("Rich, satisfying profile"); }
    if (preferences.richness === "light" && (flavors.includes("Bright") || !flavors.includes("Rich"))) { score += 2; reasons.push("Lighter, brighter profile"); }

    scored.push({ dishVersion: dv, flavors, score, reasons });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3).map((s) => ({
    ...s,
    confidence: s.score >= 4 ? "High" : s.score >= 1 ? "Medium" : "Low",
  }));

  const best = top[0];
  let suggestedWine = [];
  if (best) suggestedWine = suggestPairings(best.dishVersion, best.flavors, data.dictionary);

  const starterCandidates = dishes.filter((dv) => isSection(dv.section, STARTER_KEYWORDS) && dv.id !== best?.dishVersion.id);
  const dessertCandidates = dishes.filter((dv) => isSection(dv.section, DESSERT_KEYWORDS));

  const upsellAppetizer = starterCandidates.find((dv) => {
    const f = flavorProfile(dv, data.dictionary);
    return f.includes("Bright") || f.includes("Herbal");
  }) || starterCandidates[0] || null;

  const suggestedDessert = dessertCandidates[0] || null;

  return { recommendations: top, suggestedWine, upsellAppetizer, suggestedDessert };
}
