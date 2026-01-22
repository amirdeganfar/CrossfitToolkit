# Feature Requirements Document

This document outlines future features for CrossfitToolkit. Each feature includes user stories, data models, UI/UX requirements, and implementation notes.

**Last Updated:** January 2026

---

## Table of Contents

1. [Progress Charts & Analytics](#1-progress-charts--analytics)
2. [WOD Generator / Random Workout](#2-wod-generator--random-workout)
3. [Goal Setting & Tracking](#3-goal-setting--tracking)
4. [Equipment Filter](#4-equipment-filter)
5. [Movement Substitutions](#5-movement-substitutions)
6. [Body Metrics Tracking](#6-body-metrics-tracking)
7. [Training Log / Journal](#7-training-log--journal)
8. [Warm-up Generator](#8-warm-up-generator)

---

## 1. Progress Charts & Analytics

### Description
Visualize PR progression over time using charts. Users can see trends for lifts, benchmark times, and skill reps.

### User Stories
- As a user, I want to see a line chart of my Back Squat PR over time so I can track my strength gains.
- As a user, I want to compare my Fran times across different attempts to see improvement.
- As a user, I want to see a summary of my PRs for the month.
- As a user, I want to filter charts by date range (last 30 days, 6 months, 1 year, all time).

### Data Model
No new data models required. Uses existing `prLogs` data:
```typescript
interface PRLog {
  id: string;
  itemId: string;
  result: string;
  normalizedValue: number;
  date: string; // ISO date
  variant?: 'Rx' | 'Scaled' | 'Rx+';
  reps?: number;
  distance?: number;
  calories?: number;
  notes?: string;
}
```

### UI/UX Requirements

#### New Page: `/progress` or `/analytics`
- Add to bottom navigation or accessible from Settings/Home
- Tab-based navigation: "Charts" | "Summary"

#### Charts Tab
- **Item Selector**: Dropdown to select which item to chart
- **Chart Types**:
  - Line chart for Load items (y-axis: weight, x-axis: date)
  - Line chart for Time items (y-axis: time in seconds, x-axis: date) - lower is better
  - Line chart for Reps items (y-axis: reps, x-axis: date)
- **Date Range Filter**: 30 days, 6 months, 1 year, All time
- **Variant Filter**: All, Rx only, Scaled only
- **Data Points**: Show individual PR entries as dots on the chart
- **Tooltip**: Show date, result, and notes on hover/tap

#### Summary Tab
- **Monthly Stats**:
  - Total PRs logged this month
  - Most improved item (largest % gain)
  - Most logged item
- **Personal Bests**: List of all-time PRs by category
- **Streak**: Days with logged activity

### Technical Notes
- **Library**: Recharts (React-friendly, lightweight)
- **Installation**: `npm install recharts`
- **Performance**: Limit data points or aggregate for large datasets
- **Responsive**: Charts should resize for mobile

### Dependencies
- Existing `prLogs` in IndexedDB
- Existing `catalogStore` for item metadata

### Complexity
Medium (3-5 days)

---

## 2. WOD Generator / Random Workout

### Description
Generate random workouts from the catalog based on user-selected filters. Great for users seeking variety or workout inspiration.

### User Stories
- As a user, I want to get a random benchmark workout so I can try something new.
- As a user, I want to filter random workouts by category (Girls, Heroes, etc.).
- As a user, I want to exclude workouts I've already done.
- As a user, I want a "Shuffle" button to get another random workout.
- As a user, I want to generate a workout based on available equipment.

### Data Model
No new data models required. Uses existing catalog data.

Optional: Track generated workouts history
```typescript
interface GeneratedWorkout {
  id: string;
  itemId: string;
  generatedAt: string; // ISO date
  completed: boolean;
}
```

### UI/UX Requirements

#### New Page: `/generator` or accessible from Home
- **Filter Options**:
  - Category: All, Benchmark, Lift, Monostructural, Skill
  - Subcategory (if Benchmark): All, Girls, Heroes, Open, Games, Notable
  - Score Type: All, Time, Load, Reps, Rounds+Reps
  - Equipment filter (see Feature #4)
  - Exclude completed: Toggle to hide items with existing PRs
  
- **Generate Button**: Large, prominent button
- **Result Display**:
  - Show workout name, description, movements
  - "Shuffle" button to regenerate
  - "View Details" link to ItemDetail page
  - "Log Result" quick action
  
- **History Section** (optional):
  - Recently generated workouts
  - Mark as completed

#### Quick Access
- Add "Random WOD" button on Home page
- Floating action button option

### Technical Notes
- Random selection: `Math.random()` with Fisher-Yates shuffle
- Filter logic in `catalogService.ts` or new `generatorService.ts`
- Persist filters in local state (not IndexedDB)

### Dependencies
- Existing catalog data
- Equipment Filter feature (optional, can be added later)

### Complexity
Small-Medium (2-3 days)

---

## 3. Goal Setting & Tracking

### Description
Allow users to set PR goals with target dates and track progress toward achieving them.

### User Stories
- As a user, I want to set a goal for my Back Squat (e.g., 300 lb by March 2026).
- As a user, I want to see my progress toward each goal as a percentage.
- As a user, I want to see how much time I have left to reach my goal.
- As a user, I want to mark goals as achieved or cancel them.
- As a user, I want to see projected achievement date based on my progress trend.

### Data Model
```typescript
interface Goal {
  id: string;
  itemId: string;
  targetValue: number; // normalized value (kg, seconds, reps)
  targetDate: string; // ISO date
  createdAt: string; // ISO date
  status: 'active' | 'achieved' | 'cancelled';
  achievedAt?: string; // ISO date when achieved
  variant?: 'Rx' | 'Scaled' | 'Rx+'; // for benchmarks
  reps?: number; // for lifts (e.g., 1RM vs 3RM goal)
}
```

#### IndexedDB Schema Update
```typescript
// Add to db.ts
goals: '++id, itemId, status, targetDate'
```

### UI/UX Requirements

#### Goals List Page: `/goals`
- Add to navigation (Settings submenu or dedicated nav item)
- **Active Goals Section**:
  - Card per goal showing:
    - Item name
    - Current PR vs Target (e.g., "275 lb → 300 lb")
    - Progress bar (% complete)
    - Days remaining
    - Trend indicator (on track, ahead, behind)
  - Tap to expand: show recent logs, projected date
  - Actions: Edit, Mark Achieved, Cancel

- **Achieved Goals Section**:
  - Collapsed by default
  - Show celebration badge/icon

- **Add Goal Button**: Floating action button

#### Add/Edit Goal Modal
- Item selector (searchable dropdown)
- Target value input (formatted for score type)
- Target date picker
- Optional: Variant selector, Reps selector

#### ItemDetail Integration
- Show active goal for item (if exists)
- Quick "Set Goal" button if no active goal
- Progress indicator on PR card

### Technical Notes
- Progress calculation: `(currentPR / targetValue) * 100`
- Trend projection: Linear regression on recent PRs
- Auto-achieve: Check on new PR log if goal is met
- Notifications: Optional browser notifications for approaching deadlines

### Dependencies
- Existing `prLogs` for current PR lookup
- Existing `catalogStore` for item metadata

### Complexity
Medium (4-5 days)

---

## 4. Equipment Filter

### Description
Filter workouts and movements by available equipment. Users can specify what equipment they have access to.

### User Stories
- As a user, I want to see only workouts I can do with my home gym equipment.
- As a user, I want to save my available equipment list.
- As a user, I want to filter the catalog by equipment.
- As a user, I want to see equipment requirements for each workout.

### Data Model

#### Equipment Tags (Catalog Enhancement)
Add `equipment` array to catalog items:
```typescript
interface CatalogItem {
  // ... existing fields
  equipment?: string[]; // e.g., ["barbell", "pull-up bar", "rower"]
}
```

#### Equipment List
```typescript
const EQUIPMENT_OPTIONS = [
  'barbell',
  'dumbbells',
  'kettlebell',
  'pull-up bar',
  'rings',
  'rower',
  'assault bike',
  'echo bike',
  'ski erg',
  'bike erg',
  'box',
  'wall ball',
  'jump rope',
  'ghd',
  'sled',
  'rope',
  'peg board',
  'parallettes',
  'bench',
  'rack',
  'bodyweight only'
] as const;
```

#### User Equipment Preference
```typescript
interface UserSettings {
  // ... existing fields
  availableEquipment?: string[];
}
```

### UI/UX Requirements

#### Settings Page Addition
- **My Equipment Section**:
  - Checklist of equipment options
  - "Select All" / "Clear All" buttons
  - Saved to IndexedDB settings

#### Search Page Enhancement
- **Equipment Filter**:
  - Multi-select dropdown or chip selector
  - "Use My Equipment" quick toggle
  - Filter results to show only matching items

#### Catalog Item Display
- Show equipment tags as small icons or chips
- Equipment requirements in ItemDetail page

### Catalog Data Updates Required
Add `equipment` field to all 377 catalog items:
- Benchmarks: Based on movements list
- Lifts: Mostly "barbell" or "bodyweight only"
- Monostructural: Specific equipment (rower, bike, etc.)
- Skills: Mostly "bodyweight only", "pull-up bar", "rings", etc.

### Technical Notes
- Filter logic: Item passes if ALL its equipment is in user's available list
- Default: Show all items if no equipment filter set
- Catalog validation: Update `validateCatalog.mjs` to check equipment field

### Dependencies
- Catalog data updates (bulk update needed)
- Existing Search page

### Complexity
Small for code, Medium for data entry (2-3 days code, data entry time varies)

---

## 5. Movement Substitutions

### Description
Suggest scaling options and equipment alternatives for movements. Help users adapt workouts to their abilities or equipment.

### User Stories
- As a user, I want to see scaling options for pull-ups (e.g., ring rows, banded pull-ups).
- As a user, I want equipment alternatives (e.g., no rower → run equivalent).
- As a user, I want to understand movement standards and progressions.

### Data Model

#### Substitution Mapping
```typescript
interface MovementSubstitution {
  movement: string; // e.g., "pull-ups"
  substitutions: {
    type: 'scale' | 'equipment' | 'progression';
    name: string; // e.g., "Ring Rows"
    description: string; // e.g., "Horizontal pulling movement"
    ratio?: string; // e.g., "3 ring rows = 1 pull-up"
  }[];
}
```

#### Static Data File
Create `src/catalog/substitutions.json`:
```json
{
  "pull-ups": {
    "scales": ["Ring Rows", "Banded Pull-ups", "Jumping Pull-ups"],
    "progressions": ["Strict Pull-ups", "Chest-to-Bar", "Muscle-ups"],
    "ratios": {
      "Ring Rows": "2:1",
      "Banded Pull-ups": "1:1"
    }
  },
  "row": {
    "equipment_alternatives": [
      { "movement": "Run", "ratio": "1000m row = 800m run" },
      { "movement": "Bike", "ratio": "1000m row = 2000m bike" }
    ]
  }
}
```

### UI/UX Requirements

#### ItemDetail Enhancement
- **Substitutions Section** (collapsible):
  - Show scaling options
  - Show equipment alternatives
  - Show progression path
  - Conversion ratios where applicable

#### Search/Filter Integration
- Filter by "Has substitution" for adaptable workouts
- Link between substitute movements

#### Standalone Substitution Reference
- Page or modal listing all substitutions
- Searchable by movement name

### Technical Notes
- Static JSON file, loaded on demand
- Movement matching: Fuzzy match movement names in workout descriptions
- Display inline with workout movements

### Dependencies
- Existing ItemDetail page
- Movement parsing (may need text analysis of `movements` array)

### Complexity
Small for code, Medium for data compilation (2 days code + research time)

---

## 6. Body Metrics Tracking

### Description
Track bodyweight and body measurements. Enables relative strength calculations (e.g., "2x bodyweight squat").

### User Stories
- As a user, I want to log my bodyweight regularly.
- As a user, I want to see my bodyweight trend over time.
- As a user, I want to see my lifts as a multiple of bodyweight.
- As a user, I want to track other measurements (optional: waist, chest, etc.).

### Data Model
```typescript
interface BodyMetric {
  id: string;
  date: string; // ISO date
  weight: number; // in kg (normalized)
  unit: 'kg' | 'lb'; // original input unit
  notes?: string;
  measurements?: {
    waist?: number; // cm
    chest?: number; // cm
    arms?: number; // cm
    thighs?: number; // cm
  };
}
```

#### IndexedDB Schema Update
```typescript
// Add to db.ts
bodyMetrics: '++id, date'
```

### UI/UX Requirements

#### New Page: `/body` or Settings Submenu
- **Current Stats Card**:
  - Latest weight
  - Weight change (vs last entry, vs 30 days ago)
  
- **Log Weight Section**:
  - Weight input with unit toggle
  - Date picker
  - Optional measurements (expandable)
  - Notes field
  
- **History Section**:
  - List of entries (date, weight, change)
  - Delete entries
  
- **Chart Section**:
  - Line chart of weight over time
  - Date range filter

#### ItemDetail Enhancement (for Lifts)
- Show relative strength:
  - "Back Squat: 300 lb (1.8x BW)"
  - Requires recent bodyweight entry
- Wilks Score calculation (optional, advanced)

### Technical Notes
- Store weight normalized to kg internally
- Display in user's preferred unit
- Relative strength: `liftPR / currentBodyweight`
- Current bodyweight: Most recent entry within last 30 days

### Dependencies
- Existing unit settings
- Progress Charts feature (can share chart component)

### Complexity
Small-Medium (2-3 days)

---

## 7. Training Log / Journal

### Description
Daily training journal beyond just PRs. Track workouts, notes, energy levels, and overall training volume.

### User Stories
- As a user, I want to log what I did today even if it wasn't a PR.
- As a user, I want to track how I felt during training (energy, mood).
- As a user, I want to see a calendar view of my training days.
- As a user, I want to add notes about my training session.
- As a user, I want to see my training frequency (days per week).

### Data Model
```typescript
interface TrainingSession {
  id: string;
  date: string; // ISO date
  title?: string; // e.g., "Morning WOD"
  workouts: {
    itemId?: string; // link to catalog item (optional)
    name: string; // workout name or custom description
    result?: string; // result if logged
    notes?: string;
  }[];
  metrics: {
    energy: 1 | 2 | 3 | 4 | 5; // 1=exhausted, 5=great
    mood: 1 | 2 | 3 | 4 | 5;
    sleepHours?: number;
    soreness?: 1 | 2 | 3 | 4 | 5;
  };
  notes?: string; // general session notes
  duration?: number; // total session time in minutes
}
```

#### IndexedDB Schema Update
```typescript
// Add to db.ts
trainingSessions: '++id, date'
```

### UI/UX Requirements

#### New Page: `/journal` or `/log`
- Add to navigation

#### Calendar View
- Month calendar showing training days (dots/highlights)
- Tap day to view/add session
- Color coding by energy level or workout type

#### Session Detail View
- Date and title
- List of workouts performed
- Metrics (visual: emoji or star ratings)
- Notes
- Edit/Delete actions

#### Add Session Modal/Page
- Date picker (default: today)
- Title input (optional)
- Add workouts:
  - Search catalog items
  - Or type custom workout name
  - Add result (optional)
- Metrics sliders/selectors:
  - Energy level (emoji scale)
  - Mood (emoji scale)
  - Sleep hours
  - Soreness level
- Notes textarea
- Duration input

#### Home Page Integration
- "Log Training" quick action
- Today's session summary (if exists)

#### Stats/Insights
- Training frequency (sessions per week)
- Average energy/mood trends
- Most common workout types

### Technical Notes
- Calendar library: Consider react-calendar or custom implementation
- Separate from PRLogs: Training sessions track overall activity, PRLogs track personal records
- Link sessions to PRLogs: When logging a PR, optionally add to today's session

### Dependencies
- Existing catalog for workout selection
- Can integrate with existing LogResultModal

### Complexity
Medium-High (5-7 days)

---

## 8. Warm-up Generator

### Description
Generate warm-up routines based on the planned workout or target movement patterns.

### User Stories
- As a user, I want a warm-up routine before my workout.
- As a user, I want the warm-up to match today's movements (e.g., shoulder prep for overhead work).
- As a user, I want general warm-up options when I don't have a specific workout.
- As a user, I want to customize warm-up duration (5, 10, 15 minutes).

### Data Model

#### Warm-up Templates
```typescript
interface WarmupTemplate {
  id: string;
  name: string; // e.g., "Upper Body Prep"
  targetPatterns: string[]; // e.g., ["push", "pull", "overhead"]
  duration: number; // minutes
  sections: {
    name: string; // e.g., "General", "Specific", "Activation"
    exercises: {
      name: string;
      duration?: string; // e.g., "60 seconds"
      reps?: string; // e.g., "10 each side"
      notes?: string;
    }[];
  }[];
}
```

#### Movement Pattern Mapping
```typescript
const MOVEMENT_PATTERNS: Record<string, string[]> = {
  "push": ["push-ups", "hspu", "bench press", "strict press", "push press", "dips"],
  "pull": ["pull-ups", "muscle-ups", "rows", "deadlift"],
  "squat": ["squat", "thruster", "wall ball", "pistol"],
  "hinge": ["deadlift", "clean", "snatch", "kettlebell swing"],
  "overhead": ["snatch", "overhead squat", "push press", "jerk", "hspu"],
  "core": ["toes-to-bar", "sit-ups", "ghd"],
  "cardio": ["run", "row", "bike", "ski"]
};
```

#### Static Data File
Create `src/catalog/warmups.json` with template routines.

### UI/UX Requirements

#### New Page: `/warmup`
- Accessible from Home or before starting timer

#### Generation Options
- **Based on Workout**:
  - Select a catalog item
  - Auto-detect movement patterns
  - Generate matching warm-up
  
- **Based on Focus Area**:
  - Select body areas: Upper, Lower, Full Body, Cardio
  - Generate general warm-up
  
- **Duration Selection**:
  - Quick: 5 minutes
  - Standard: 10 minutes
  - Extended: 15 minutes

#### Warm-up Display
- Sectioned list:
  - General Warm-up (2-3 min)
  - Specific Prep (3-5 min)
  - Movement Activation (2-3 min)
- Each exercise shows name, reps/duration, optional notes
- Timer integration: "Start Warm-up Timer" button

#### Timer Integration
- Option to run warm-up with timer
- Use existing timer infrastructure
- Transition to workout timer after warm-up

### Technical Notes
- Movement pattern detection: Parse workout `movements` array for keywords
- Template selection: Match detected patterns to warm-up templates
- Randomization: Vary exercises within templates for variety

### Dependencies
- Existing catalog data
- Existing Clock/Timer page
- Movement pattern analysis logic

### Complexity
Medium (4-5 days)

---

## Implementation Priority

Recommended implementation order based on value and complexity:

| Priority | Feature | Complexity | Value |
|----------|---------|------------|-------|
| 1 | WOD Generator | Small-Medium | High |
| 2 | Equipment Filter | Small + Data | High |
| 3 | Progress Charts | Medium | High |
| 4 | Body Metrics | Small-Medium | Medium |
| 5 | Goal Setting | Medium | High |
| 6 | Movement Substitutions | Small + Data | Medium |
| 7 | Training Log | Medium-High | Medium |
| 8 | Warm-up Generator | Medium | Medium |

---

## Technical Considerations

### Shared Components Needed
- Chart component (Recharts wrapper)
- Calendar component
- Multi-select filter component
- Progress bar component

### Database Migrations
Features 3, 6, 7 require new IndexedDB tables. Plan schema version updates.

### Catalog Data Updates
Features 4, 5, 8 require catalog enhancements. Consider:
- Batch update script
- Gradual data entry
- Community contributions

### Testing
- Unit tests for calculation logic (progress, goals, relative strength)
- Integration tests for new pages
- Mobile responsiveness testing
