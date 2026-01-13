---
name: PR Toolkit MVP
overview: Build a web-first CrossFit PR toolkit with a curated catalog (benchmarks + PR items), fast search, and single-result logging stored locally in IndexedDB, plus export/import backups.
todos:
  - id: init-web-app
    content: Initialize Vite + React + TypeScript web app with basic routing and layout.
    status: pending
  - id: catalog-seed
    content: Define curated builtin catalog (benchmarks + PR items) with aliases/tags and seed-on-first-load logic.
    status: pending
    dependencies:
      - init-web-app
  - id: indexeddb-layer
    content: Implement IndexedDB schema + wrapper (catalog custom/overrides + PR logs) and versioned export/import bundle.
    status: pending
    dependencies:
      - init-web-app
  - id: catalog-search-ui
    content: Build catalog search UI (fuzzy search + filters + favorites) and item detail page with local overrides.
    status: pending
    dependencies:
      - catalog-seed
      - indexeddb-layer
  - id: pr-log-flow
    content: Implement single-result PR logging flow per score type + history + best-ever computation.
    status: pending
    dependencies:
      - catalog-search-ui
  - id: settings-data-tools
    content: Add Settings page for export/import/reset and basic app preferences (units).
    status: pending
    dependencies:
      - indexeddb-layer
---

# CrossfitToolkit PR-First Web MVP Plan

## Scope (v1)

- **PR-centric** web app (no login) that ships with a **curated catalog** of PR items and benchmarks.
- Users can **search** the catalog and **log single-result PR entries**.
- Data stored **locally in the browser (IndexedDB)** with **export/import**.
- **UI**: Mobile-first responsive UI (primarily used on mobile).
- **Engineering**: Keep code simple, predictable, and nicely structured (avoid over-engineering).

## Product decisions locked

- **Storage**: Local-only (IndexedDB) + export/import backups.
- **Logging**: Single-result PR entries (not structured set-by-set sessions).
- **Catalog**: Curated default list shipped with the app; users can add custom items and **edit built-ins locally**.

## Key screens (MVP)

- **Home/Dashboard**
- Recent PR logs
- Quick search bar
- Favorites/pinned items
- **Catalog Search**
- Search across items + benchmarks
- Filters (category, equipment, Rx/scaled, favorites)
- **Item/Benchmark Detail**
- Description/standards (editable locally)
- Best-ever + history list
- “Log result” CTA
- **Log Result Modal/Page**
- Auto-select correct result fields based on item type (load/time/reps/rounds+reps)
- Fields: date, Rx/scaled, notes, optional link
- **Settings / Data**
- Export JSON
- Import JSON (merge/replace)
- Reset local data

## UX/UI considerations (mobile-first)

- **Mobile-first layout**: design for ~360–430px widths first, then scale up to tablet/desktop.
- **Fast one-handed logging**: prominent search, large tap targets, minimal typing.
- **Responsive components**: list/detail split becomes stacked on mobile; avoid dense tables.
- **Performance**: instant search feel (debounced input, efficient filtering) and lightweight pages.

## Engineering principles (keep it simple)

- **Simple structure**: feature folders + small shared UI components; avoid premature abstractions.
- **Plain data flow**: keep state localized; use a small store only if needed.
- **Typed models**: central types for `CatalogItem` and `PRLogEntry` to prevent drift.
- **Minimal dependencies**: choose a tiny IndexedDB helper and a small UI approach that supports responsive design.

## Data model (minimal but extensible)

- `CatalogItem`
- `id`, `name`, `type` (lift/skill/benchmark)
- `scoreType` (load | time | reps | roundsReps | distanceTime)
- `unitDefaults` (kg/lb, mm:ss)
- `tags` (barbell/gymnastics/monostructural/etc)
- `equipment` tags
- `description`, `standards`, `scalingNotes`
- `isBuiltin`
- `CatalogOverride`
- Stores user edits for built-ins (rename, notes, tags, etc.) keyed by `catalogItemId`
- `PRLogEntry`
- `id`, `catalogItemId`, `performedAt`
- `result` (shape depends on `scoreType`)
- `rxScaled` (Rx | Scaled | Custom)
- `notes`, `link`

## Storage approach

- IndexedDB via a small wrapper (e.g., Dexie or idb) with stores:
- `catalogBuiltin` (seeded on first load)
- `catalogCustom`
- `catalogOverrides`
- `prLogs`
- Export/import works over a single JSON bundle with versioning.

## Catalog seeding (initial content)

- Start with a **small curated set** to avoid bloat:
- Benchmarks: a subset of Girls + a few popular Hero-style benchmarks
- PR items: BackSquat, FrontSquat, Deadlift, Clean, Snatch, BenchPress, StrictPress, PullUpsMax, DUUnbroken, Row2k, etc.
- Add aliases for search (e.g., “Fran”, “Grace”, “DT”).

## Implementation outline (repo is currently empty)

- Initialize a web app (recommendation: **Vite + React + TypeScript**).
- Create modules:
- `src/catalog/seed.ts` (builtin catalog)
- `src/db/` (IndexedDB wrapper + schema)
- `src/features/catalog/` (search, detail)
- `src/features/prLogs/` (log form, history, best)
- `src/features/settings/` (export/import)
- UI structure (suggested, keep small):
  - `src/components/` (shared, reusable UI building blocks)
  - `src/styles/` (global styles + tokens)

## Acceptance criteria

- User can search for “Fran” (or a lift), open it, log a result, and see it in history.
- Best-ever is computed correctly per score type.
- User can edit a built-in item’s notes/name locally and it persists.
- Export creates a JSON file; import restores it into the app.

## Open item (confirm later, not blocking)

- Default units (kg vs lb) can be a simple setting.
