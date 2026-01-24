---
name: Recovery Insights on Home Page
overview: Add daily check-in and recovery insights directly to the Home page. Users log energy, soreness, and sleep through a quick check-in widget and receive intelligent alerts based on a weighted scoring system. No separate Journal page needed.
todos:
  - id: docs
    content: Create docs/RECOVERY_SCORING.md with full algorithm specification
    status: pending
  - id: config
    content: Create src/config/recoveryScoring.config.ts with thresholds, weights, and messages
    status: pending
  - id: types
    content: Create src/types/training.ts with updated models (5-point scale, RecoveryScore)
    status: pending
  - id: database
    content: Add dailyCheckIns table to Dexie schema (version 4)
    status: pending
  - id: recovery-service
    content: Create src/services/recoveryScoreService.ts with scoring logic
    status: pending
  - id: checkin-service
    content: Create src/services/checkInService.ts with CRUD operations
    status: pending
  - id: store
    content: Create src/stores/checkInStore.ts with Zustand
    status: pending
  - id: emoji-selector
    content: Build EmojiSelector.tsx component for 5-point input
    status: pending
  - id: date-picker
    content: Build DatePicker.tsx component for selecting check-in date (default today, past 30 days)
    status: pending
  - id: quick-checkin
    content: Build QuickCheckIn.tsx component with date picker, energy, soreness, sleep inputs
    status: pending
  - id: recovery-alert
    content: Build RecoveryAlert.tsx component with reason display
    status: pending
  - id: home-integration
    content: Integrate QuickCheckIn and RecoveryAlert into Home.tsx
    status: pending
isProject: false
---

# Recovery Insights on Home Page

## Problem Statement

The original Training Log plan was pure data entry with no immediate value to users. Insights were deferred to "Phase 2", meaning users would log data without getting anything back.

## Solution

Simplify the feature by adding recovery insights directly to the Home page. No separate Journal page needed. Users log minimal daily metrics through a quick check-in widget and immediately receive:

- Recovery score with alert levels
- Contributing factor breakdown
- Actionable recommendations

---

## Architecture

### Separation of Concerns

```
src/
├── config/
│   └── recoveryScoring.config.ts    # All thresholds, weights, messages
├── types/
│   └── training.ts                  # DailyCheckIn, RecoveryScore
├── services/
│   ├── checkInService.ts            # CRUD for daily check-ins
│   └── recoveryScoreService.ts      # Score calculation (reads config)
├── stores/
│   └── checkInStore.ts              # Zustand store
├── components/
│   └── recovery/
│       ├── QuickCheckIn.tsx         # Fast daily input (energy, soreness, sleep)
│       ├── RecoveryAlert.tsx        # Alert display with reasons
│       ├── EmojiSelector.tsx        # 5-point emoji input
│       ├── DatePicker.tsx           # Date selector (default today, past 30 days)
│       └── index.ts                 # Barrel exports
└── pages/
    └── Home.tsx                     # Updated with check-in + alert
docs/
└── RECOVERY_SCORING.md              # Full algorithm documentation
```

---

## Data Models

### DailyCheckIn

```typescript
interface DailyCheckIn {
  id: string;
  date: string;                  // ISO date YYYY-MM-DD
  type: 'training' | 'rest';     // Training day or explicit rest day
  // Metrics only required for training days (null for rest days)
  energy?: 1 | 2 | 3 | 4 | 5;    // 1=exhausted, 5=great
  soreness?: 1 | 2 | 3 | 4 | 5;  // 1=none, 5=very sore
  sleepHours?: number;           // 5, 6, 7, 8, 9 (presets)
  createdAt: number;             // timestamp
}
```

**Rest Day Behavior:**

- No metrics collected (just marks the day as rest)
- Resets consecutive training day counter
- Simple one-tap to log

### RecoveryScore

```typescript
interface RecoveryScore {
  total: number;
  level: 'none' | 'info' | 'warning' | 'critical';
  reasons: RecoveryReason[];
}

interface RecoveryReason {
  metric: 'consecutive' | 'energy' | 'soreness' | 'sleep';
  points: number;               // internal, not shown to user
  message: string;              // user-facing message
}
```

---

## Recovery Scoring Algorithm

### Point Calculation

| Metric | Formula | Max Points |

|--------|---------|------------|

| Consecutive Days | (days - 1), cap at 4 | 4 |

| Energy | (5 - value) x 1.0 | 4 |

| Soreness | (value - 1) x 1.0 | 4 |

| Sleep | Threshold-based (see below) | 6 |

**Sleep Points:**

- 9h+: 0
- 8h: 0
- 7h: 1
- 6h: 3
- 5h: 5
- less than 5h: 6

### Alert Levels

| Score | Level | Title |

|-------|-------|-------|

| 0-2 | None | No alert shown |

| 3-5 | Info | "Monitor Your Recovery" |

| 6-8 | Warning | "Consider Lighter Intensity" |

| 9+ | Critical | "Rest Day Recommended" |

### Reason Messages (User-Facing, No Points Shown)

- Consecutive: "{N} consecutive training days"
- Energy: "Low energy" (value 2) or "Very low energy" (value 1)
- Soreness: "Elevated soreness" (value 4) or "High soreness" (value 5)
- Sleep: "Slightly under-rested" (7h) / "Insufficient sleep" (6h) / "Significant sleep deficit" (5h or less)

---

## UI/UX Design

### Home Page Layout

```
┌─────────────────────────────────────┐
│  CrossfitToolkit              Settings │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Warning: Consider Lighter       ││  <- Recovery Alert
│  │ Intensity                       ││     (only if score >= 3)
│  │                                 ││
│  │ - 3 consecutive training days   ││
│  │ - Low energy                    ││
│  │ - Insufficient sleep (6h)       ││
│  │                                 ││
│  │ [Got it]       [Log Rest Day]   ││
│  └─────────────────────────────────┘│
│                                     │
│  [ Search PR item or benchmark ]    │  <- Search bar
│                                     │
│  --- Quick Check-in ---             │
│  ┌─────────────────────────────────┐│
│  │ Energy                          ││
│  │ [Exhausted][Low][OK][Good][Great]│  <- 5 emoji buttons
│  │                                 ││
│  │ Soreness                        ││
│  │ [None][Light][Mod][High][Severe]││
│  │                                 ││
│  │ Sleep                           ││
│  │ [5h] [6h] [7h] [8h] [9h+]       ││  <- Preset buttons
│  │                                 ││
│  │          [ Save ]               ││
│  └─────────────────────────────────┘│
│                                     │
│  Star Favorites                     │
│  [Fran] [Grace] [Back Squat]        │
│                                     │
│  Clock Recent Logs                  │
│  ┌─────────────────────────────────┐│
│  │ Fran           4:32 Rx  Jan 22  ││
│  │ Back Squat     275 lb   Jan 21  ││
│  └─────────────────────────────────┘│
│                                     │
│  Target Active Goals                │
│  ┌─────────────────────────────────┐│
│  │ Back Squat    275 -> 300 lb     ││
│  │ ████████░░░░░░░░  72%   14d     ││
│  └─────────────────────────────────┘│
│                                     │
│  [Timer]    [Goals]    [+ Log PR]   │
│                                     │
├─────────────────────────────────────┤
│  Home   Search   Clock   Settings   │  <- Bottom nav (no Journal)
└─────────────────────────────────────┘
```

### After Check-in Saved (Same Day)

```
┌─────────────────────────────────────┐
│  --- Today's Check-in ---           │
│  ┌─────────────────────────────────┐│
│  │ Energy: Good (4/5)              ││
│  │ Soreness: Light (2/5)           ││
│  │ Sleep: 7h                       ││
│  │                                 ││
│  │              [Edit]             ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### No Check-in Yet (Initial Prompt)

```
┌─────────────────────────────────────┐
│  --- Quick Check-in ---             │
│  ┌─────────────────────────────────┐│
│  │  [< Jan 23] [Today: Jan 24] [>] ││  <- Date picker (default today)
│  │                                 ││
│  │  Did you train today?           ││
│  │                                 ││
│  │  [ Training ]    [ Rest Day ]   ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

**Date Selection:**
- Default to today
- Allow selecting past dates (up to 30 days back)
- No future dates allowed
- Arrow buttons for quick prev/next day navigation
- "Today" button to quickly return to current date

- **Training**: Expands to show energy/soreness/sleep inputs
- **Rest Day**: Immediately saves as rest day (no metrics)

### Recovery Alert Variants

| Level | Color | Title |

|-------|-------|-------|

| Info (3-5) | Yellow | "Monitor Your Recovery" |

| Warning (6-8) | Orange | "Consider Lighter Intensity" |

| Critical (9+) | Red | "Rest Day Recommended" |

---

## Edge Cases

| Scenario | Handling |

|----------|----------|

| No check-in today | Show collapsed prompt: "How are you feeling today?" |

| Check-in already done | Show summary with Edit button |

| First ever check-in | Show "Keep logging for insights" message |

| Rest day logged | Reset consecutive counter, no metrics collected |

| Gap of 3+ days | Reset consecutive counter, show "Welcome back" |

| New user, no history | Show onboarding prompt in check-in section |

| One check-in per day | Allow edit only, no duplicates |

|| Logging for past date | Date picker shows selected date, "Today" quick return |

|| Past date already logged | Show existing check-in with Edit button |

|| Future date selected | Disabled - cannot log future check-ins |

---

## Integration Points

- [src/pages/Home.tsx](src/pages/Home.tsx): Add QuickCheckIn widget and RecoveryAlert component
- [src/db/index.ts](src/db/index.ts): Add dailyCheckIns table (version 4)
- No changes to navigation (no new pages)

---

## Sample Scenarios

| Scenario | Days | Energy | Soreness | Sleep | Score | Alert |

|----------|------|--------|----------|-------|-------|-------|

| Fresh Monday | 1 | Good (4) | Light (2) | 8h | 2 | None |

| Day 3, tired | 3 | OK (3) | Moderate (3) | 7h | 7 | Warning |

| Pushed hard | 4 | Low (2) | High (4) | 6h | 12 | Critical |

| Bad sleep | 1 | Good (4) | Light (2) | 5h | 7 | Warning |

| Fully rested | 1 | Great (5) | None (1) | 9h | 0 | None |

| Competition week | 5 | Exhausted (1) | Severe (5) | 5h | 17 | Critical |

---

## Documentation Deliverable

Create `docs/RECOVERY_SCORING.md` with:

- Full algorithm specification
- Point formulas and thresholds
- Alert level definitions
- Sample scenarios table
- Edge case handling
- Configuration reference
- Changelog for future updates