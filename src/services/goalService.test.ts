import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import type { CatalogItem, PRLog } from '../types/catalog';
import type { Goal } from '../types/goal';
import {
  calculateDaysRemaining,
  calculateProgress,
  calculateTrend,
  checkGoalsOnNewPR,
  formatValueAsResult,
  getBestPRForGoal,
  isGoalAchieved,
} from './goalService';

const makeItem = (overrides: Partial<CatalogItem> = {}): CatalogItem => ({
  id: 'item-1',
  name: 'Back Squat',
  category: 'Lift',
  scoreType: 'Load',
  isBuiltin: true,
  isFavorite: false,
  createdAt: 0,
  ...overrides,
});

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 'goal-1',
  itemId: 'item-1',
  targetValue: 100,
  targetDate: '2026-12-31',
  createdAt: '2026-01-01',
  status: 'active',
  ...overrides,
});

let logSeq = 0;
const makeLog = (overrides: Partial<PRLog> = {}): PRLog => ({
  id: `log-${++logSeq}`,
  catalogItemId: 'item-1',
  result: '100',
  resultValue: 100,
  variant: null,
  date: new Date(2026, 0, 1, 12).getTime(),
  createdAt: 0,
  ...overrides,
});

/** Local-noon timestamp for a calendar date. */
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe('isGoalAchieved', () => {
  it('counts kg↔lb conversion noise just under the target as achieved', () => {
    const lbAsKg = 220.462 * 0.45359237; // 99.99996…

    expect(isGoalAchieved(lbAsKg, 100, 'Load')).toBe(true);
  });

  it('is not achieved one display step below the target', () => {
    expect(isGoalAchieved(99.9, 100, 'Load')).toBe(false);
  });

  it('is achieved for a lower time when lower is better', () => {
    expect(isGoalAchieved(239, 240, 'Time')).toBe(true);
    expect(isGoalAchieved(240, 240, 'Time')).toBe(true);
  });

  it('is not achieved for a slower time', () => {
    expect(isGoalAchieved(241, 240, 'Time')).toBe(false);
  });

  it('is not achieved without a current value', () => {
    expect(isGoalAchieved(null, 100, 'Load')).toBe(false);
  });
});

describe('calculateProgress', () => {
  it('is current/target for higher-is-better', () => {
    expect(calculateProgress(75, 100, 'Load')).toBe(75);
  });

  it('is target/current for lower-is-better', () => {
    expect(calculateProgress(300, 240, 'Time')).toBe(80);
  });

  it('caps at 100', () => {
    expect(calculateProgress(120, 100, 'Load')).toBe(100);
  });

  it('is 0 without a result', () => {
    expect(calculateProgress(null, 100, 'Load')).toBe(0);
  });
});

describe('calculateDaysRemaining', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts calendar days across a DST change late in the evening', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 3, 23, 30));

    expect(calculateDaysRemaining('2026-10-05')).toBe(2);
  });

  it('uses the local date early in the morning when UTC is still yesterday', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 15, 0, 30)); // 2026-01-14T13:30Z

    expect(calculateDaysRemaining('2026-01-16')).toBe(1);
  });

  it('is negative once the target date has passed', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 15, 9));

    expect(calculateDaysRemaining('2026-01-10')).toBe(-5);
  });
});

describe('calculateTrend', () => {
  it('has no data with fewer than two logs', () => {
    expect(calculateTrend([makeLog()], 120, '2026-12-31', 'Load')).toEqual({ trend: 'no_data' });
  });

  it('has no data for a flat trend', () => {
    const logs = [makeLog({ date: at(2026, 1, 1) }), makeLog({ date: at(2026, 1, 8) })];

    expect(calculateTrend(logs, 120, '2026-12-31', 'Load')).toEqual({ trend: 'no_data' });
  });

  it('is behind when results move the wrong way', () => {
    const logs = [
      makeLog({ resultValue: 110, date: at(2026, 1, 1) }),
      makeLog({ resultValue: 100, date: at(2026, 1, 8) }),
    ];

    expect(calculateTrend(logs, 120, '2026-12-31', 'Load').trend).toBe('behind');
  });

  it("projects from the last log's local date across the DST end", () => {
    // +5kg per weekly log; 120kg needs two more logs → 14 days after the last.
    const logs = [
      makeLog({ resultValue: 110, date: at(2026, 4, 5) }),
      makeLog({ resultValue: 100, date: at(2026, 3, 22) }),
      makeLog({ resultValue: 105, date: at(2026, 3, 29) }),
    ];

    const result = calculateTrend(logs, 120, '2026-04-19', 'Load');

    expect(result).toEqual({ trend: 'on_track', projectedDate: '2026-04-19' });
  });

  it('uses the local date of early-morning logs, not the UTC date', () => {
    const logs = [
      makeLog({ resultValue: 100, date: at(2026, 1, 2, 0, 30) }),
      makeLog({ resultValue: 105, date: at(2026, 1, 9, 0, 30) }),
      makeLog({ resultValue: 110, date: at(2026, 1, 16, 0, 30) }),
    ];

    expect(calculateTrend(logs, 120, '2026-12-31', 'Load').projectedDate).toBe('2026-01-30');
  });

  it('is ahead when the projection lands a week or more before the target date', () => {
    const logs = [
      makeLog({ resultValue: 100, date: at(2026, 3, 1) }),
      makeLog({ resultValue: 105, date: at(2026, 3, 8) }),
      makeLog({ resultValue: 110, date: at(2026, 3, 15) }),
    ];

    expect(calculateTrend(logs, 120, '2026-04-05', 'Load')).toEqual({
      trend: 'ahead',
      projectedDate: '2026-03-29',
    });
  });

  it('is behind when the projection lands more than a week after the target date', () => {
    const logs = [
      makeLog({ resultValue: 100, date: at(2026, 3, 1) }),
      makeLog({ resultValue: 105, date: at(2026, 3, 8) }),
      makeLog({ resultValue: 110, date: at(2026, 3, 15) }),
    ];

    expect(calculateTrend(logs, 120, '2026-03-20', 'Load').trend).toBe('behind');
  });

  it('treats a falling time as improving when lower is better', () => {
    const logs = [
      makeLog({ resultValue: 300, date: at(2026, 3, 1) }),
      makeLog({ resultValue: 290, date: at(2026, 3, 8) }),
      makeLog({ resultValue: 280, date: at(2026, 3, 15) }),
    ];

    expect(calculateTrend(logs, 260, '2026-03-29', 'Time')).toEqual({
      trend: 'on_track',
      projectedDate: '2026-03-29',
    });
  });
});

describe('formatValueAsResult', () => {
  it('decodes normalized rounds+reps', () => {
    expect(formatValueAsResult(1805, 'Rounds+Reps')).toBe('18+5');
  });

  it('formats seconds as a time', () => {
    expect(formatValueAsResult(3930, 'Time')).toBe('1:05:30');
  });
});

describe('goal log matching', () => {
  beforeEach(async () => {
    await Promise.all([db.prLogs.clear(), db.goals.clear()]);
  });

  const bestFor = async (goal: Goal, item: CatalogItem, logs: PRLog[]) => {
    await db.prLogs.bulkAdd(logs);
    return getBestPRForGoal(goal, item);
  };

  it('treats missing reps as 1RM on both sides for Load goals', async () => {
    const best = await bestFor(makeGoal(), makeItem(), [
      makeLog({ id: 'single', resultValue: 100, reps: 1 }),
      makeLog({ id: 'legacy', resultValue: 105 }),
      makeLog({ id: 'triple', resultValue: 140, reps: 3 }),
    ]);

    expect(best?.id).toBe('legacy');
  });

  it('only counts logs with the goal rep count', async () => {
    const best = await bestFor(makeGoal({ reps: 3 }), makeItem(), [
      makeLog({ id: 'single', resultValue: 140 }),
      makeLog({ id: 'triple', resultValue: 120, reps: 3 }),
    ]);

    expect(best?.id).toBe('triple');
  });

  it('filters by variant', async () => {
    const best = await bestFor(makeGoal({ variant: 'Rx' }), makeItem(), [
      makeLog({ id: 'scaled', resultValue: 140, variant: 'Scaled' }),
      makeLog({ id: 'rx', resultValue: 100, variant: 'Rx' }),
    ]);

    expect(best?.id).toBe('rx');
  });

  it('ignores logs for another distance on a Time goal', async () => {
    const run = makeItem({ scoreType: 'Time', category: 'Monostructural' });

    const best = await bestFor(makeGoal({ targetValue: 1200, distance: 5000 }), run, [
      makeLog({ id: '400m', resultValue: 70, distance: 400 }),
      makeLog({ id: '5k', resultValue: 1300, distance: 5000 }),
    ]);

    expect(best?.id).toBe('5k');
  });

  it("matches the goal's effective score type on multi-mode items", async () => {
    const item = makeItem({ scoreType: 'Reps', scoreTypeIds: ['Reps', 'TimeForReps'] });
    const goal = makeGoal({ scoreTypeId: 'TimeForReps', targetValue: 30, targetReps: 10 });

    const best = await bestFor(goal, item, [
      makeLog({ id: 'legacy-reps', resultValue: 10 }), // backfills to Reps
      makeLog({ id: 'other-target', resultValue: 20, scoreTypeId: 'TimeForReps', targetReps: 5 }),
      makeLog({ id: 'match', resultValue: 40, scoreTypeId: 'TimeForReps', targetReps: 10 }),
    ]);

    expect(best?.id).toBe('match');
  });

  it('applies the reps rule when the effective score type is Load', async () => {
    const item = makeItem({ scoreType: 'Reps', scoreTypeIds: ['Reps', 'Load'] });

    const best = await bestFor(makeGoal({ scoreTypeId: 'Load' }), item, [
      makeLog({ id: 'triple', resultValue: 90, scoreTypeId: 'Load', reps: 3 }),
      makeLog({ id: 'single', resultValue: 80, scoreTypeId: 'Load' }),
    ]);

    expect(best?.id).toBe('single');
  });

  it('picks the best log after converting units to the goal unit', async () => {
    const best = await bestFor(makeGoal({ unit: 'kg' }), makeItem(), [
      makeLog({ id: 'kg', resultValue: 100, unit: 'kg' }),
      makeLog({ id: 'lb', resultValue: 225, unit: 'lb' }), // ≈ 102.1kg
    ]);

    expect(best?.id).toBe('lb');
    expect(best?.resultValue).toBeCloseTo(102.058, 3);
  });
});

describe('checkGoalsOnNewPR', () => {
  beforeEach(async () => {
    await Promise.all([db.prLogs.clear(), db.goals.clear()]);
  });

  it('achieves a kg goal with an equivalent lb lift', async () => {
    await db.goals.add(makeGoal({ id: 'kg-goal', unit: 'kg', targetValue: 100 }));

    const achieved = await checkGoalsOnNewPR(makeLog({ resultValue: 220.5, unit: 'lb' }), makeItem());

    expect(achieved).toEqual(['kg-goal']);
  });

  it('does not achieve a kg goal with a lighter lb lift', async () => {
    await db.goals.add(makeGoal({ id: 'kg-goal', unit: 'kg', targetValue: 100 }));

    const achieved = await checkGoalsOnNewPR(makeLog({ resultValue: 220, unit: 'lb' }), makeItem());

    expect(achieved).toEqual([]);
  });

  it('ignores goals the log does not match', async () => {
    await db.goals.add(makeGoal({ id: 'triple-goal', reps: 3, targetValue: 80 }));

    const achieved = await checkGoalsOnNewPR(makeLog({ resultValue: 120 }), makeItem());

    expect(achieved).toEqual([]);
  });
});
