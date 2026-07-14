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
Baskerville type, an original stylized mark inspired by the storefront/menu
portrait logo, and a phone-width shell with a bottom nav (Brief / Scan / My
Menus / Learn / Library / More) whose active tab gets a colored highlight
behind the icon.

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
- Tonight's covers, chef updates, new/changed/removed/price-change counts,
  86'd items (toggle any dish out for the night), a special-event line, and
  your flashcard review queue with an estimated review time.
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

**Learn** — five modes: SRS **flashcards**, a multiple-choice **pre-shift
quiz** (distractors generated from real dish/ingredient data),
**pronunciation** practice with an **Italian accent** (browser text-to-speech,
`lang="it-IT"` + an installed Italian system voice when available — each
dictionary term is tagged with the language of the word actually being
read, so English descriptive terms like "black garlic" stay in English),
an **objection trainer** (guest pushback scenarios with responses grounded
in the dish's actual technique/flavor data), and a **guest recommendation
engine** (chip-based preferences in → ranked dishes, wine pairing, upsell
appetizer/dessert out).

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

**Library, Search, More**
- Culinary dictionary with pronunciation guides and category filters; every
  term has its own wiki page.
- **The Library grows on its own.** Every ingredient parsed out of an
  uploaded menu is permanently added as a dictionary entry the moment the
  menu is confirmed (tagged "inferred" until someone fills in the real
  write-up) — nothing you upload is ever parsed and then forgotten; it
  becomes part of the restaurant's permanent knowledge base right away. An
  existing researched/chef-confirmed entry is never overwritten by this.
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
