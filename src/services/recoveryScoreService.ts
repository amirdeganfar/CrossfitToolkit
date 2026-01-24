/**
 * Recovery Score Service
 *
 * Calculates recovery scores based on daily check-in data.
 * See docs/RECOVERY_SCORING.md for algorithm specification.
 */

import {
  MAX_CONSECUTIVE_POINTS,
  ENERGY_WEIGHT,
  SORENESS_WEIGHT,
  ALERT_THRESHOLDS,
  DEFAULT_MIN_SLEEP_HOURS,
  calculateSleepPointsFromThreshold,
  getConsecutiveMessage,
  getEnergyMessage,
  getSorenessMessage,
  getSleepMessage,
  type AlertLevel,
} from '../config/recoveryScoring.config';
import type {
  DailyCheckIn,
  RecoveryScore,
  RecoveryReason,
  RecoveryScoreInput,
} from '../types/training';

// ═══════════════════════════════════════════════════════════════════════════
// POINT CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate points for consecutive training days.
 * Formula: (days - 1), capped at MAX_CONSECUTIVE_POINTS
 */
export const calculateConsecutivePoints = (days: number): number => {
  if (days <= 1) return 0;
  return Math.min(days - 1, MAX_CONSECUTIVE_POINTS);
};

/**
 * Calculate points for energy level.
 * Formula: (5 - value) × ENERGY_WEIGHT
 * Lower energy = more points
 */
export const calculateEnergyPoints = (energy: number): number => {
  return (5 - energy) * ENERGY_WEIGHT;
};

/**
 * Calculate points for soreness level.
 * Formula: (value - 1) × SORENESS_WEIGHT
 * Higher soreness = more points
 */
export const calculateSorenessPoints = (soreness: number): number => {
  return (soreness - 1) * SORENESS_WEIGHT;
};

/**
 * Calculate points for sleep hours.
 * Uses user's minimum sleep threshold for scoring.
 */
export const calculateSleepPoints = (
  hours: number,
  minSleepHours: number = DEFAULT_MIN_SLEEP_HOURS
): number => {
  return calculateSleepPointsFromThreshold(hours, minSleepHours);
};

// ═══════════════════════════════════════════════════════════════════════════
// ALERT LEVEL DETERMINATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine alert level from total score.
 */
export const getAlertLevel = (totalScore: number): AlertLevel => {
  for (const threshold of ALERT_THRESHOLDS) {
    if (totalScore >= threshold.min && totalScore <= threshold.max) {
      return threshold.level;
    }
  }
  return 'none';
};

// ═══════════════════════════════════════════════════════════════════════════
// REASON GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build reasons array from check-in data.
 * Only includes factors that contribute meaningfully to the score.
 */
export const buildReasons = (
  consecutiveDays: number,
  checkIn: DailyCheckIn | null,
  minSleepHours: number = DEFAULT_MIN_SLEEP_HOURS
): RecoveryReason[] => {
  const reasons: RecoveryReason[] = [];

  // Consecutive days (only if 2+)
  if (consecutiveDays >= 2) {
    const points = calculateConsecutivePoints(consecutiveDays);
    reasons.push({
      metric: 'consecutive',
      points,
      message: getConsecutiveMessage(consecutiveDays),
    });
  }

  if (!checkIn || checkIn.type === 'rest') {
    return reasons;
  }

  // Energy (only if low: 1-2)
  if (checkIn.energy && checkIn.energy <= 2) {
    const points = calculateEnergyPoints(checkIn.energy);
    const message = getEnergyMessage(checkIn.energy);
    if (message) {
      reasons.push({
        metric: 'energy',
        points,
        message,
      });
    }
  }

  // Soreness (only if high: 4-5)
  if (checkIn.soreness && checkIn.soreness >= 4) {
    const points = calculateSorenessPoints(checkIn.soreness);
    const message = getSorenessMessage(checkIn.soreness);
    if (message) {
      reasons.push({
        metric: 'soreness',
        points,
        message,
      });
    }
  }

  // Sleep (only if under user's minimum threshold)
  if (checkIn.sleepHours && checkIn.sleepHours < minSleepHours) {
    const points = calculateSleepPoints(checkIn.sleepHours, minSleepHours);
    const message = getSleepMessage(checkIn.sleepHours, minSleepHours);
    if (message) {
      reasons.push({
        metric: 'sleep',
        points,
        message,
      });
    }
  }

  return reasons;
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCORING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate recovery score from input data.
 *
 * @param input - Consecutive days count, today's check-in (if any), and user's min sleep hours
 * @returns RecoveryScore with total points, alert level, and reasons
 */
export const calculateRecoveryScore = (input: RecoveryScoreInput): RecoveryScore => {
  const { consecutiveDays, checkIn, minSleepHours = DEFAULT_MIN_SLEEP_HOURS } = input;

  // If no check-in or rest day, only consecutive days contribute
  if (!checkIn || checkIn.type === 'rest') {
    const consecutivePoints = calculateConsecutivePoints(consecutiveDays);
    const reasons = buildReasons(consecutiveDays, checkIn, minSleepHours);

    return {
      total: consecutivePoints,
      level: getAlertLevel(consecutivePoints),
      reasons,
    };
  }

  // Calculate individual components
  const consecutivePoints = calculateConsecutivePoints(consecutiveDays);
  const energyPoints = checkIn.energy ? calculateEnergyPoints(checkIn.energy) : 0;
  const sorenessPoints = checkIn.soreness ? calculateSorenessPoints(checkIn.soreness) : 0;
  const sleepPoints = checkIn.sleepHours ? calculateSleepPoints(checkIn.sleepHours, minSleepHours) : 0;

  const total = consecutivePoints + energyPoints + sorenessPoints + sleepPoints;
  const level = getAlertLevel(total);
  const reasons = buildReasons(consecutiveDays, checkIn, minSleepHours);

  return {
    total,
    level,
    reasons,
  };
};

/**
 * Check if a recovery score should show an alert.
 */
export const shouldShowAlert = (score: RecoveryScore): boolean => {
  return score.level !== 'none';
};
