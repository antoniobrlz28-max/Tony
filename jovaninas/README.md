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
- **Change briefings, menu history, dish pages** (quick/service/study/notes/
  history layers), a searchable **culinary library**, natural-language-ish
  **search**, and spaced-repetition **flashcards**.

See `src/lib/` for the underlying logic (parsing, diffing, component
extraction, spaced repetition) — all pure functions, independent of React.

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
> validated with `tsc --noEmit` (syntax) and a standalone Node smoke test
> (`src/lib/*` logic — parsing, diffing, dish-identity matching, spaced
> repetition) exercising the exact "elk bolognese" change-detection example
> from the product spec end-to-end. Run `npm install && npm run dev`
> locally to try the UI.

From the empty Home screen you can click **Load sample data** to seed two
versions of a demo Dinner menu and see the full change-detection flow
without typing anything in.
