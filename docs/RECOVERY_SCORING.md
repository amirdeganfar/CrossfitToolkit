# Recovery Scoring Algorithm

## Overview

The Recovery Scoring system analyzes daily check-in data to provide athletes with intelligent alerts about their recovery status. Users log three simple metrics (energy, soreness, sleep) and receive immediate feedback with actionable recommendations.

---

## Input Metrics

### Energy Level (1-5 scale)

| Value | Label     | Description                |
| ----- | --------- | -------------------------- |
| 1     | Exhausted | Can barely function        |
| 2     | Low       | Noticeably tired           |
| 3     | OK        | Average energy             |
| 4     | Good      | Above average              |
| 5     | Great     | Feeling energized          |

### Soreness Level (1-5 scale)

| Value | Label    | Description                    |
| ----- | -------- | ------------------------------ |
| 1     | None     | No muscle soreness             |
| 2     | Light    | Minimal, doesn't affect movement |
| 3     | Moderate | Noticeable but manageable      |
| 4     | High     | Affects movement quality       |
| 5     | Severe   | Significantly limits function  |

### Sleep Hours (Preset options)

| Hours | Description           |
| ----- | --------------------- |
| 5h    | Significant deficit   |
| 6h    | Insufficient          |
| 7h    | Slightly under        |
| 8h    | Optimal               |
| 9h+   | Well-rested           |

> **Note:** Users can configure their personal "minimum good sleep" threshold in Settings (default: 7h, range: 5-9h). Sleep at or above this threshold incurs no penalty.

---

## Point Calculation

The algorithm calculates fatigue points for each metric. Higher points = more recovery needed.

### Consecutive Training Days

- **Formula**: `(days - 1)`, capped at 4
- **Max Points**: 4
- **Logic**: Training on day 1 = 0 points, day 2 = 1 point, etc.

| Days | Points |
| ---- | ------ |
| 1    | 0      |
| 2    | 1      |
| 3    | 2      |
| 4    | 3      |
| 5+   | 4      |

### Energy Points

- **Formula**: `(5 - value) × 1.0`, but 0 when value ≥ 4 (`ENERGY_NO_PENALTY_MIN`)
- **Max Points**: 4

| Energy Value | Points |
| ------------ | ------ |
| 5 (Great)    | 0      |
| 4 (Good)     | 0      |
| 3 (OK)       | 2      |
| 2 (Low)      | 3      |
| 1 (Exhausted)| 4      |

### Soreness Points

- **Formula**: `(value - 1) × 1.0`, but 0 when value ≤ 2 (`SORENESS_NO_PENALTY_MAX`)
- **Max Points**: 4

| Soreness Value | Points |
| -------------- | ------ |
| 1 (None)       | 0      |
| 2 (Light)      | 0      |
| 3 (Moderate)   | 2      |
| 4 (High)       | 3      |
| 5 (Severe)     | 4      |

### Sleep Points

- **Formula**: `(minSleepHours - hours) × 2`, capped at 6
- **Max Points**: 6
- **Configurable**: Users set `minSleepHours` in Settings (default: 7, range: 5-9)

| Sleep vs Threshold | Points |
| ------------------ | ------ |
| At or above min    | 0      |
| 1 hour below       | 2      |
| 2 hours below      | 4      |
| 3+ hours below     | 6      |

**Example with default (7h):**

| Sleep Hours | Points |
| ----------- | ------ |
| 7h+         | 0      |
| 6h          | 2      |
| 5h          | 4      |
| 4h or less  | 6      |

---

## Alert Levels

Total score determines the alert level displayed to the user.

| Score Range | Level    | Home chip | Title                        | Intent                     |
| ----------- | -------- | --------- | ---------------------------- | -------------------------- |
| 0-1         | None     | Primed    | No alert shown               | Good check-in              |
| 2-4         | Info     | Fair      | "Monitor Your Recovery"      | One mild issue             |
| 5-7         | Warning  | Low       | "Consider Lighter Intensity" | Clear problems             |
| 8+          | Critical | Depleted  | "Rest Day Recommended"       | Multiple severe factors    |

Every metric that adds points has a reason message; a Primed score may have no reasons.

---

## Reason Messages

Each contributing factor displays a user-friendly message (no raw point values shown).

### Consecutive Days Messages

- 2 days: "2 consecutive training days"
- 3 days: "3 consecutive training days"
- 4+ days: "4+ consecutive training days"

### Energy Messages

- Value 3: "Moderate energy"
- Value 2: "Low energy"
- Value 1: "Very low energy"

### Soreness Messages

- Value 3: "Moderate soreness"
- Value 4: "Elevated soreness"
- Value 5: "High soreness"

### Sleep Messages

- 7h: "Slightly under-rested"
- 6h: "Insufficient sleep"
- 5h or less: "Significant sleep deficit"

---

## Sample Scenarios

Default min sleep 7h.

| Scenario                    | Days | Energy | Soreness | Sleep | Score | Level           |
| --------------------------- | ---- | ------ | -------- | ----- | ----- | --------------- |
| Fully rested                | 1    | 5      | 1        | 9h    | 0     | None (Primed)   |
| Good check-in               | 2    | 4      | 2        | 8h    | 1     | None (Primed)   |
| Good, day 3                 | 3    | 4      | 2        | 8h    | 2     | Info (Fair)     |
| Energy OK only              | 1    | 3      | 2        | 8h    | 2     | Info (Fair)     |
| 1h short on sleep only      | 1    | 4      | 2        | 6h    | 2     | Info (Fair)     |
| Bad sleep (2h short)        | 1    | 4      | 2        | 5h    | 4     | Info (Fair)     |
| Day 3, tired                | 3    | 3      | 3        | 7h    | 6     | Warning (Low)   |
| Low energy + high soreness  | 1    | 2      | 4        | 8h    | 6     | Warning (Low)   |
| Exhausted + severe soreness | 1    | 1      | 5        | 8h    | 8     | Critical (Depleted) |
| Pushed hard                 | 4    | 2      | 4        | 6h    | 11    | Critical (Depleted) |
| Competition week            | 5    | 1      | 5        | 5h    | 16    | Critical (Depleted) |

---

## Edge Cases

| Scenario              | Handling                                         |
| --------------------- | ------------------------------------------------ |
| No check-in today     | Show prompt: "How are you feeling today?"        |
| Check-in done         | Show summary with Edit button                    |
| First check-in ever   | Show "Keep logging for insights"                 |
| Rest day logged       | Reset consecutive counter, no metrics collected  |
| Gap of 3+ days        | Reset consecutive counter                        |
| New user, no history  | Show onboarding prompt in check-in section       |
| One check-in per day  | Allow edit only, no duplicates                   |

---

## Configuration Reference

All thresholds and messages are defined in `src/config/recoveryScoring.config.ts`:

- `DEFAULT_MIN_SLEEP_HOURS`: Default minimum sleep threshold (7)
- `calculateSleepPointsFromThreshold()`: Dynamic sleep scoring based on user setting
- `ALERT_THRESHOLDS`: Score ranges for each alert level
- `ALERT_MESSAGES`: User-facing titles for each level
- `REASON_MESSAGES`: Templates for each factor

**User Setting:** `minSleepHours` in Settings page (Recovery section)

---

## Changelog

| Version | Date       | Changes                                      |
| ------- | ---------- | -------------------------------------------- |
| 1.2     | 2026-11-06 | Energy 4 / soreness 2 score 0; thresholds 0-1 / 2-4 / 5-7 / 8+ (good check-ins now Primed) |
| 1.1     | 2026-01-24 | Added configurable min sleep hours setting   |
| 1.0     | 2026-01-23 | Initial algorithm design                     |
