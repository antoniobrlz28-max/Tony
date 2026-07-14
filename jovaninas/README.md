# Jovanina's Menu Intelligence Engine

A restaurant knowledge system, not a menu scanner. The core loop:

> Scan → compare → confirm → understand → practice → remember.

Client-side only (React + `localStorage`, no backend). Built as a separate
project inside this repo — it does not touch the existing `Tony` file
(the personal finance tracker) at the repo root.

Visual design is a clean, modern light UI matched directly to Jovanina's
reference mockups: white/near-white surfaces, soft shadows instead of
borders, underline tabs, solid rounded badges, navy ink (#1e2a44) with red
(#c0392b) as the primary-action accent, Playfair Display + Libre
Baskerville type, the restaurant's actual portrait mark in the top-left
corner, and a phone-width shell with a bottom nav (Brief / Scan / My Menus
/ Learn / Glossary / More) whose active tab gets a colored highlight behind
the icon.

## Master / read-only access

The topbar lock icon gates every write action (scanning menus, confirming
changes, 86'ing dishes, editing covers/events, adding notes, editing the
library) behind a device-level PIN — set one from the lock icon, and it
hashes with SHA-256 (Web Crypto) rather than storing it in plain text.
Anyone using the device without unlocking can browse, search, and study
(Learn) but can't change anything.

**Important scope note:** this only locks *one shared device* — it does
not sync a master's edits to other people's own phones, because there's no
backend. If you need "I edit on my phone, staff see it read-only on
theirs," that requires a real hosted database (Supabase is the recommended
path — free tier, realtime sync, built-in auth) plus a manager login. The
permission *logic* here (isMaster gating) is written to carry over once
that's wired up; only the storage layer underneath would change.

## What's implemented

**Capture → compare → confirm**
- Scanning has no form to fill out first — Jovanina's is dinner-only, so
  there's no menu-type/date picker blocking the way; choosing a PDF (or
  photo, or pasted text) extracts immediately.
- **Upload a PDF menu** and its embedded text is read straight out of the
  file client-side (Mozilla's pdf.js, loaded at runtime from a CDN — no
  OCR/vision API, no upload to a server). Works for anything exported with
  real text (Word, Canva, Google Docs...); a flat scan of a printed page
  has no text layer to read, so those fall back to photo/paste. The parser
  is built around Jovanina's actual two-line-per-dish layout (the dish
  name on its own line, then the ingredient list + price on the next —
  "HOUSEMADE FOCACCIA" / "Whipped Ricotta + Lavender Honey  14"): the
  **item name is always the dish title line**, never the ingredient
  description, and a category header ("Starters", "Handmade Fresh
  Pasta"...) is only recognized by an exact match against a known list of
  section titles — not by capitalization or a loose keyword match — since
  real dish names ("La Scala Salad", "Oak Ember Roasted Rainbow Carrots")
  routinely contain the same words a naive keyword match would key off of.
  Ingredient lists are split on this menu's actual separator ("+", as well
  as commas/"&"/"with"/"and") into individual components. It also
  recognizes a "No. 248"-style print/archive number (common in the corner
  of a printed menu) as menu metadata rather than a dish — kept as
  `menu.menuNumber` and shown next to the version/date in Current Menu and
  History rather than silently discarded — and treats a glued-digit
  surcharge note like "Gluten Free Crust +6" as an add-on, not a dish
  price.
- **Multi-column pages** (a hand-designed one-pager that lays out, say,
  Starters and Sweet side by side, sharing the same vertical space) are a
  real challenge for text-position-only extraction: reading strictly by
  height on the page welds unrelated columns' text into one line wherever
  they happen to sit at the same height. This was verified and fixed
  directly against Jovanina's actual multi-column dinner menu PDF: a wide
  horizontal gap (much wider than a normal name → price gap) now forces a
  line break instead of just adding space, and known section headers
  (Starters, Handmade Fresh Pasta, Cocktails, Wines by the Glass...) are
  used as column anchors — their x-positions are clustered into bands, and
  each column is read fully top-to-bottom before moving to the next one,
  left to right, instead of row-by-row across the whole page. This isn't
  guaranteed perfect on every hand-designed layout (two adjacent dishes can
  still occasionally share a title if there's no gap or header between
  them), which is exactly why the extraction preview stays fully editable
  before saving — but it fixes the large majority of cross-column mixing,
  verified line-by-line against the real file.
- **Drinks** (cocktails, wine, beer) are recognized by their own header
  list (Cocktails, Wines by the Glass, Bottled Beer, Draft Beer...)
  alongside the food headers, in the same pass — captured as their own
  list (`menu.drinkSections`), not mixed into the dish list. Unlike
  dishes, drinks aren't versioned/diffed across menus (no change-tracking,
  no dish-page wiki entry) — just what was on that specific upload,
  reviewable in the Scan preview and visible under My Menus → Drinks.
- **Category headers are also recognized by red print color**, not just
  the static phrase list — Jovanina's menus mark every category header in
  red ink, so `pdfExtract.js` walks the page's drawing operations
  alongside its text to find red, title-shaped text that isn't already a
  known header (excluding the red "Jovanina's" signature specifically) and
  treats it as a header too, both for splitting sections and for
  column-anchoring on a multi-column page. This is a genuinely best-effort
  layer: pdf.js doesn't expose color through its normal text API, so this
  separately correlates two lower-level data sources by position and bails
  out safely (falls back to the phrase list alone) if that correlation
  doesn't line up — it could not be exercised against a real browser in
  this sandbox, only unit-tested with synthetic input, so treat it as
  experimental until confirmed against a live upload.
- **Menu-specific add-on scope** (e.g. "Add Charcuterie" and "Gluten Free
  Crust" apply only to pizzas; "Gluten Free Pasta" only to Elk Bolognese
  and the Trapanese pesto pasta) is encoded directly in `lib/addOns.js`
  from what the restaurant told us, rather than guessed from the PDF's
  surcharge notes — shown as reference pills next to the section header or
  specific dish it actually applies to.
- The original PDF (or photo) is kept on the menu record and viewable from
  Current Menu and History ("Original PDF" / "View original PDF"), so you
  can always confirm exactly what was uploaded.
- Photo capture for the archive, or paste/type text directly, both feeding
  the same heuristic extraction into sections/dishes, editable before
  saving.
- Version comparison (exact / fuzzy-name / ingredient-overlap matching)
  against the last confirmed menu of the same type — plain-language change
  explanations, confidence scores, culinary/service/training-priority
  ratings.
- Uncertain matches (renames, evolved dishes) are flagged `needs_review`
  with "same dish / not the same dish" actions rather than auto-resolved.

**Shift Brief** (the opening screen)
- New/changed/removed/price-change counts as a clickable, collapsible
  change log that leads straight to the specific change — not a fixed
  four-number readout. Tonight's covers/chef updates/wine-features
  tracking is built (`lib/shiftBrief.js`) but not shown on this screen for
  now, per current product direction; re-enabling it later is a render
  change, not a rebuild.
- A **preservice pop-up** on every menu upload asks the three things that
  change nightly and aren't printed on the menu — today's focaccia
  flavor, where tonight's oysters are from, today's gelato/sorbet flavors
  — saved with that menu and shown at the top of Current Menu.
- 86'd items (toggle any dish out for the night) default to **temporary**;
  master can separately mark one **permanent** after reviewing with the
  chef, rather than every 86 being treated the same.
- **"Since your last shift"**: remembers when you last opened the app and
  surfaces only what changed since then, so nobody has to ask a coworker
  what's different.

**Dish & ingredient wiki**
- Dish pages: Overview / Components / Pairings / Guest Q&A / Photos /
  Training / History tabs. Components link to their own ingredient wiki
  page (origin, pronunciation, current vs. past dishes it's appeared in,
  chef notes, guest questions logged from the floor).
- **Ingredient terms are clickable everywhere they appear** (Current Menu,
  a dish's own page) — tapping one opens a quick popup with its
  definition, allergens, and pronunciation without leaving the screen
  you're on; the fuller wiki page (with notes and full history) is still
  one more tap away via Library/Search.
- Every dish also gets a **20-words-or-less "picture" description**
  (name + technique + real components only, hard word-capped, nothing
  invented) alongside its raw name/ingredients/price, so you get a quick
  sense of the dish without reading the full menu line.
- "Explain like I'm a..." — Professional / Guest / Kid / Foodie phrasings
  generated from the same parsed data, not separately invented facts.
- Flavor-profile tags and flavor-logic **pairing suggestions**
  (wine/cocktail/amaro), matched against Library beverage entries when
  present, otherwise a generic style so nothing restaurant-specific is
  fabricated.
- Photo timeline per dish (upload + caption + date).

**Learn** — currently surfaces two modes, by design: **flashcards** (tap
"Generate flashcards" for a shuffled batch of 10 real, menu-derived cards
with a flip animation and the answer highlighted; grading feeds the SRS
scheduler same as before, no "due today"/urgency framing) and
**pronunciation** practice with an **Italian accent** (browser
text-to-speech, `lang="it-IT"` + an installed Italian system voice when
available — each dictionary term is tagged with the language of the word
actually being read, so English descriptive terms like "black garlic" stay
in English). A multiple-choice **pre-shift quiz**, an **objection
trainer**, and a **guest recommendation engine** are fully built
(`lib/mcq.js`, `lib/objections.js`, `lib/recommend.js`, plus their Learn.jsx
mode components) but intentionally not in the tab bar right now — re-adding
them later is one line in `MODES`.

**Change review, practically**
- Each change card leads with what matters: an allergen-change warning
  badge only when a change actually touches an allergen ("tell your
  team"), and a "Study this dish" action only when the change is
  culinarily significant enough to be worth learning — replacing the raw
  "Confidence 85% · Training: This week" / "Service: Medium" internal
  scoring that used to show on every card regardless of whether it meant
  anything actionable.
- All dollar amounts render in the brand's green (`--forest`) throughout
  the app, including the specific before/after prices highlighted inside a
  price-change explanation and the price embedded in a change card's
  Previous/Current audit lines.

**Glossary (formerly "Library"), Search, More**
- Culinary dictionary with pronunciation guides; every term has its own
  wiki page. Cards are collapsed by default (tap to reveal the definition,
  origin, allergens) and the "inferred" status badge is hidden — a term
  that's still a stub reads clean, not cluttered.
- **The Glossary grows on its own.** Every ingredient parsed out of an
  uploaded menu is permanently added as a dictionary entry the moment the
  menu is confirmed (tagged "inferred" until someone fills in the real
  write-up) — nothing you upload is ever parsed and then forgotten; it
  becomes part of the restaurant's permanent knowledge base right away. An
  existing researched/chef-confirmed entry is never overwritten by this.
- Allergen detection tags **specific nut types** (almond, hazelnut,
  pistachio...) individually instead of one generic "tree nuts" bucket
  (falling back to the generic tag only when a preparation is nutty by
  tradition — romesco, pesto — without naming which nut), plus an
  **Allium** category (onion, garlic, shallot, leek...).
- My Menus' allergen filter is **auto-generated from what's actually on
  the current menu** (behind a filter icon) instead of a fixed always-shown
  list — no "sesame" filter cluttering a menu with no sesame in it.
- Natural-language-ish search across dishes/ingredients/notes.
- Cross-dish notes feed, local data export/import/reset, a profile name,
  and a **Roadmap** tab listing what's deliberately deferred (see below).

See `src/lib/` for the underlying logic (parsing, diffing, component
extraction, flavor tagging, pairing logic, MCQ/objection/recommendation
generation, spaced repetition) — all pure functions, independent of React.

## Known limitations (by design)

- **No OCR/vision API.** PDF text extraction only works when the PDF has a
  real text layer; a scanned/flat-image PDF or a photo isn't auto-transcribed
  — paste or type the menu text instead in that case.
- **A hand-designed, multi-column page can still occasionally mix up two
  adjacent dishes/drinks** — the column-splitting described above handles
  the large majority of cases (verified against a real multi-column menu),
  but two items sitting right next to each other with no header and no
  real gap between them can still land in one entry. This is a genuine
  limit of extracting structure from text position alone, without a
  vision/layout model — always check the extraction preview before saving,
  especially on a page that mixes food with cocktails/wine/beer.
- **No live LLM.** Descriptions, pairings, objections, and recommendations
  are generated from rules + a seed dictionary, not a model call — per the
  product's own rule, generated text must stay traceable to actual parsed
  input, never invented.
- **Single-device, local-storage only.** The master PIN lock works today,
  but only on one shared device — no accounts, no backend, no true
  multi-phone sync yet (see above). "Ask Chef" (open conversational Q&A),
  search-by-photo, live sync across every phone, chef voice notes, and a
  knowledge-score/AI-coach layer are real parts of the bigger vision but are
  intentionally left out rather than faked — they need a backend and/or a
  live LLM/vision API. See the **Roadmap** tab under More in the app.
- **localStorage has a real size ceiling** (commonly 5–10MB per browser).
  Original PDFs/photos are the biggest consumers of that budget — if you
  attach several ~1MB PDFs, you may hit the limit. This no longer fails
  silently: a save failure now shows a dismissible banner explaining what
  happened (and that the fix is exporting a backup and/or trimming older
  attachments from More → Settings), instead of quietly losing your last
  change.

## Running it

```bash
npm install
npm run dev
```

> This sandbox's network policy blocks `registry.npmjs.org`, so `npm
> install` could not be run/verified in this session. The code was
> validated with `tsc --noEmit` (syntax, zero errors) and standalone Node
> smoke tests exercising `src/lib/*` directly — the full parse → diff →
> commit pipeline (including the "elk bolognese" change-detection example
> from the product spec), the split-into-new-dish flow, SRS scheduling,
> flavor-tag generation, pairing suggestions, MCQ quiz generation, objection
> scenarios, guest recommendations, the dish/ingredient wiki
> cross-referencing, and the PDF line-reconstruction logic (grouping text
> items into lines by position, tested directly — the actual pdf.js CDN
> fetch could not be exercised end-to-end here since it only runs in a real
> browser). Run `npm install && npm run dev` locally to try the UI — fonts
> (Playfair Display + Libre Baskerville via Google Fonts) and pdf.js (via
> jsDelivr) load from CDNs at runtime and weren't reachable from this
> sandbox either, so double-check both render/work as expected, especially
> a real PDF upload end to end.

From the empty Brief screen you can click **Load sample data** to seed two
versions of a demo Dinner menu and see the full change-detection flow
without typing anything in.
