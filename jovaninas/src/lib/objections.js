import { detectTechniques, allergensForComponents } from "./components.js";
import { flavorProfile } from "./flavorProfile.js";
import { latestDishVersion } from "./menuOps.js";

// Ingredient/concept triggers a guest might raise as an objection, mapped
// to a plain-language guest line. Response text is assembled only from real
// technique/flavor data pulled off the actual dish — never invented facts
// like "tastes like lobster."
const INGREDIENT_TRIGGERS = [
  { keyword: "octopus", guestLine: "I don't think I like octopus." },
  { keyword: "mushroom", guestLine: "I'm not really a mushroom person." },
  { keyword: "liver", guestLine: "I've never liked liver." },
  { keyword: "anchovy", guestLine: "Isn't that going to taste too fishy?" },
  { keyword: "gorgonzola", guestLine: "I'm not a blue cheese fan." },
  { keyword: "radicchio", guestLine: "Isn't that going to be really bitter?" },
  { keyword: "rabbit", guestLine: "I've never had rabbit before." },
  { keyword: "lamb", guestLine: "I find lamb too gamey." },
  { keyword: "elk", guestLine: "Is game meat going to taste too strong?" },
  { keyword: "sweetbread", guestLine: "What exactly is a sweetbread? I'm nervous." },
];

function techniquePhrase(techniques) {
  if (techniques.length === 0) return null;
  return `prepared by ${techniques.slice(0, 2).join(" and ")}`;
}

function flavorReassurance(flavors) {
  const bits = [];
  if (flavors.includes("Crisp")) bits.push("finished with crisp, caramelized edges");
  if (flavors.includes("Smoky")) bits.push("a light smokiness from the fire rather than anything overpowering");
  if (flavors.includes("Bright")) bits.push("bright acidity that keeps it from tasting heavy or one-note");
  if (flavors.includes("Herbal")) bits.push("fresh herbs that lift it");
  if (flavors.includes("Slightly Sweet")) bits.push("a touch of natural sweetness that softens it");
  if (flavors.includes("Rich")) bits.push("a rich but balanced finish");
  return bits;
}

function buildIngredientResponse(dishVersion, dictionary) {
  const techniques = detectTechniques(`${dishVersion.displayName} ${dishVersion.description}`);
  const flavors = flavorProfile(dishVersion, dictionary);
  const parts = [];
  const tp = techniquePhrase(techniques);
  if (tp) parts.push(tp);
  parts.push(...flavorReassurance(flavors));
  const detail = parts.length ? parts.join(", with ") : "prepared carefully to keep the flavor approachable";
  return `I understand the hesitation. Our ${dishVersion.displayName.toLowerCase()} is ${detail} — a lot of guests who weren't sure end up enjoying it. If you'd rather not, I'm glad to point you toward something else on the menu.`;
}

function buildSpicyResponse(dishVersion) {
  return `Totally fair — the ${dishVersion.displayName.toLowerCase()} does have some heat in it. I can ask the kitchen to dial it back, or point you toward something on the menu without chile in it, whichever you'd prefer.`;
}

function buildUnfamiliarTermResponse(entry) {
  return `That's ${entry.guestFriendly || entry.definition} ${entry.origin ? `— it's traditional in ${entry.origin}.` : ""} Happy to bring a taste on the side first if you'd like to try it before committing.`;
}

function buildDietaryResponse(allergen, safeDishes) {
  const names = safeDishes.slice(0, 3).map((d) => d.displayName).join(", ");
  if (!names) {
    return `Let me check with the kitchen on ${allergen}-free options for you right now — I don't want to guess.`;
  }
  return `Good news — ${names} ${safeDishes.length > 1 ? "don't" : "doesn't"} have any ${allergen} in the current recipe. I'd still flag it to the kitchen to be safe, but those are good starting points.`;
}

function buildHeavyResponse(dishVersion, flavors) {
  const balance = flavorReassurance(flavors);
  if (balance.length) {
    return `It's a satisfying portion, but it's not one-note rich — there's ${balance.join(" and ")}, so it eats lighter than it sounds.`;
  }
  return `It's a heartier dish. If you're looking for something lighter tonight, I can point you toward a few options.`;
}

function activeDishVersions(data) {
  return Object.values(data.dishes)
    .filter((d) => d.status === "active")
    .map((d) => latestDishVersion(data, d.id))
    .filter(Boolean);
}

// Builds a pool of guest-objection scenarios grounded in the current active
// menu — ingredient hesitations, spice concerns, unfamiliar terms, dietary
// asks, and "is this heavy" questions.
export function generateObjectionScenarios(data) {
  const dishes = activeDishVersions(data);
  const scenarios = [];

  for (const trigger of INGREDIENT_TRIGGERS) {
    const dish = dishes.find((dv) => (dv.components || []).some((c) => c.normalized.includes(trigger.keyword)) || dv.displayName.toLowerCase().includes(trigger.keyword));
    if (!dish) continue;
    scenarios.push({
      id: `obj_ing_${trigger.keyword}`,
      guestLine: trigger.guestLine,
      dishName: dish.displayName,
      response: buildIngredientResponse(dish, data.dictionary),
      category: "ingredient hesitation",
    });
  }

  for (const dv of dishes) {
    const flavors = flavorProfile(dv, data.dictionary);
    if (flavors.includes("Spicy")) {
      scenarios.push({
        id: `obj_spicy_${dv.id}`,
        guestLine: `A guest asks if the ${dv.displayName.toLowerCase()} is very spicy.`,
        dishName: dv.displayName,
        response: buildSpicyResponse(dv),
        category: "spice concern",
      });
    }
    if (flavors.includes("Rich")) {
      scenarios.push({
        id: `obj_heavy_${dv.id}`,
        guestLine: `A guest asks if the ${dv.displayName.toLowerCase()} is too heavy before a big night out.`,
        dishName: dv.displayName,
        response: buildHeavyResponse(dv, flavors),
        category: "portion / richness",
      });
    }
  }

  const unfamiliarTerms = Object.values(data.dictionary).filter((e) => e.guestFriendly && !["wine", "cocktail", "amaro", "beer"].includes(e.category));
  for (const entry of unfamiliarTerms.slice(0, 8)) {
    scenarios.push({
      id: `obj_term_${entry.term}`,
      guestLine: `A guest asks, "What is ${entry.term}? I've never had it."`,
      dishName: null,
      response: buildUnfamiliarTermResponse(entry),
      category: "unfamiliar ingredient",
    });
  }

  for (const allergen of ["gluten", "dairy", "shellfish", "tree nuts"]) {
    const safeDishes = dishes.filter((dv) => !allergensForComponents(dv.components || []).includes(allergen));
    if (safeDishes.length === 0 && dishes.length === 0) continue;
    scenarios.push({
      id: `obj_diet_${allergen}`,
      guestLine: `A guest says they need to avoid ${allergen}. What do you recommend?`,
      dishName: null,
      response: buildDietaryResponse(allergen, safeDishes),
      category: "dietary restriction",
    });
  }

  return scenarios;
}
