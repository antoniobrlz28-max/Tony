# Jovanina's Menu Intelligence Engine

A restaurant knowledge system, not a menu scanner. The core loop:

> Scan → compare → confirm → understand → practice → remember.

Client-side only (React + `localStorage`, no backend). Built as a separate
project inside this repo — it does not touch the existing `Tony` file
(the personal finance tracker) at the repo root.

Visual design is a vintage passport / field-guide aesthetic: cream paper,
navy ink, red and brass accents, Playfair Display + Libre Baskerville type,
a phone-width shell with a bottom nav (Brief / Scan / My Menus / Learn /
Library / More).

## What's implemented

**Capture → compare → confirm**
- Paste/type menu text (no OCR in this build — see Known limitations),
  attach photos for the archive, heuristic extraction into sections/dishes,
  editable before saving.
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
- "Explain like I'm a..." — Professional / Guest / Kid / Foodie phrasings
  generated from the same parsed data, not separately invented facts.
- Flavor-profile tags and flavor-logic **pairing suggestions**
  (wine/cocktail/amaro), matched against Library beverage entries when
  present, otherwise a generic style so nothing restaurant-specific is
  fabricated.
- Photo timeline per dish (upload + caption + date).

**Learn** — five modes: SRS **flashcards**, a multiple-choice **pre-shift
quiz** (distractors generated from real dish/ingredient data),
**pronunciation** practice (browser text-to-speech), an **objection
trainer** (guest pushback scenarios with responses grounded in the dish's
actual technique/flavor data), and a **guest recommendation engine**
(preferences in → ranked dishes, wine pairing, upsell appetizer/dessert
out).

**Library, Search, More**
- Culinary dictionary with pronunciation guides and category filters; every
  term has its own wiki page.
- Natural-language-ish search across dishes/ingredients/notes.
- Cross-dish notes feed, local data export/import/reset, a profile name,
  and a **Roadmap** tab listing what's deliberately deferred (see below).

See `src/lib/` for the underlying logic (parsing, diffing, component
extraction, flavor tagging, pairing logic, MCQ/objection/recommendation
generation, spaced repetition) — all pure functions, independent of React.

## Known limitations (by design)

- **No OCR/vision API.** Photos are archived but not auto-transcribed —
  paste or type the menu text instead.
- **No live LLM.** Descriptions, pairings, objections, and recommendations
  are generated from rules + a seed dictionary, not a model call — per the
  product's own rule, generated text must stay traceable to actual parsed
  input, never invented.
- **Single-user, local-storage only.** No accounts, no backend, no
  multi-device or multi-staff sync. "Ask Chef" (open conversational Q&A),
  search-by-photo, live shared staff notes/analytics, chef voice notes, and
  a knowledge-score/AI-coach layer are real parts of the bigger vision but
  are intentionally left out rather than faked — they need a backend and/or
  a live LLM/vision API. See the **Roadmap** tab under More in the app.

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
> scenarios, guest recommendations, and the dish/ingredient wiki
> cross-referencing. Run `npm install && npm run dev` locally to try the
> UI — fonts (Playfair Display + Libre Baskerville + Courier Prime via
> Google Fonts) load from a CDN at runtime and weren't reachable from this
> sandbox either, so double-check they render as expected.

From the empty Brief screen you can click **Load sample data** to seed two
versions of a demo Dinner menu and see the full change-detection flow
without typing anything in.
