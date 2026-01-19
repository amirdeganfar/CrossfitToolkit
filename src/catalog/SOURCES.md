# Catalog sources & licensing

This app ships with a **curated builtin catalog** (static JSON files under `src/catalog/`).

## Important legal notes (summary)

- **CrossFit® is a registered trademark**. This project should avoid implying official affiliation/endorsement and should avoid using CrossFit logos/branding unless licensed.
- Workout names and short factual prescriptions (sets/reps/loads/time caps) are generally treated as factual descriptions, but **long-form text, images, and videos from third-party sites** may be copyrighted. Avoid copying long verbatim content.
- When adding third-party datasets, prefer **permissive licenses** and keep attribution here.

## What’s in the builtin catalog

The catalog is split by intent:

- **Benchmarks / named workouts**: high-signal “loggable” workouts (e.g., Girls, Heroes, Open workouts)
- **Lifts / skills / monostructural**: common PR/test items
- **Movements** (optional): movement entries meant for search/selection (still loggable, but treated as “skill/test” items)

Each catalog item can optionally carry:

- `source`: short provenance label (e.g. `"curated"`, `"CrossFit Open"`)
- `sourceUrl`: a reference link (optional)
- `aliases`: alternative names for search
- `tags`: extra keywords
- `subCategory`: a finer subtype (e.g. Girls/Heroes/Open)

## Current sources

### Curated (in-repo)

- **Girls benchmark workouts**: curated from commonly-cited benchmark definitions and CrossFit community consensus.
  - Note: we keep descriptions short and factual.
- **Hero / tribute workouts**: curated list (names + short prescriptions where included).
- **CrossFit Open workouts**: curated list by year/workout ID (e.g. `24.1`) with short prescriptions.

### External datasets (not bundled yet)

If we later decide to expand the “Movements” catalog using an external dataset, good candidates include:

- **`yuhonas/free-exercise-db`** (Unlicense): JSON exercise library (generic fitness movements).
- **`wrkout/exercises.json`** (Unlicense): large movement dataset (generic).
- **`exercemus/exercises`** (MIT): curated exercise list (generic).

If/when we import any of these into `src/catalog/`, we should:

- record the **exact commit/tag** used
- preserve required **license files / attribution**
- document any **transformations** (renames, dedupe rules, removed entries)

