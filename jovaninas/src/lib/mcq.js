import { allergensForComponents } from "./components.js";
import { latestDishVersion } from "./menuOps.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr, n) {
  return shuffle(arr).slice(0, n);
}

function activeDishVersions(data) {
  return Object.values(data.dishes)
    .filter((d) => d.status === "active")
    .map((d) => latestDishVersion(data, d.id))
    .filter(Boolean);
}

// Builds a pool of multiple-choice questions for the pre-shift quiz mode.
// Every question is generated from actual parsed/confirmed data — options
// are real dish names, real allergens, or real dictionary definitions.
export function generateMCQPool(data, dishId = null) {
  let dishes = activeDishVersions(data);
  if (dishId) dishes = dishes.filter((dv) => dv.dishId === dishId);
  const allDishes = activeDishVersions(data);
  const pool = [];

  for (const dv of dishes) {
    const components = dv.components || [];
    const distinctive = components.find(
      (c) => c.normalized.length > 2 && !allDishes.some((o) => o.id !== dv.id && (o.components || []).some((oc) => oc.normalized === c.normalized))
    );
    if (distinctive && allDishes.length >= 3) {
      const distractors = pick(allDishes.filter((o) => o.id !== dv.id), 2).map((o) => o.displayName);
      if (distractors.length === 2) {
        pool.push({
          id: `mcq_ing_${dv.id}`,
          question: `Which dish contains ${distinctive.normalized}?`,
          options: shuffle([dv.displayName, ...distractors]),
          answer: dv.displayName,
          explanation: `${dv.displayName} lists "${distinctive.normalized}" in its description.`,
          category: "ingredient-recall",
        });
      }
    }

    const allergens = allergensForComponents(components);
    if (allergens.length > 0 && allDishes.length >= 3) {
      const allergen = allergens[0];
      const safeDishes = allDishes.filter((o) => o.id !== dv.id && !allergensForComponents(o.components || []).includes(allergen));
      const distractors = pick(safeDishes, 2).map((o) => o.displayName);
      if (distractors.length === 2) {
        pool.push({
          id: `mcq_allergen_${dv.id}_${allergen}`,
          question: `Which of these dishes contains ${allergen}?`,
          options: shuffle([dv.displayName, ...distractors]),
          answer: dv.displayName,
          explanation: `${dv.displayName} contains a ${allergen}-associated ingredient. Always confirm with the kitchen before serving to a guest with allergies.`,
          category: "allergen-recall",
        });
      }
    }
  }

  const dictEntries = Object.values(data.dictionary).filter((e) => e.guestFriendly);
  for (const entry of dictEntries) {
    const distractors = pick(dictEntries.filter((e) => e.term !== entry.term), 2).map((e) => e.guestFriendly);
    if (distractors.length === 2) {
      pool.push({
        id: `mcq_term_${entry.term}`,
        question: `What is ${entry.term}?`,
        options: shuffle([entry.guestFriendly, ...distractors]),
        answer: entry.guestFriendly,
        explanation: entry.definition,
        category: "recognition",
      });
    }
  }

  return shuffle(pool);
}
