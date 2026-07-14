# Jovanina's Menu Intelligence Engine

An MVP implementation of the core loop:

> Scan → compare → confirm → understand → practice → remember.

Client-side only (React + `localStorage`, no backend). Built as a separate
project inside this repo — it does not touch the existing `Tony` file
(the personal finance tracker) at the repo root.

## What's implemented (MVP scope)

- **Capture**: paste/type menu text, attach photo(s) for the archive (photos
  are stored as-is; there is no OCR/vision API wired up in this build, so
  text extraction is manual paste/type + on-screen correction rather than
  automated image reading — see "Known limitations" below).
- **Structured extraction**: heuristic parser turns pasted text into
  sections → dishes → description/price, editable before saving.
- **Version comparison**: exact / fuzzy-name / ingredient-overlap matching
  against the last confirmed menu of the same type, producing plain-language
  change explanations, confidence scores, and culinary/service/training
  importance ratings.
- **Human confirmation layer**: uncertain matches (renames, evolved dishes)
  are flagged `needs_review` with "same dish new version / not the same
  dish" actions rather than silently auto-resolved.
- **Dish intelligence**: components are extracted from each description and
  tagged with a role (protein, sauce, starch, cheese, herb, etc.) and
  allergen guesses, cross-referenced against a seeded culinary dictionary.
- **Descriptions**: literal / one-line / sensory / guest-friendly / elevated
  descriptions generated deterministically from parsed data only — nothing
  is invented.
- **Dish pages** with Overview / Components / Pairings / History tabs,
  generated flavor-profile tags, and Learn / Notes / Share actions.
- **Pairing suggestions**: flavor-logic-driven wine/cocktail/amaro style
  recommendations (e.g. "high-acid white — cuts fried richness"), matched
  against beverage entries in the Library when present, otherwise shown as a
  generic style so nothing restaurant-specific is invented.
- **My Menus** (Current Menu / Changes / History sub-tabs), a searchable
  **culinary library** (with pronunciation guides), natural-language-ish
  **search**, and a **Learn** tab with three modes: SRS **flashcards**, a
  multiple-choice **pre-shift quiz** (distractors generated from real dish/
  ingredient data), and **pronunciation practice** using the browser's
  built-in text-to-speech.
- **More**: cross-dish notes feed, local data export/import/reset, and a
  profile name used in the Home greeting.

Visual design follows the reference mockups: charcoal/brass/cream palette,
Playfair Display + Satoshi type, a phone-width shell with a bottom nav
(Home / Scan / My Menus / Learn / Library / More).

See `src/lib/` for the underlying logic (parsing, diffing, component
extraction, flavor tagging, pairing logic, MCQ generation, spaced
repetition) — all pure functions, independent of React.

## Known limitations (by design, for this MVP)

- No OCR/vision API is configured, so photos are archived but not
  auto-transcribed. Paste or type the menu text instead.
- Descriptions and culinary explanations are generated from **rules and a
  seed dictionary**, not a live LLM — per the product's own rule ("never
  invent ingredients, techniques, or facts"), this keeps everything
  traceable to actual parsed input.
- Single-user, single-restaurant, local-storage only — no accounts, no
  server, no multi-device sync.

## Running it

```bash
npm install
npm run dev
```

> This sandbox's network policy blocks `registry.npmjs.org`, so `npm
> install` could not be run/verified in this session. The code was
> validated with `tsc --noEmit` (syntax, zero errors across all 25 source
> files) and standalone Node smoke tests exercising `src/lib/*` directly —
> the full parse → diff → commit pipeline (including the "elk bolognese"
> change-detection example from the product spec), the split-into-new-dish
> flow, SRS scheduling, flavor-tag generation, pairing suggestions, and MCQ
> quiz generation with unique/valid answer options. Run `npm install && npm
> run dev` locally to try the UI — fonts (Playfair Display via Google Fonts,
> Satoshi via Fontshare) load from CDNs at runtime and weren't reachable
> from this sandbox either, so double-check they render as expected.

From the empty Home screen you can click **Load sample data** to seed two
versions of a demo Dinner menu and see the full change-detection flow
without typing anything in.
