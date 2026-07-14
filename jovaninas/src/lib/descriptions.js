// Deterministic description templates built only from parsed data
// (dish name + components). Nothing here invents ingredients or techniques
// that weren't present in the source text — per Rule 8, generated
// descriptions must remain accurate.

import { detectTechniques } from "./components.js";

function byRole(components, role) {
  return components.filter((c) => c.role === role).map((c) => c.normalized);
}

export function oneLineDescription(dish) {
  const parts = (dish.components || []).slice(0, 4).map((c) => c.normalized);
  return parts.length ? `${dish.displayName} — ${parts.join(", ")}` : dish.displayName;
}

export function literalDescription(dish) {
  return dish.description?.trim() || dish.displayName;
}

export function sensoryDescription(dish) {
  const techniques = detectTechniques(`${dish.displayName} ${dish.description || ""}`);
  const acid = byRole(dish.components || [], "acid");
  const herb = byRole(dish.components || [], "herb");
  const cheese = byRole(dish.components || [], "cheese");
  const bits = [];
  if (techniques.length) bits.push(techniques.slice(0, 2).join(" and "));
  if (acid.length) bits.push(`bright ${acid[0]} acidity`);
  if (herb.length) bits.push(`${herb.join(" and ")} aromatics`);
  if (cheese.length) bits.push(`a ${cheese[0]} finish`);
  if (!bits.length) return literalDescription(dish);
  return `${bits.join(", ")}.`.replace(/^./, (c) => c.toUpperCase());
}

export function guestFriendlyDescription(dish, dictionary = {}) {
  const parts = (dish.components || []).map((c) => {
    const hit = dictionary[c.normalized];
    return hit?.guestFriendly ? `${c.normalized} (${hit.guestFriendly})` : c.normalized;
  });
  if (!parts.length) return literalDescription(dish);
  return `${dish.displayName}, made with ${parts.join(", ")}.`;
}

export function elevatedDescription(dish) {
  const parts = (dish.components || []).slice(0, 5).map((c) => c.normalized);
  const techniques = detectTechniques(`${dish.displayName} ${dish.description || ""}`);
  const techPhrase = techniques.length ? `${techniques[0]} ` : "";
  return `${techPhrase}${dish.displayName}${parts.length ? `, featuring ${parts.join(", ")}` : ""}.`
    .replace(/^./, (c) => c.toUpperCase());
}

const PLAIN_ROLE_WORDS = {
  protein: "meat",
  cheese: "cheese",
  vegetable: "veggie",
  starch: "pasta or starch",
  sauce: "sauce",
  herb: "herbs",
  spice: "spice",
  garnish: "topping",
  acid: "a tangy touch",
  fat: "butter",
  fermented: "a savory kick",
};

export function kidDescription(dish, flavorTags = []) {
  const protein = (dish.components || []).find((c) => c.role === "protein");
  const subject = protein ? PLAIN_ROLE_WORDS.protein : dish.displayName.toLowerCase();
  const descriptors = [];
  if (flavorTags.includes("Crisp")) descriptors.push("crispy");
  if (flavorTags.includes("Slightly Sweet")) descriptors.push("a little sweet");
  if (flavorTags.includes("Spicy")) descriptors.push("a little spicy");
  if (flavorTags.includes("Rich")) descriptors.push("rich and filling");
  if (flavorTags.includes("Bitter")) descriptors.push("a bit grown-up tasting");
  const descPhrase = descriptors.length ? descriptors.slice(0, 2).join(" and ") + " " : "";
  return `It's ${descPhrase}${subject}${protein ? `, with ${protein.normalized}` : ""}.`.replace(/\s+/g, " ");
}

export function foodieDescription(dish, dictionary = {}) {
  const parts = (dish.components || []).slice(0, 5).map((c) => c.normalized);
  const techniques = detectTechniques(`${dish.displayName} ${dish.description || ""}`);
  const originHit = (dish.components || []).map((c) => dictionary[c.normalized]).find((e) => e?.origin);
  const bits = [];
  if (techniques.length) bits.push(techniques.slice(0, 2).join(" and "));
  if (originHit) bits.push(`nodding to ${originHit.origin}`);
  const tail = bits.length ? ` — ${bits.join(", ")}` : "";
  return `${dish.displayName}${parts.length ? `: ${parts.join(", ")}` : ""}${tail}.`;
}

// audience: 'professional' | 'guest' | 'kid' | 'foodie'
export function audienceDescription(dish, audience, dictionary = {}, flavorTags = []) {
  switch (audience) {
    case "guest": return guestFriendlyDescription(dish, dictionary);
    case "kid": return kidDescription(dish, flavorTags);
    case "foodie": return foodieDescription(dish, dictionary);
    case "professional":
    default: return elevatedDescription(dish);
  }
}

export function allDescriptions(dish, dictionary = {}) {
  return {
    literal: literalDescription(dish),
    oneLine: oneLineDescription(dish),
    sensory: sensoryDescription(dish),
    guestFriendly: guestFriendlyDescription(dish, dictionary),
    elevated: elevatedDescription(dish),
  };
}

export function likelyGuestQuestions(dish, dictionary = {}) {
  const questions = [];
  for (const c of dish.components || []) {
    const hit = dictionary[c.normalized];
    if (hit) questions.push(`What is ${c.normalized}?`);
    if ((c.allergens || []).includes("tree nuts")) questions.push(`Does this dish contain nuts?`);
    if ((c.allergens || []).includes("gluten")) questions.push(`Is this dish gluten-free?`);
    if ((c.allergens || []).includes("dairy")) questions.push(`Is this dish dairy-free?`);
    if ((c.allergens || []).includes("shellfish")) questions.push(`Does this contain shellfish?`);
  }
  const techniques = detectTechniques(`${dish.displayName} ${dish.description || ""}`);
  if (techniques.includes("fried") || techniques.includes("crispy")) {
    questions.push("Is this heavy or fried?");
  }
  return Array.from(new Set(questions)).slice(0, 6);
}
