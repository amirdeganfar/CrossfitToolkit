import type { ScoreType } from '../types/catalog';

/**
 * Parse a time string (MM:SS or HH:MM:SS) to seconds
 */
export const parseTimeToSeconds = (time: string): number => {
  const parts = time.split(':').map(Number);
  if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
};

/**
 * Format seconds to time string (MM:SS or HH:MM:SS)
 */
export const formatSecondsToTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Parse Rounds+Reps format (e.g., "18+5") to total reps equivalent
 * Assumes a standard round of ~15 reps for comparison purposes
 */
export const parseRoundsReps = (value: string): number => {
  const match = value.match(/^(\d+)\+(\d+)$/);
  if (match) {
    const rounds = parseInt(match[1], 10);
    const reps = parseInt(match[2], 10);
    return rounds * 100 + reps; // Normalize for comparison
  }
  return parseInt(value, 10) || 0;
};

/**
 * Parse any result string to a numeric value for comparison
 */
export const parseResultToValue = (result: string, scoreType: ScoreType): number => {
  switch (scoreType) {
    case 'Time':
      return parseTimeToSeconds(result);
    case 'Load':
    case 'Reps':
    case 'Distance':
    case 'Calories':
      return parseFloat(result) || 0;
    case 'Rounds+Reps':
      return parseRoundsReps(result);
    default:
      return 0;
  }
};

/**
 * Compare two results and determine which is better
 * Returns positive if result1 is better, negative if result2 is better, 0 if equal
 */
export const compareResults = (
  result1: number,
  result2: number,
  scoreType: ScoreType
): number => {
  const isLowerBetter = scoreType === 'Time';
  if (isLowerBetter) {
    return result2 - result1; // Lower is better, so if result1 < result2, return positive
  }
  return result1 - result2; // Higher is better
};

/**
 * Format result for display based on score type
 */
export const formatResult = (result: string, scoreType: ScoreType, unit?: string): string => {
  switch (scoreType) {
    case 'Time':
      return result; // Already formatted as MM:SS
    case 'Load':
      return `${result}${unit || 'kg'}`;
    case 'Reps':
      return `${result} reps`;
    case 'Distance':
      return `${result}${unit || 'm'}`;
    case 'Calories':
      return `${result} cal`;
    case 'Rounds+Reps':
      return result; // Already formatted as "18+5"
    default:
      return result;
  }
};

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

    case 'Time':
      return result;

    case 'Reps':
      return `${result} reps`;

    case 'Calories':
      return `${result} cal`;

    case 'Rounds+Reps':
      return result;

    default:
      return result;
  }
};

/**
 * Get the label for the result field based on score type
 */
export const getResultLabel = (scoreType: ScoreType): string => {
  switch (scoreType) {
    case 'Time':
      return 'Time';
    case 'Load':
      return 'Weight';
    case 'Reps':
      return 'Reps';
    case 'Distance':
      return 'Time';
    case 'Calories':
      return 'Calories';
    case 'Rounds+Reps':
      return 'Rounds + Reps';
    default:
      return 'Result';
  }
};

/**
 * Validate a result input based on score type
 */
export const validateResult = (result: string, scoreType: ScoreType): boolean => {
  if (!result.trim()) return false;

  switch (scoreType) {
    case 'Time':
      // Validate MM:SS or HH:MM:SS format
      return /^(\d{1,2}:)?\d{1,2}:\d{2}$/.test(result);
    case 'Rounds+Reps':
      // Validate "N+N" or just "N" format
      return /^\d+(\+\d+)?$/.test(result);
    case 'Load':
    case 'Reps':
    case 'Distance':
    case 'Calories':
      // Validate numeric (with optional decimal)
      return /^\d+(\.\d+)?$/.test(result);
    default:
      return true;
  }
};

/**
 * Get placeholder text for result input based on score type
 */
export const getResultPlaceholder = (scoreType: ScoreType): string => {
  switch (scoreType) {
    case 'Time':
      return 'e.g., 4:32 or 1:05:30';
    case 'Load':
      return 'e.g., 100';
    case 'Reps':
      return 'e.g., 25';
    case 'Distance':
      return 'e.g., 1000';
    case 'Calories':
      return 'e.g., 50';
    case 'Rounds+Reps':
      return 'e.g., 18+5';
    default:
      return '';
  }
};
