import { describe, expect, it } from 'vitest';
import type { DailyCheckIn, MetricValue, SleepHours } from '../types/training';
import { calculateConsecutivePoints, calculateRecoveryScore, getAlertLevel } from './recoveryScoreService';

const trainingDay = (energy: MetricValue, soreness: MetricValue, sleepHours: SleepHours): DailyCheckIn => ({
  id: 'c1',
  date: '2026-01-15',
  type: 'training',
  energy,
  soreness,
  sleepHours,
  createdAt: 0,
});

const restDay: DailyCheckIn = { id: 'r1', date: '2026-01-15', type: 'rest', createdAt: 0 };

describe('getAlertLevel', () => {
  it.each([
    [0, 'none'], // Primed
    [1, 'none'],
    [2, 'info'], // Fair
    [4, 'info'],
    [5, 'warning'], // Low
    [7, 'warning'],
    [8, 'critical'], // Depleted
    [20, 'critical'],
  ])('maps %i points to %s', (points, level) => {
    expect(getAlertLevel(points)).toBe(level);
  });
});

describe('calculateConsecutivePoints', () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 1],
    [5, 4],
    [10, 4],
  ])('gives %i days %i points (capped)', (days, points) => {
    expect(calculateConsecutivePoints(days)).toBe(points);
  });
});

describe('calculateRecoveryScore', () => {
  it('scores a fresh, rested athlete at zero with no reasons', () => {
    const score = calculateRecoveryScore({ consecutiveDays: 1, checkIn: trainingDay(5, 1, 8) });

    expect(score).toEqual({ total: 0, level: 'none', reasons: [] });
  });

  it('does not penalize good energy and light soreness', () => {
    const score = calculateRecoveryScore({ consecutiveDays: 1, checkIn: trainingDay(4, 2, 8) });

    expect(score).toEqual({ total: 0, level: 'none', reasons: [] });
  });

  it('keeps a normal second training day Primed', () => {
    const score = calculateRecoveryScore({ consecutiveDays: 2, checkIn: trainingDay(4, 2, 8) });

    expect(score.total).toBe(1);
    expect(score.level).toBe('none');
    expect(score.reasons.map((r) => r.metric)).toEqual(['consecutive']);
  });

  it('is Depleted with very low energy and high soreness alone', () => {
    const score = calculateRecoveryScore({ consecutiveDays: 1, checkIn: trainingDay(1, 5, 8) });

    expect(score.total).toBe(8);
    expect(score.level).toBe('critical');
    expect(score.reasons.map((r) => r.metric)).toEqual(['energy', 'soreness']);
  });

  it('sums every factor and maps the total to a level', () => {
    // consecutive 4 → 3, energy 2 → 3, soreness 4 → 3, sleep 5h (min 7) → 4
    const score = calculateRecoveryScore({ consecutiveDays: 4, checkIn: trainingDay(2, 4, 5) });

    expect(score.total).toBe(13);
    expect(score.level).toBe('critical');
    expect(score.reasons.map((r) => r.metric)).toEqual(['consecutive', 'energy', 'soreness', 'sleep']);
  });

  it('only counts consecutive days on a rest day', () => {
    const score = calculateRecoveryScore({ consecutiveDays: 4, checkIn: restDay });

    expect(score.total).toBe(3);
    expect(score.reasons.map((r) => r.metric)).toEqual(['consecutive']);
  });

  it('only counts consecutive days without a check-in', () => {
    const score = calculateRecoveryScore({ consecutiveDays: 1, checkIn: null });

    expect(score).toEqual({ total: 0, level: 'none', reasons: [] });
  });

  it("scores sleep against the user's minimum", () => {
    const score = calculateRecoveryScore({ consecutiveDays: 1, checkIn: trainingDay(5, 1, 7), minSleepHours: 8 });

    expect(score.total).toBe(2);
    expect(score.reasons).toEqual([{ metric: 'sleep', points: 2, message: 'Slightly under-rested' }]);
  });

  it('explains every point with a reason for all check-in combinations', () => {
    const values: MetricValue[] = [1, 2, 3, 4, 5];
    const sleeps: SleepHours[] = [5, 6, 7, 8, 9];
    const mismatches: string[] = [];

    for (const consecutiveDays of [0, 1, 2, 3, 6])
      for (const energy of values)
        for (const soreness of values)
          for (const sleep of sleeps)
            for (const minSleepHours of [5, 6, 7, 8, 9]) {
              const score = calculateRecoveryScore({
                consecutiveDays,
                checkIn: trainingDay(energy, soreness, sleep),
                minSleepHours,
              });
              const explained = score.reasons.reduce((sum, r) => sum + r.points, 0);
              const allHaveMessages = score.reasons.every((r) => r.points > 0 && r.message.length > 0);
              if (explained !== score.total || !allHaveMessages) {
                mismatches.push(JSON.stringify({ consecutiveDays, energy, soreness, sleep, minSleepHours, score }));
              }
            }

    expect(mismatches).toEqual([]);
  });
});
