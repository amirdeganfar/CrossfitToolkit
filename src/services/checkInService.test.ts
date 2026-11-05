import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import type { TrainingCheckInInput } from '../types/training';
import {
  getConsecutiveTrainingDays,
  getDaysDifference,
  hasLongGap,
  saveRestDayCheckIn,
  saveTrainingCheckIn,
} from './checkInService';

const TRAINING: TrainingCheckInInput = { energy: 4, soreness: 2, sleepHours: 8 };

/** Local date that UTC still sees as the previous day (00:30 Sydney = 13:30Z). */
const TODAY = '2026-10-05'; // the day after the DST start

const train = (...dates: string[]) => Promise.all(dates.map((d) => saveTrainingCheckIn(TRAINING, d)));

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 5, 0, 30));
  await db.dailyCheckIns.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getConsecutiveTrainingDays', () => {
  it('is 0 without check-ins', async () => {
    expect(await getConsecutiveTrainingDays()).toBe(0);
  });

  it('counts back from today across the DST start', async () => {
    await train(TODAY, '2026-10-04', '2026-10-03');

    expect(await getConsecutiveTrainingDays()).toBe(3);
  });

  it('starts from yesterday when today has no check-in yet', async () => {
    await train('2026-10-04', '2026-10-03');

    expect(await getConsecutiveTrainingDays()).toBe(2);
  });

  it('keeps the streak over a single missed day', async () => {
    await train(TODAY, '2026-10-03');

    expect(await getConsecutiveTrainingDays()).toBe(2);
  });

  it('resets the streak after two missed days', async () => {
    await train(TODAY, '2026-10-02');

    expect(await getConsecutiveTrainingDays()).toBe(1);
  });

  it('stops at a rest day', async () => {
    await train(TODAY, '2026-10-03');
    await saveRestDayCheckIn('2026-10-04');

    expect(await getConsecutiveTrainingDays()).toBe(1);
  });

  it('counts duplicate check-ins for a date once', async () => {
    await train(TODAY);
    await db.dailyCheckIns.bulkAdd([
      { id: 'dup-a', date: '2026-10-04', type: 'training', createdAt: 0 },
      { id: 'dup-b', date: '2026-10-04', type: 'training', createdAt: 0 },
    ]);

    expect(await getConsecutiveTrainingDays()).toBe(2);
  });

  it('ignores future-dated check-ins', async () => {
    await train('2026-10-06', TODAY);

    expect(await getConsecutiveTrainingDays()).toBe(1);
  });
});

describe('hasLongGap', () => {
  it('is false without check-ins', async () => {
    expect(await hasLongGap()).toBe(false);
  });

  it('is false after one missed day', async () => {
    await train('2026-10-03');

    expect(await hasLongGap()).toBe(false);
  });

  it('is true after two missed days, matching the streak reset', async () => {
    await train('2026-10-02');

    expect(await hasLongGap()).toBe(true);
    expect(await getConsecutiveTrainingDays()).toBe(0);
  });
});

describe('saving check-ins', () => {
  it('upserts one check-in per date', async () => {
    await saveTrainingCheckIn(TRAINING, TODAY);
    await saveRestDayCheckIn(TODAY);

    const rows = await db.dailyCheckIns.where('date').equals(TODAY).toArray();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ type: 'rest', energy: undefined });
  });

  it("defaults to today's local date", async () => {
    const saved = await saveTrainingCheckIn(TRAINING);

    expect(saved.date).toBe(TODAY);
  });
});

describe('getDaysDifference', () => {
  it('is the absolute calendar-day difference', () => {
    expect(getDaysDifference('2026-10-05', '2026-10-03')).toBe(2);
    expect(getDaysDifference('2026-10-03', '2026-10-05')).toBe(2);
  });
});
