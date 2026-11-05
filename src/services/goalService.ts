import type { CatalogItem, PRLog, ScoreType } from '../types/catalog';
import type { Goal, GoalWithProgress, TrendStatus } from '../types/goal';
import { formatSecondsToTime } from '../utils/resultParser';
import { isLowerBetter as scoreTypeIsLowerBetter, getLogScoreType } from '../config/scoreTypes';
import * as db from '../db';
import { todayLocal, daysBetween, addDaysLocal, toLocalDateString } from '../utils/date';
import {
  convertWeight,
  convertDistance,
  formatWeight,
  formatDistance,
  type WeightUnit,
  type DistanceUnit,
} from '../utils/units';

/**
 * Check if a score type is "lower is better" (e.g., Time)
 */
export const isLowerBetter = (scoreType: ScoreType): boolean => scoreTypeIsLowerBetter(scoreType);

/**
 * The score type a goal targets. For multi-mode items a goal binds to one score
 * pool; single-mode goals (and all legacy goals) fall back to the item's primary
 * score type — so behavior is unchanged for them.
 */
const goalScoreType = (goal: Goal, item: CatalogItem): ScoreType =>
  goal.scoreTypeId ?? item.scoreType;

/**
 * Whether a log counts toward a goal: same variant, rep scheme (Load), score
 * pool (multi-mode items: effective score type + constraint) and distance
 * (Time goals on distance items, e.g. a 5k goal ignores 400m runs).
 * Legacy goals without the optional fields match as before.
 */
const logMatchesGoal = (log: PRLog, goal: Goal, item: CatalogItem): boolean => {
  if (log.catalogItemId !== goal.itemId) return false;
  if (goal.variant && log.variant !== goal.variant) return false;
  // Missing reps means 1RM on both sides (UI convention: `reps ?? 1`).
  if (goalScoreType(goal, item) === 'Load' && (log.reps ?? 1) !== (goal.reps ?? 1)) {
    return false;
  }
  if (goal.scoreTypeId) {
    if (getLogScoreType(log, item) !== goal.scoreTypeId) return false;
    if (goal.timeCap !== undefined && log.timeCap !== goal.timeCap) return false;
    if (goal.targetReps !== undefined && log.targetReps !== goal.targetReps) return false;
  }
  if (goal.distance !== undefined && log.distance !== goal.distance) return false;
  return true;
};

/**
 * A log's numeric value expressed in the goal's stored unit, so it can be
 * compared with `goal.targetValue` regardless of the units each was entered in.
 */
const logValueInGoalUnit = (log: PRLog, goal: Goal, scoreType: ScoreType): number => {
  if (scoreType === 'Load' && goal.unit) {
    return convertWeight(log.resultValue, log.unit, goal.unit);
  }
  if (scoreType === 'Distance' && goal.distanceUnit) {
    return convertDistance(log.resultValue, log.distanceUnit, goal.distanceUnit);
  }
  return log.resultValue;
};

/** Matching logs with `resultValue` normalized to the goal's unit. */
const getNormalizedGoalLogs = (logs: PRLog[], goal: Goal, item: CatalogItem): PRLog[] => {
  const scoreType = goalScoreType(goal, item);
  return logs
    .filter((log) => logMatchesGoal(log, goal, item))
    .map((log) => ({ ...log, resultValue: logValueInGoalUnit(log, goal, scoreType) }));
};

/** Best log by resultValue for the score type's direction. */
const pickBest = (logs: PRLog[], scoreType: ScoreType): PRLog | undefined => {
  if (logs.length === 0) return undefined;
  const lowerBetter = isLowerBetter(scoreType);
  return logs.reduce((best, current) => {
    if (lowerBetter) {
      return current.resultValue < best.resultValue ? current : best;
    }
    return current.resultValue > best.resultValue ? current : best;
  });
};

/**
 * Calculate progress percentage toward a goal
 * Returns 0-100 (capped at 100)
 */
export const calculateProgress = (
  currentValue: number | null,
  targetValue: number,
  scoreType: ScoreType
): number => {
  if (currentValue === null || currentValue === 0) return 0;

  let progress: number;

  if (isLowerBetter(scoreType)) {
    // For Time: progress = (target / current) * 100
    // If current is 5:00 and target is 4:00, progress = (240/300) * 100 = 80%
    progress = (targetValue / currentValue) * 100;
  } else {
    // For Load/Reps: progress = (current / target) * 100
    // If current is 275 and target is 300, progress = (275/300) * 100 = 91.7%
    progress = (currentValue / targetValue) * 100;
  }

  return Math.min(Math.max(progress, 0), 100);
};

const roundTenth = (value: number): number => Math.round(value * 10) / 10;

/**
 * Check if a goal is achieved based on current value
 */
export const isGoalAchieved = (
  currentValue: number | null,
  targetValue: number,
  scoreType: ScoreType
): boolean => {
  if (currentValue === null) return false;

  // Round to 0.1 (the display precision) so kg↔lb conversion noise
  // (e.g. 220.462lb → 99.99999kg vs a 100kg target) still counts.
  const current = roundTenth(currentValue);
  const target = roundTenth(targetValue);
  if (isLowerBetter(scoreType)) {
    return current <= target;
  }
  return current >= target;
};

/**
 * Calculate days remaining until target date
 */
export const calculateDaysRemaining = (targetDate: string): number => {
  // Local calendar-day diff (DST-safe)
  return daysBetween(todayLocal(), targetDate);
};

/**
 * Calculate trend based on recent PR progress
 * Uses linear regression to project achievement date
 */
export const calculateTrend = (
  logs: PRLog[],
  targetValue: number,
  targetDate: string,
  scoreType: ScoreType
): { trend: TrendStatus; projectedDate?: string } => {
  if (logs.length < 2) {
    return { trend: 'no_data' };
  }

  // Sort logs by date (oldest first)
  const sortedLogs = [...logs].sort((a, b) => a.date - b.date);

  // Take last 5 logs for trend calculation
  const recentLogs = sortedLogs.slice(-5);

  // Calculate linear regression
  const n = recentLogs.length;
  const xValues = recentLogs.map((_, i) => i);
  const yValues = recentLogs.map((log) => log.resultValue);

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
  const sumXX = xValues.reduce((acc, x) => acc + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // If slope is zero or opposite direction needed, no useful trend
  if (slope === 0) {
    return { trend: 'no_data' };
  }

  // For Time (lower is better), we need negative slope (improving)
  // For Load/Reps (higher is better), we need positive slope (improving)
  const isImproving = isLowerBetter(scoreType) ? slope < 0 : slope > 0;

  if (!isImproving) {
    return { trend: 'behind' };
  }

  // Calculate when we'll reach target value
  // y = mx + b, solve for x: x = (y - b) / m
  const logsToTarget = (targetValue - intercept) / slope;
  const currentLogIndex = n - 1;
  const logsNeeded = logsToTarget - currentLogIndex;

  // Estimate days based on average days between logs
  const daySpan =
    (recentLogs[n - 1].date - recentLogs[0].date) / (1000 * 60 * 60 * 24);
  const avgDaysPerLog = daySpan / (n - 1);
  const daysToTarget = logsNeeded * avgDaysPerLog;

  // Projection too far out (or degenerate) to be meaningful
  if (!Number.isFinite(daysToTarget) || Math.abs(daysToTarget) > 365 * 100) {
    return { trend: 'behind' };
  }

  // `logsNeeded` counts from the LAST log, so project from that log's date
  // (local calendar days, same basis as targetDate).
  const lastLogDate = toLocalDateString(new Date(recentLogs[n - 1].date));
  const projectedDateStr = addDaysLocal(lastLogDate, Math.round(daysToTarget));
  const daysAheadOrBehind = daysBetween(projectedDateStr, targetDate);

  let trend: TrendStatus;
  if (daysAheadOrBehind >= 7) {
    trend = 'ahead';
  } else if (daysAheadOrBehind >= -7) {
    trend = 'on_track';
  } else {
    trend = 'behind';
  }

  return { trend, projectedDate: projectedDateStr };
};

/**
 * Format a numeric value as a result string
 */
export const formatValueAsResult = (
  value: number,
  scoreType: ScoreType,
  unit?: string
): string => {
  switch (scoreType) {
    case 'Time':
    case 'TimeForReps':
      return formatSecondsToTime(value);
    case 'Load':
      return `${value}${unit || ''}`;
    case 'Reps':
    case 'RepsInTime':
      return `${value}`;
    case 'Distance':
      return `${value}${unit || 'm'}`;
    case 'Calories':
      return `${value}`;
    case 'Rounds+Reps': {
      // Decode from normalized format (rounds * 100 + reps)
      const rounds = Math.floor(value / 100);
      const reps = value % 100;
      return `${rounds}+${reps}`;
    }
    default:
      return `${value}`;
  }
};

/**
 * Get the best PR for a goal (matching variant/reps/pool/distance).
 * The returned log's `resultValue` is converted to the goal's unit.
 */
export const getBestPRForGoal = async (
  goal: Goal,
  item: CatalogItem
): Promise<PRLog | undefined> => {
  const logs = getNormalizedGoalLogs(await db.getPRLogsForItem(goal.itemId), goal, item);
  return pickBest(logs, goalScoreType(goal, item));
};

/**
 * Get PR logs for trend calculation (filtered by goal criteria, values in goal unit)
 */
export const getPRLogsForTrend = async (
  goal: Goal,
  item: CatalogItem
): Promise<PRLog[]> => {
  return getNormalizedGoalLogs(await db.getPRLogsForItem(goal.itemId), goal, item);
};

/**
 * Format a value stored in the goal's unit for display in the user's unit.
 */
const formatGoalValue = (
  value: number,
  goal: Goal,
  scoreType: ScoreType,
  weightUnit: WeightUnit,
  distanceUnit: DistanceUnit
): string => {
  if (scoreType === 'Load') return formatWeight(value, goal.unit, weightUnit);
  if (scoreType === 'Distance') return formatDistance(value, goal.distanceUnit, distanceUnit);
  return formatValueAsResult(value, scoreType);
};

/**
 * Enrich a goal with progress data.
 * `weightUnit`/`distanceUnit` are the DISPLAY units for currentResult/targetResult.
 */
export const enrichGoalWithProgress = async (
  goal: Goal,
  item: CatalogItem,
  weightUnit: string = 'kg',
  distanceUnit: string = 'm'
): Promise<GoalWithProgress> => {
  const logs = await getPRLogsForTrend(goal, item);
  const scoreType = goalScoreType(goal, item);
  const bestPR = pickBest(logs, scoreType);
  const displayWeight = weightUnit as WeightUnit;
  const displayDistance = distanceUnit as DistanceUnit;

  const currentValue = bestPR?.resultValue ?? null;
  const currentResult =
    currentValue === null
      ? null
      : formatGoalValue(currentValue, goal, scoreType, displayWeight, displayDistance);
  const progress = calculateProgress(currentValue, goal.targetValue, scoreType);
  const daysRemaining = calculateDaysRemaining(goal.targetDate);
  const { trend, projectedDate } = calculateTrend(
    logs,
    goal.targetValue,
    goal.targetDate,
    scoreType
  );

  return {
    ...goal,
    itemName: item.name,
    currentValue,
    currentResult,
    targetResult: formatGoalValue(goal.targetValue, goal, scoreType, displayWeight, displayDistance),
    progress,
    daysRemaining,
    trend,
    projectedDate,
  };
};

/**
 * Check if a new PR achieves any active goals
 * Returns array of goal IDs that were achieved
 */
export const checkGoalsOnNewPR = async (
  log: PRLog,
  item: CatalogItem
): Promise<string[]> => {
  const activeGoals = await db.getActiveGoals();
  const achievedGoalIds: string[] = [];

  for (const goal of activeGoals) {
    if (!logMatchesGoal(log, goal, item)) continue;

    const scoreType = goalScoreType(goal, item);
    if (isGoalAchieved(logValueInGoalUnit(log, goal, scoreType), goal.targetValue, scoreType)) {
      achievedGoalIds.push(goal.id);
    }
  }

  return achievedGoalIds;
};

/**
 * Get reps label for display (e.g., "1RM", "3RM", "5 reps")
 */
export const getRepsLabel = (reps: number | undefined): string => {
  if (reps === undefined) return '';
  if (reps === 1) return '1RM';
  if (reps <= 5) return `${reps}RM`;
  return `${reps} reps`;
};
