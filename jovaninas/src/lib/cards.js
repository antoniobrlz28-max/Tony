import { uid } from "./id.js";
import { newCardState } from "./srs.js";
import { allergensForComponents } from "./components.js";
import { oneLineDescription } from "./descriptions.js";

// Generates a set of candidate training cards for a dish version. Callers
// merge these into storage, skipping any (dishVersionId, question) pair
// that already exists so repeated generation is idempotent.
export function generateCardsForDish(dishVersion, dictionary = {}) {
  const cards = [];
  const push = (question, answer, category, difficulty = "medium") => {
    cards.push({
      id: uid("card"),
      dishVersionId: dishVersion.id,
      question,
      answer,
      category,
      difficulty,
      ...newCardState(),
    });
  };

  push(
    `Describe "${dishVersion.displayName}" in under 20 seconds.`,
    oneLineDescription(dishVersion),
    "description",
    "medium"
  );

  const components = dishVersion.components || [];
  if (components.length) {
    push(
      `Which ingredients are in "${dishVersion.displayName}"?`,
      components.map((c) => c.normalized).join(", "),
      "ingredient-recall",
      "easy"
    );
  }

  const allergens = allergensForComponents(components);
  push(
    `What allergens should you flag for "${dishVersion.displayName}"?`,
    allergens.length ? allergens.join(", ") : "None identified from the listed ingredients — confirm with the kitchen.",
    "allergen-recall",
    "hard"
  );

  for (const c of components) {
    const hit = dictionary[c.normalized];
    if (hit) {
      push(`What is ${c.normalized}?`, hit.guestFriendly || hit.definition, "recognition", "medium");
    }
  }

  return cards;
}
