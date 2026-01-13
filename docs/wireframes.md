# CrossfitToolkit — Low‑Fidelity Wireframes (Mobile‑First)

This doc is a **quick, Figma-like** way to iterate on UX before implementation.

## Conventions

- **Tap targets** are written like: `[Button]`, `[ListItem]`, `[Chip]`
- **Inputs** are written like: `(Search...)`, `(Notes...)`
- **Navigation** shows where taps go.
- All wireframes assume a **mobile viewport** first.

---

## Global navigation (MVP)

### Header (top)
- App title (or icon)
- Optional: `[Settings]` icon button

### Primary flow
Most users will do:
`Home` → `Search` → `ItemDetail` → `LogResult`

---

## Screen 1 — Home (Dashboard)

### Goal
Get users to logging quickly, and show recent activity.

### Layout
```
┌──────────────────────────────────┐
│ CrossfitToolkit            [⚙]   │
├──────────────────────────────────┤
│ (Search PR item or benchmark…)   │
│  Autocomplete                     │
│  [Fran]              Bench  Time  │
│  [Back Squat]        Lift   Load  │
│  [Row 2k]            Mono   Time  │
│  [Pull-ups Max]      Skill  Reps  │
│  [See all results ›]              │
├──────────────────────────────────┤
│ Favorites                         │
│ [Fran]   [Back Squat 1RM] [Grace] │  → chips open ItemDetail
├──────────────────────────────────┤
│ Recent logs                        │
│ [Fran — 4:32 — Rx]        [›]      │
│ [Clean 1RM — 100kg]       [›]      │
│ [Cindy — 18+5 — Scaled]   [›]      │  → opens ItemDetail (with history)
├──────────────────────────────────┤
│ [ + Log PR ]                        │  → opens Search
└──────────────────────────────────┘
```

### Interactions
- Typing in search shows **autocomplete** suggestions (top matches).
- Tap an autocomplete row → `ItemDetail` (with clear **Log result** access)
- Tap `[See all results ›]` → `Search` (full filters + list)
- Tap favorite chip → `ItemDetail`
- Tap recent log row → `ItemDetail`
- Tap `[+ Log PR]` → `Search`

---

## Screen 2 — Search (Catalog)

### Goal
Fast find + pick an item to log.

### Layout
```
┌──────────────────────────────────┐
│ [‹]  Search                       │
├──────────────────────────────────┤
│ (Search… “Fran”, “Snatch”, etc.)  │
├──────────────────────────────────┤
│ Filters: [All] [Benchmarks] [Lifts]│
│         [Gymnastics] [Monostruct] │
│         [Favorites ★]             │
├──────────────────────────────────┤
│ Results                            │
│ [Fran]              Bench  Time  › │
│ [Grace]             Bench  Time  › │
│ [Back Squat]        Lift   Load  › │
│ [Pull-ups Max]      Skill  Reps  › │
│ [Row 2k]             Mono  Time  › │
├──────────────────────────────────┤
│ [ + Create custom item ]           │
└──────────────────────────────────┘
```

### Result row content (suggested)
- Left: name
- Right: small metadata (category + score type)
- Chevron for clarity

### Interactions
- Tap a result → `ItemDetail`
- Tap filter chips → update list
- Tap `[+ Create custom item]` → `EditItem` (optional v1) OR `CreateItem` (v1 if needed)

---

## Screen 3 — Item Detail (Catalog Item / Benchmark)

### Goal
Show “best”, history, and let user log quickly.

### Layout
```
┌──────────────────────────────────┐
│ [‹]  Fran                    [★] │  ★ = favorite toggle
├──────────────────────────────────┤
│ Type: Benchmark     Score: Time   │
│ Aliases: “FRAN”                   │
├──────────────────────────────────┤
│ Best                               │
│ 4:32 (Rx) — Jan 13, 2026           │
│ [ Log result ]                     │
├──────────────────────────────────┤
│ Progress (Chart)                   │
│ Range: [3M] [6M] [1Y] [All]        │
│ Filter: [All] [Rx] [Scaled]        │
│ ┌───────────────────────────────┐ │
│ │  (simple line chart/sparkline)│ │
│ └───────────────────────────────┘ │
│ Latest: 4:32   Best: 4:32          │
├──────────────────────────────────┤
│ Standards / Notes                  │
│ “21-15-9 Thrusters/Pull-ups…”      │
│ [ Edit details ]                   │  (stores as local override)
├──────────────────────────────────┤
│ History                            │
│ [4:32 — Rx]      Jan 13, 2026  [›] │
│ [4:58 — Scaled]  Dec 20, 2025  [›] │
│ [5:10 — Rx]      Nov 02, 2025  [›] │
└──────────────────────────────────┘
```

### Interactions
- Tap `[Log result]` → `Log Result` (modal/sheet)
- Tap chart range chips → updates chart window
- Tap Rx/Scaled filter → updates chart + history list (optional, but consistent)
- Tap `[Edit details]` → `Edit Item Details` (local override)
- Tap ★ → favorite/unfavorite
- Tap history row → `Log Detail` (optional) or just stays on screen

### Chart behavior (default)
- **“Better goes up”**:
  - Time-based benchmarks: faster times plot higher (internally invert/normalize for display).
  - Load/reps/rounds: larger values plot higher.

---

## Screen 4 — Log Result (Bottom Sheet / Modal)

### Goal
Quick entry with minimal typing. Fields adapt by score type.

### Variants by score type

#### A) Time (mm:ss)
```
┌──────────────────────────────────┐
│ Log result — Fran            [×]  │
├──────────────────────────────────┤
│ Result                            │
│ (mm:ss)  [ 04 : 32 ]              │
│ Rx/Scaled: [Rx] [Scaled] [Custom] │
│ Date: (Jan 13, 2026)              │
│ Notes (optional)                  │
│ (Felt great…)                     │
├──────────────────────────────────┤
│ [ Save ]                           │
└──────────────────────────────────┘
```

#### B) Load (kg/lb)
```
┌──────────────────────────────────┐
│ Log result — Back Squat 1RM  [×]  │
├──────────────────────────────────┤
│ Weight: (150)  Unit: [kg] [lb]    │
│ Rx/Scaled: [Rx] [Scaled] [Custom] │
│ Date: (Jan 13, 2026)              │
│ Notes (optional)                  │
│ (Belt, depth good…)               │
├──────────────────────────────────┤
│ [ Save ]                           │
└──────────────────────────────────┘
```

#### C) Reps
```
┌──────────────────────────────────┐
│ Log result — Pull-ups Max    [×]  │
├──────────────────────────────────┤
│ Reps: (32)                         │
│ Date: (Jan 13, 2026)               │
│ Notes (optional)                   │
├──────────────────────────────────┤
│ [ Save ]                            │
└──────────────────────────────────┘
```

#### D) Rounds + Reps
```
┌──────────────────────────────────┐
│ Log result — Cindy           [×]  │
├──────────────────────────────────┤
│ Rounds: (18)   Reps: (5)          │
│ Rx/Scaled: [Rx] [Scaled] [Custom] │
│ Date: (Jan 13, 2026)              │
│ Notes (optional)                  │
├──────────────────────────────────┤
│ [ Save ]                           │
└──────────────────────────────────┘
```

### Interactions
- Save → closes modal → returns to `ItemDetail` showing updated best/history
- Close (×) → dismiss without saving

---

## Screen 5 — Edit Item Details (Local Override)

### Goal
Let users tweak built-ins locally (name, notes, tags) without changing seed data.

### Layout
```
┌──────────────────────────────────┐
│ [‹] Edit — Fran                   │
├──────────────────────────────────┤
│ Name: (Fran)                      │
│ Notes/Standards:                  │
│ (21-15-9 Thrusters/Pull-ups…)     │
│ Tags: [Benchmark] [Time]          │
│ Aliases: (FRAN, fran)             │
├──────────────────────────────────┤
│ [ Save changes ]                   │
└──────────────────────────────────┘
```

---

## Screen 6 — Settings / Data

### Goal
Data ownership (export/import) and simple preferences.

### Layout
```
┌──────────────────────────────────┐
│ [‹] Settings                      │
├──────────────────────────────────┤
│ Preferences                       │
│ Units: [kg] [lb]                  │
├──────────────────────────────────┤
│ Data                              │
│ [ Export backup (JSON) ]          │
│ [ Import backup (JSON) ]          │
│ [ Reset all local data ]          │
└──────────────────────────────────┘
```

---

## Open questions (for your feedback)

### Locked decisions (based on your answers)

1. Home ordering: **Favorites first**, then **Recent logs**
2. Search filters: **scrollable chips**
3. ItemDetail: **sticky** `[Log result]` button on mobile
4. Log Result UX: **bottom sheet/modal** on mobile (fast entry, easy dismiss)
5. Home autocomplete tap → **ItemDetail** (not direct logging)
6. Chart default filter: **All results**

### Remaining open questions

- None for MVP flow. Further refinements can be discussed once the prototype is implemented.

