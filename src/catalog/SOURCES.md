# Catalog Sources & Licensing

This app ships with a **curated builtin catalog** (static JSON files under `src/catalog/`).

## Important Legal Notes (Summary)

- **CrossFit® is a registered trademark**. This project should avoid implying official affiliation/endorsement and should avoid using CrossFit logos/branding unless licensed.
- Workout names and short factual prescriptions (sets/reps/loads/time caps) are generally treated as factual descriptions, but **long-form text, images, and videos from third-party sites** may be copyrighted. Avoid copying long verbatim content.
- When adding third-party datasets, prefer **permissive licenses** and keep attribution here.

## What's in the Builtin Catalog

The catalog is split by category/intent:

| File | Category | SubCategory | Count | Description |
|------|----------|-------------|-------|-------------|
| `benchmarks_girls.json` | Benchmark | Girls | 33 | Classic & New Girls WODs |
| `benchmarks_heroes.json` | Benchmark | Heroes | 100 | Hero/Tribute WODs |
| `benchmarks_notable.json` | Benchmark | Notable | 48 | Community benchmarks |
| `benchmarks_open.json` | Benchmark | Open | 72 | CrossFit Open 2011-2025 |
| `benchmarks_games.json` | Benchmark | Games | 50 | CrossFit Games events |
| `lifts.json` | Lift | - | 26 | Barbell & Olympic lifts |
| `monostructural.json` | Monostructural | - | 12 | Cardio/Conditioning |
| `skills.json` | Skill | - | 37 | Gymnastics & bodyweight |
| **Total** | | | **377** | |

Each catalog item includes:

- `id`: Unique identifier
- `name`: Display name
- `category`: Benchmark, Lift, Monostructural, Skill
- `subCategory`: Girls, Heroes, Open, Games, Notable (for Benchmarks)
- `scoreType`: Time, Load, Reps, Rounds+Reps, Distance, Calories
- `description`: Short workout prescription
- `tags`: Keywords for search/filtering
- `aliases`: Alternative names for search
- `source`: Provenance label
- `sourceUrl`: Reference link (optional)

## Current Sources

### Girls Benchmark Workouts
- **Source**: CrossFit.com FAQ, curated from community consensus
- **Count**: 33 workouts (Classic Girls + 2021 New Girls)
- **Reference**: https://www.crossfit.com/faq/wod

### Hero/Tribute Workouts
- **Source**: CrossFit.com/heroes, garagegymbuilder.com Hero WOD Masterlist
- **Count**: 100 workouts
- **Reference**: https://www.crossfit.com/heroes

### CrossFit Open Workouts (2011-2025)
- **Source**: games.crossfit.com Open archives
- **Count**: 72 workouts across 15 seasons
- **Reference**: https://games.crossfit.com/

### CrossFit Games Events
- **Source**: games.crossfit.com Games archives
- **Count**: 50 competition events
- **Reference**: https://games.crossfit.com/

### Notable/Community Benchmarks
- **Source**: wodbase.com, community consensus
- **Count**: 48 popular community WODs
- **Reference**: https://www.wodbase.com/benchmark-wods/

### Lifts, Skills, Monostructural
- **Source**: CrossFit Level 1 Training Guide, community standards
- **Count**: 75 movements/tests

## External Datasets (Not Bundled)

If we later decide to expand the "Movements" catalog using an external dataset, good candidates include:

- **`yuhonas/free-exercise-db`** (Unlicense): JSON exercise library (generic fitness movements).
- **`wrkout/exercises.json`** (Unlicense): large movement dataset (generic).
- **`exercemus/exercises`** (MIT): curated exercise list (generic).

If/when we import any of these into `src/catalog/`, we should:

- record the **exact commit/tag** used
- preserve required **license files / attribution**
- document any **transformations** (renames, dedupe rules, removed entries)

## Changelog

### v2.0 (January 2026)
- Expanded catalog from 64 to 377 items
- Added 13 new Girl WODs (Kelly, Gwen, Hope, Barbara Ann, Lyla, Ellen, Andi, Lane, etc.)
- Added 87 Hero WODs (total now 100)
- Added 68 Open workouts (2011-2025)
- Added 50 CrossFit Games events (new file: benchmarks_games.json)
- Added 44 Notable/community benchmarks
- Added 15 lift variations
- Added 29 gymnastics/skill tests
- Added 8 monostructural modalities

### v1.0 (Initial)
- Initial catalog with ~64 items
