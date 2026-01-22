import type { CatalogItem, PRLog, ScoreType } from '../types/catalog';
import type { Goal, GoalWithProgress, TrendStatus } from '../types/goal';
import { formatSecondsToTime } from '../utils/resultParser';
import * as db from '../db';

/**
 * Check if a score type is "lower is better" (e.g., Time)
 */
export const isLowerBetter = (scoreType: ScoreType): boolean => {
  return scoreType === 'Time';
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

/**
 * Check if a goal is achieved based on current value
 */
export const isGoalAchieved = (
  currentValue: number | null,
  targetValue: number,
  scoreType: ScoreType
): boolean => {
  if (currentValue === null) return false;

  if (isLowerBetter(scoreType)) {
    return currentValue <= targetValue;
  }
  return currentValue >= targetValue;
};

/**
 * Calculate days remaining until target date
 */
export const calculateDaysRemaining = (targetDate: string): number => {
  const target = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
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

  const today = new Date();
  const projectedDate = new Date(today.getTime() + daysToTarget * 24 * 60 * 60 * 1000);
  const projectedDateStr = projectedDate.toISOString().split('T')[0];

  const targetDateObj = new Date(targetDate);
  const daysAheadOrBehind =
    (targetDateObj.getTime() - projectedDate.getTime()) / (1000 * 60 * 60 * 24);

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
      return formatSecondsToTime(value);
    case 'Load':
      return `${value}${unit || ''}`;
    case 'Reps':
      return `${value}`;
    case 'Distance':
      return `${value}${unit || 'm'}`;
    case 'Calories':
      return `${value}`;
    case 'Rounds+Reps':
      // Decode from normalized format (rounds * 100 + reps)
      const rounds = Math.floor(value / 100);
      const reps = value % 100;
      return `${rounds}+${reps}`;
    default:
      return `${value}`;
  }
};

/**
 * Get the best PR value for a goal (considering variant/reps filters)
 */
export const getBestPRForGoal = async (
  goal: Goal,
  item: CatalogItem
): Promise<PRLog | undefined> => {
  const logs = await db.getPRLogsForItem(goal.itemId);

  // Filter by variant if specified
  let filteredLogs = goal.variant
    ? logs.filter((log) => log.variant === goal.variant)
    : logs;

  // Filter by reps if specified (for Load items)
  if (goal.reps !== undefined && item.scoreType === 'Load') {
    filteredLogs = filteredLogs.filter((log) => log.reps === goal.reps);
  }

  if (filteredLogs.length === 0) return undefined;

  // Find best PR
  return filteredLogs.reduce((best, current) => {
    if (isLowerBetter(item.scoreType)) {
      return current.resultValue < best.resultValue ? current : best;
    }
    return current.resultValue > best.resultValue ? current : best;
  });
};

/**
 * Get PR logs for trend calculation (filtered by goal criteria)
 */
export const getPRLogsForTrend = async (
  goal: Goal,
  item: CatalogItem
): Promise<PRLog[]> => {
  const logs = await db.getPRLogsForItem(goal.itemId);

  let filteredLogs = goal.variant
    ? logs.filter((log) => log.variant === goal.variant)
    : logs;

  if (goal.reps !== undefined && item.scoreType === 'Load') {
    filteredLogs = filteredLogs.filter((log) => log.reps === goal.reps);
  }

  return filteredLogs;
};

/**
 * Enrich a goal with progress data
 */
export const enrichGoalWithProgress = async (
  goal: Goal,
  item: CatalogItem,
  weightUnit: string = 'kg'
): Promise<GoalWithProgress> => {
  const bestPR = await getBestPRForGoal(goal, item);
  const logs = await getPRLogsForTrend(goal, item);
  const unit = item.scoreType === 'Load' ? weightUnit : undefined;

  const currentValue = bestPR?.resultValue ?? null;
  const currentResult = bestPR?.result ?? null;
  const progress = calculateProgress(currentValue, goal.targetValue, item.scoreType);
  const daysRemaining = calculateDaysRemaining(goal.targetDate);
  const { trend, projectedDate } = calculateTrend(
    logs,
    goal.targetValue,
    goal.targetDate,
    item.scoreType
  );

  return {
    ...goal,
    itemName: item.name,
    currentValue,
    currentResult,
    targetResult: formatValueAsResult(goal.targetValue, item.scoreType, unit),
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
    if (goal.itemId !== log.catalogItemId) continue;

    // Check variant match
    if (goal.variant && goal.variant !== log.variant) continue;

    // Check reps match (for Load items)
    if (goal.reps !== undefined && item.scoreType === 'Load' && goal.reps !== log.reps) {
      continue;
    }

    // Check if this PR achieves the goal
    if (isGoalAchieved(log.resultValue, goal.targetValue, item.scoreType)) {
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
