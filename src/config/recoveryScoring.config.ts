/**
 * Recovery Scoring Configuration
 *
 * All thresholds, weights, and messages for the recovery scoring algorithm.
 * See docs/RECOVERY_SCORING.md for full specification.
 */

// ═══════════════════════════════════════════════════════════════════════════
// METRIC LABELS
// ═══════════════════════════════════════════════════════════════════════════

export const ENERGY_LABELS = {
  1: 'Exhausted',
  2: 'Low',
  3: 'OK',
  4: 'Good',
  5: 'Great',
} as const;

export const SORENESS_LABELS = {
  1: 'None',
  2: 'Light',
  3: 'Moderate',
  4: 'High',
  5: 'Severe',
} as const;

export const SLEEP_OPTIONS = [5, 6, 7, 8, 9] as const;

export const SLEEP_LABELS: Record<number, string> = {
  5: '5h',
  6: '6h',
  7: '7h',
  8: '8h',
  9: '9h+',
};

// ═══════════════════════════════════════════════════════════════════════════
// EMOJI MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

export const ENERGY_EMOJIS: Record<number, string> = {
  1: '😵',
  2: '😔',
  3: '😐',
  4: '🙂',
  5: '😄',
};

export const SORENESS_EMOJIS: Record<number, string> = {
  1: '💪',
  2: '🤏',
  3: '😬',
  4: '😣',
  5: '🤕',
};

// ═══════════════════════════════════════════════════════════════════════════
// POINT CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/** Default minimum sleep hours for "good" recovery */
export const DEFAULT_MIN_SLEEP_HOURS = 7;

/** Maximum sleep deficit points */
export const MAX_SLEEP_DEFICIT_POINTS = 6;

/**
 * Calculate sleep points based on user's minimum sleep threshold.
 * Points scale with how far below the minimum:
 * - At or above min: 0 points
 * - 1 hour below: 2 points
 * - 2 hours below: 4 points
 * - 3+ hours below: 6 points (max)
 */
export const calculateSleepPointsFromThreshold = (
  hours: number,
  minSleepHours: number = DEFAULT_MIN_SLEEP_HOURS
): number => {
  if (hours >= minSleepHours) return 0;
  const deficit = minSleepHours - hours;
  return Math.min(deficit * 2, MAX_SLEEP_DEFICIT_POINTS);
};

/** Maximum points from consecutive training days */
export const MAX_CONSECUTIVE_POINTS = 4;

/** Multiplier for energy points: (5 - value) × WEIGHT */
export const ENERGY_WEIGHT = 1.0;

/** Multiplier for soreness points: (value - 1) × WEIGHT */
export const SORENESS_WEIGHT = 1.0;

// ═══════════════════════════════════════════════════════════════════════════
// ALERT THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════

export type AlertLevel = 'none' | 'info' | 'warning' | 'critical';

export interface AlertThreshold {
  min: number;
  max: number;
  level: AlertLevel;
}

export const ALERT_THRESHOLDS: AlertThreshold[] = [
  { min: 0, max: 2, level: 'none' },
  { min: 3, max: 5, level: 'info' },
  { min: 6, max: 8, level: 'warning' },
  { min: 9, max: Infinity, level: 'critical' },
];

// ═══════════════════════════════════════════════════════════════════════════
// ALERT MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

export const ALERT_TITLES: Record<AlertLevel, string> = {
  none: '',
  info: 'Monitor Your Recovery',
  warning: 'Consider Lighter Intensity',
  critical: 'Rest Day Recommended',
};

export const ALERT_DESCRIPTIONS: Record<AlertLevel, string> = {
  none: '',
  info: "You're showing some signs of fatigue. Listen to your body.",
  warning: 'Multiple recovery factors suggest taking it easy today.',
  critical: 'Your body needs rest. Consider an active recovery or full rest day.',
};

// ═══════════════════════════════════════════════════════════════════════════
// REASON MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export type ReasonMetric = 'consecutive' | 'energy' | 'soreness' | 'sleep';

/**
 * Get user-facing message for consecutive training days.
 * Only shown when days >= 2 (contributes points).
 */
export const getConsecutiveMessage = (days: number): string => {
  return `${days} consecutive training days`;
};

/**
 * Get user-facing message for energy level.
 * Shown whenever energy adds points (value <= 4).
 */
export const getEnergyMessage = (value: number): string | null => {
  if (value === 1) return 'Very low energy';
  if (value === 2) return 'Low energy';
  if (value === 3) return 'Moderate energy';
  if (value === 4) return 'Energy slightly below peak';
  return null;
};

/**
 * Get user-facing message for soreness level.
 * Shown whenever soreness adds points (value >= 2).
 */
export const getSorenessMessage = (value: number): string | null => {
  if (value === 5) return 'High soreness';
  if (value === 4) return 'Elevated soreness';
  if (value === 3) return 'Moderate soreness';
  if (value === 2) return 'Light soreness';
  return null;
};

/**
 * Get user-facing message for sleep deficit.
 * Only shown when sleep < minSleepHours.
 */
export const getSleepMessage = (
  hours: number,
  minSleepHours: number = DEFAULT_MIN_SLEEP_HOURS
): string | null => {
  if (hours >= minSleepHours) return null;
  const deficit = minSleepHours - hours;
  if (deficit >= 3) return 'Significant sleep deficit';
  if (deficit === 2) return 'Insufficient sleep';
  if (deficit === 1) return 'Slightly under-rested';
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// GAP RESET THRESHOLD
// ═══════════════════════════════════════════════════════════════════════════

/** Days of inactivity before consecutive counter resets */
export const GAP_RESET_DAYS = 2;
