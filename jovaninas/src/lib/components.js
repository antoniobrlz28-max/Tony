// Heuristic, dictionary-driven component/role extraction.
// This is deliberately rule-based rather than generative: every role and
// allergen tag traces back to a keyword match, so nothing is invented.

const ROLE_KEYWORDS = {
  protein: [
    "elk", "venison", "pork", "beef", "veal", "lamb", "chicken", "duck", "rabbit",
    "octopus", "squid", "calamari", "shrimp", "prawn", "scallop", "clam", "mussel",
    "lobster", "crab", "salmon", "tuna", "branzino", "halibut", "swordfish", "cod",
    "sausage", "meatball", "guanciale", "pancetta", "nduja", "'nduja", "salami",
    "prosciutto", "bresaola", "steak", "short rib", "oxtail", "tripe", "sweetbread",
  ],
  starch: [
    "pasta", "pappardelle", "mafaldine", "tagliatelle", "agnolotti", "gnocchi",
    "rigatoni", "orecchiette", "risotto", "polenta", "potato", "bread", "crostini",
    "focaccia", "farro", "rice", "spaghetti", "linguine", "bucatini", "gnudi",
    "cavatelli", "tortellini", "ravioli",
  ],
  cheese: [
    "parmesan", "parmigiano", "pecorino", "burrata", "stracciatella", "mozzarella",
    "ricotta", "mascarpone", "gorgonzola", "taleggio", "fontina", "provolone", "grana",
  ],
  sauce: [
    "ragù", "ragu", "bolognese", "romesco", "harissa", "aioli", "gremolata",
    "salsa verde", "pesto", "jus", "gravy", "vinaigrette", "brown butter",
    "beurre blanc", "reduction", "coulis", "purée", "puree", "sauce", "bagna",
    "cream sauce", "marinara", "pomodoro", "arrabbiata",
  ],
  vegetable: [
    "carrot", "fennel", "squash", "zucchini", "eggplant", "tomato", "pepper",
    "mushroom", "artichoke", "asparagus", "beet", "radicchio", "castelfranco",
    "arugula", "spinach", "kale", "chicory", "onion", "leek", "shallot", "garlic",
    "cauliflower", "broccoli", "pea", "corn", "cabbage",
  ],
  herb: [
    "basil", "parsley", "mint", "sage", "rosemary", "thyme", "oregano", "chive",
    "tarragon", "dill", "cilantro",
  ],
  spice: [
    "juniper", "chile", "chili", "calabrian", "pepper flake", "fennel pollen",
    "cumin", "coriander", "paprika", "saffron", "nutmeg", "cinnamon", "clove",
    "black pepper", "espelette",
  ],
  fat: [
    "butter", "olive oil", "brown butter", "lard", "duck fat", "cream",
  ],
  acid: [
    "lemon", "lime", "vinegar", "verjus", "citrus", "preserved lemon", "sherry vinegar",
  ],
  garnish: [
    "microgreen", "gremolata", "breadcrumb", "bread crumb", "chive", "pollen",
    "shaving", "zest", "crispy", "fried herb",
  ],
  fermented: [
    "black garlic", "miso", "kimchi", "fish sauce", "nduja", "'nduja", "cultured butter",
  ],
};

const TECHNIQUE_KEYWORDS = [
  "grilled", "charred", "roasted", "braised", "fried", "crispy", "cured", "poached",
  "seared", "smoked", "wood-fired", "ember-roasted", "confit", "raw", "marinated",
  "pickled", "torched", "blistered", "glazed", "stewed",
];

const ALLERGEN_KEYWORD_MAP = {
  gluten: [
    "pasta", "pappardelle", "mafaldine", "tagliatelle", "agnolotti", "gnocchi",
    "rigatoni", "orecchiette", "bread", "crostini", "focaccia", "breaded",
    "spaghetti", "linguine", "bucatini", "flour", "cavatelli", "tortellini", "ravioli",
    "beer", "malt",
  ],
  dairy: [
    "parmesan", "parmigiano", "pecorino", "burrata", "stracciatella", "mozzarella",
    "ricotta", "mascarpone", "gorgonzola", "taleggio", "fontina", "provolone",
    "butter", "cream", "milk", "cheese", "yogurt", "gelato",
  ],
  "tree nuts": [
    "hazelnut", "almond", "pistachio", "walnut", "pine nut", "romesco", "pesto",
    "cashew", "pecan", "chestnut",
  ],
  peanut: ["peanut"],
  shellfish: [
    "shrimp", "prawn", "scallop", "clam", "mussel", "lobster", "crab", "octopus",
    "squid", "calamari", "oyster",
  ],
  fish: ["anchovy", "bagna", "tuna", "branzino", "halibut", "swordfish", "cod", "salmon", "fish sauce"],
  egg: ["egg", "aioli", "mayonnaise", "carbonara", "agnolotti", "tagliatelle", "pappardelle"],
  soy: ["soy", "miso", "tamari"],
  sesame: ["sesame", "tahini"],
  sulfites: ["wine", "marsala", "vermouth"],
  alcohol: ["wine", "marsala", "vermouth", "amaro", "beer", "rum", "whiskey", "vodka", "gin", "liqueur"],
};

export function normalizeTerm(raw) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^(with|and|a|an|the)\s+/, "")
    .replace(/[.]$/, "");
}

// Splits a raw description into candidate component phrases.
export function splitDescription(description) {
  if (!description) return [];
  return description
    .split(/,|\/|•|\bwith\b|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function detectRole(normalized) {
  for (const [role, keywords] of Object.entries(ROLE_KEYWORDS)) {
    if (keywords.some((kw) => normalized.includes(kw))) return role;
  }
  return "unclassified";
}

function detectAllergens(normalized) {
  const found = [];
  for (const [allergen, keywords] of Object.entries(ALLERGEN_KEYWORD_MAP)) {
    if (keywords.some((kw) => normalized.includes(kw))) found.push(allergen);
  }
  return found;
}

export function detectTechniques(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return TECHNIQUE_KEYWORDS.filter((t) => lower.includes(t));
}

// Extract a component list (with role + allergen guesses) from a raw
// description, optionally cross-referencing the restaurant dictionary for
// richer, already-known terms.
export function extractComponents(description, dictionary = {}) {
  const phrases = splitDescription(description);
  return phrases.map((raw) => {
    const normalized = normalizeTerm(raw);
    const dictHit = dictionary[normalized];
    const role = detectRole(normalized);
    const allergens = dictHit?.allergens?.length ? dictHit.allergens : detectAllergens(normalized);
    return {
      raw,
      normalized,
      role,
      allergens,
      confidence: role === "unclassified" ? 0.4 : 0.75,
      source: dictHit ? "dictionary" : "inferred",
    };
  });
}

export function allergensForComponents(components) {
  const set = new Set();
  for (const c of components) for (const a of c.allergens || []) set.add(a);
  return Array.from(set);
}

export function mainIngredient(components) {
  return components.find((c) => c.role === "protein") || components[0] || null;
}
