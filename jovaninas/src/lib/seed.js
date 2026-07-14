import { parseMenuText } from "./parseMenu.js";
import { commitMenu } from "./menuOps.js";
import { uid } from "./id.js";

const DINNER_V1 = `PASTA
Elk Bolognese — elk, tomato, rosemary, pappardelle, parmesan $27
Agnolotti del Plin — roasted chicken, brown butter, sage $24

ENTREES
Pork Milanese — fennel, apple mostarda, arugula, parmesan $34
Wood-Fired Half Chicken — salsa verde, charred lemon $32

STARTERS
Burrata — castelfranco, saba, olive oil $18
Crispy Octopus — romesco, potato $19`;

const DINNER_V2 = `PASTA
Elk Bolognese — elk, pork, tomato, juniper, mafaldine, parmesan $29
Agnolotti del Plin — roasted chicken, brown butter, sage $24

ENTREES
Pork Milanese — fennel, apple mostarda, arugula, parmesan $36
Ember-Roasted Half Chicken — salsa verde, charred lemon, black garlic $34

STARTERS
Burrata — castelfranco, saba, hazelnut, olive oil $19
Squash Blossom Pizza — squash blossom, ricotta, preserved lemon, chile $21`;

// Seeds two versions of a demo Dinner menu so the app is explorable
// immediately, mirroring the elk bolognese example from the product spec.
export function seedSampleData(update) {
  update((draft) => {
    const meta1 = {
      menuId: uid("menu"),
      menuType: "Dinner",
      mealPeriod: "Dinner service",
      effectiveDate: "2026-05-01",
      photos: [],
      rawText: DINNER_V1,
    };
    commitMenu(draft, parseMenuText(DINNER_V1), meta1);

    const meta2 = {
      menuId: uid("menu"),
      menuType: "Dinner",
      mealPeriod: "Dinner service",
      effectiveDate: "2026-07-01",
      photos: [],
      rawText: DINNER_V2,
    };
    commitMenu(draft, parseMenuText(DINNER_V2), meta2);
  });
}
