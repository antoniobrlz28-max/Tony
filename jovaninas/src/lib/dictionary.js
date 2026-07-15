// Glossary/term dictionary for Jovanina's app
// Provides definitions and pairing notes for food and wine terms

const TERMS = [
  // Pasta & Italian
  { term: "mafaldine", category: "pasta", definition: "Wide, ruffled-edge ribbon pasta; holds chunky sauces well." },
  { term: "tagliatelle", category: "pasta", definition: "Long, flat ribbon pasta, slightly narrower than pappardelle." },
  { term: "pappardelle", category: "pasta", definition: "Broad, flat pasta ribbons; pairs well with hearty ragù." },
  { term: "gnocchi", category: "pasta", definition: "Soft Italian dumplings, usually made from potato and flour." },
  { term: "mostarda", category: "condiment", definition: "Italian condiment of candied fruit in a mustard-flavored syrup." },
  { term: "agrodolce", category: "technique", definition: "Italian sweet-and-sour sauce or preparation." },
  { term: "gremolata", category: "condiment", definition: "Chopped herb condiment of lemon zest, garlic, and parsley." },
  // Wine
  { term: "nebbiolo", category: "grape", definition: "Noble red grape behind Barolo and Barbaresco; firm tannins, high acid." },
  { term: "sangiovese", category: "grape", definition: "Italy's most-planted red grape; backbone of Chianti and Brunello." },
  { term: "orange wine", category: "wine style", definition: "White grapes fermented with their skins; amber color, grippy tannin." },
  { term: "carafe", category: "wine service", definition: "A glass vessel used to serve a half-bottle (typically 375 ml) of wine." },
  { term: "tannin", category: "wine", definition: "Polyphenols from grape skins and seeds that give red wine its grip." },
  { term: "terroir", category: "wine", definition: "The complete natural environment in which a wine is produced." },
  // Cooking techniques
  { term: "braised", category: "technique", definition: "Long, slow cooking in a covered pot with a small amount of liquid." },
  { term: "confit", category: "technique", definition: "Slow-cooked and preserved in fat at low temperature." },
  { term: "brunoise", category: "knife cut", definition: "Very fine dice, approximately 2mm cubes." },
];

/**
 * Build the initial dictionary object keyed by normalized term.
 */
export function buildInitialDictionary() {
  const dict = {};
  for (const entry of TERMS) {
    dict[entry.term.toLowerCase()] = entry;
  }
  return dict;
}
