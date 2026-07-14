import type { ScoreType } from '../types/catalog';
import { SCORE_TYPES } from '../config/scoreTypes';

// Primitive parsers now live in the score-type registry (the leaf source of
// truth). Re-exported here so existing call sites keep importing them from
// `resultParser` unchanged.
export { parseTimeToSeconds, formatSecondsToTime, parseRoundsReps } from '../config/scoreTypes';

/**
 * Parse any result string to a numeric value for comparison
 */
export const parseResultToValue = (result: string, scoreType: ScoreType): number =>
  SCORE_TYPES[scoreType].parse(result);

/**
 * Compare two results and determine which is better
 * Returns positive if result1 is better, negative if result2 is better, 0 if equal
 */
export const compareResults = (
  result1: number,
  result2: number,
  scoreType: ScoreType
): number => {
  if (SCORE_TYPES[scoreType].lowerIsBetter) {
    return result2 - result1; // Lower is better, so if result1 < result2, return positive
  }
  return result1 - result2; // Higher is better
};

/**
 * Format result for display based on score type
 */
export const formatResult = (result: string, scoreType: ScoreType, unit?: string): string =>
  SCORE_TYPES[scoreType].format(result, unit);

/**
 * Format a compound result (with reps/distance) for display
 */
export const formatCompoundResult = (
  result: string,
  scoreType: ScoreType,
  options?: {
    reps?: number;
    distance?: number;
    weightUnit?: string;
    distanceUnit?: string;
  }
): string => {
  const { reps, distance, weightUnit = 'kg', distanceUnit = 'm' } = options || {};

  switch (scoreType) {
    case 'Load':
      // Format as "5 reps @ 100kg" or "1RM @ 100kg"
      if (reps === 1) {
        return `1RM @ ${result}${weightUnit}`;
      } else if (reps && reps > 1) {
        return `${reps} reps @ ${result}${weightUnit}`;
      }
      return `${result}${weightUnit}`;

    case 'Distance':
      // Format as "200m in 0:30"
      if (distance) {
        return `${distance}${distanceUnit} in ${result}`;
      }
      return `${result}${distanceUnit}`;

    default:
      return SCORE_TYPES[scoreType].format(result, weightUnit);
  }
};

/**
 * Get the label for the result field based on score type
 */
export const getResultLabel = (scoreType: ScoreType): string => SCORE_TYPES[scoreType].resultLabel;

/**
 * Validate a result input based on score type
 */
export const validateResult = (result: string, scoreType: ScoreType): boolean => {
  if (!result.trim()) return false;
  return SCORE_TYPES[scoreType].validate(result);
};

/**
 * Get placeholder text for result input based on score type
 */
export const getResultPlaceholder = (scoreType: ScoreType): string => SCORE_TYPES[scoreType].placeholder;
