/**
 * Recovery Score Service
 *
 * Calculates recovery scores based on daily check-in data.
 * See docs/RECOVERY_SCORING.md for algorithm specification.
 */

import {
  MAX_CONSECUTIVE_POINTS,
  ENERGY_WEIGHT,
  ENERGY_NO_PENALTY_MIN,
  SORENESS_WEIGHT,
  SORENESS_NO_PENALTY_MAX,
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
 * Formula: (5 - value) × ENERGY_WEIGHT; 0 at or above ENERGY_NO_PENALTY_MIN.
 * Lower energy = more points
 */
export const calculateEnergyPoints = (energy: number): number => {
  if (energy >= ENERGY_NO_PENALTY_MIN) return 0;
  return (5 - energy) * ENERGY_WEIGHT;
};

/**
 * Calculate points for soreness level.
 * Formula: (value - 1) × SORENESS_WEIGHT; 0 at or below SORENESS_NO_PENALTY_MAX.
 * Higher soreness = more points
 */
export const calculateSorenessPoints = (soreness: number): number => {
  if (soreness <= SORENESS_NO_PENALTY_MAX) return 0;
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

  // Energy (whenever it adds points, so every point has a matching reason)
  if (checkIn.energy) {
    const points = calculateEnergyPoints(checkIn.energy);
    const message = getEnergyMessage(checkIn.energy);
    if (points > 0 && message) {
      reasons.push({
        metric: 'energy',
        points,
        message,
      });
    }
  }

  // Soreness (whenever it adds points)
  if (checkIn.soreness) {
    const points = calculateSorenessPoints(checkIn.soreness);
    const message = getSorenessMessage(checkIn.soreness);
    if (points > 0 && message) {
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
