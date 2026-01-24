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

- **Formula**: `(5 - value) × 1.0`
- **Max Points**: 4

| Energy Value | Points |
| ------------ | ------ |
| 5 (Great)    | 0      |
| 4 (Good)     | 1      |
| 3 (OK)       | 2      |
| 2 (Low)      | 3      |
| 1 (Exhausted)| 4      |

### Soreness Points

- **Formula**: `(value - 1) × 1.0`
- **Max Points**: 4

| Soreness Value | Points |
| -------------- | ------ |
| 1 (None)       | 0      |
| 2 (Light)      | 1      |
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

| Score Range | Level    | Title                        | Color  |
| ----------- | -------- | ---------------------------- | ------ |
| 0-2         | None     | No alert shown               | —      |
| 3-5         | Info     | "Monitor Your Recovery"      | Yellow |
| 6-8         | Warning  | "Consider Lighter Intensity" | Orange |
| 9+          | Critical | "Rest Day Recommended"       | Red    |

---

## Reason Messages

Each contributing factor displays a user-friendly message (no raw point values shown).

### Consecutive Days Messages

- 2 days: "2 consecutive training days"
- 3 days: "3 consecutive training days"
- 4+ days: "4+ consecutive training days"

### Energy Messages

- Value 2: "Low energy"
- Value 1: "Very low energy"

### Soreness Messages

- Value 4: "Elevated soreness"
- Value 5: "High soreness"

### Sleep Messages

- 7h: "Slightly under-rested"
- 6h: "Insufficient sleep"
- 5h or less: "Significant sleep deficit"

---

## Sample Scenarios

| Scenario         | Days | Energy | Soreness | Sleep | Score | Alert    |
| ---------------- | ---- | ------ | -------- | ----- | ----- | -------- |
| Fresh Monday     | 1    | 4      | 2        | 8h    | 2     | None     |
| Day 3, tired     | 3    | 3      | 3        | 7h    | 7     | Warning  |
| Pushed hard      | 4    | 2      | 4        | 6h    | 12    | Critical |
| Bad sleep        | 1    | 4      | 2        | 5h    | 7     | Warning  |
| Fully rested     | 1    | 5      | 1        | 9h    | 0     | None     |
| Competition week | 5    | 1      | 5        | 5h    | 17    | Critical |

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
| 1.1     | 2026-01-24 | Added configurable min sleep hours setting   |
| 1.0     | 2026-01-23 | Initial algorithm design                     |
