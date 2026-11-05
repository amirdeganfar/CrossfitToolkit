import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDaysLocal, daysBetween, parseLocalDate, toLocalDateString, todayLocal } from './date';

// Runs in Australia/Sydney (see vitest.config.ts): UTC+11 in summer, UTC+10 in
// winter. DST starts 2026-10-04 (02:00 → 03:00) and ends 2026-04-05 (03:00 → 02:00).

describe('test timezone', () => {
  it('is Australia/Sydney with DST so local-vs-UTC bugs surface', () => {
    expect(new Date(2026, 0, 15).getTimezoneOffset()).toBe(-660);
    expect(new Date(2026, 6, 15).getTimezoneOffset()).toBe(-600);
  });
});

describe('toLocalDateString', () => {
  it('uses the local date for an early-morning time whose UTC date is the previous day', () => {
    const earlyMorning = new Date(2026, 0, 15, 0, 30);

    const result = toLocalDateString(earlyMorning);

    expect(earlyMorning.toISOString().slice(0, 10)).toBe('2026-01-14');
    expect(result).toBe('2026-01-15');
  });

  it('keeps the same local date late in the evening', () => {
    expect(toLocalDateString(new Date(2026, 0, 15, 23, 59, 59))).toBe('2026-01-15');
  });

  it('zero-pads month and day', () => {
    expect(toLocalDateString(new Date(2026, 2, 5))).toBe('2026-03-05');
  });
});

describe('todayLocal', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the local calendar date, not the UTC one', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 0, 30)); // UTC: 2026-10-04T13:30Z

    expect(todayLocal()).toBe('2026-10-05');
  });
});

describe('parseLocalDate', () => {
  it('parses to local midnight of that date', () => {
    const result = parseLocalDate('2026-03-05');

    expect([result.getFullYear(), result.getMonth(), result.getDate()]).toEqual([2026, 2, 5]);
    expect([result.getHours(), result.getMinutes()]).toEqual([0, 0]);
  });

  it('round-trips through toLocalDateString on DST change days', () => {
    expect(toLocalDateString(parseLocalDate('2026-10-04'))).toBe('2026-10-04');
    expect(toLocalDateString(parseLocalDate('2026-04-05'))).toBe('2026-04-05');
  });
});

describe('daysBetween', () => {
  it('counts calendar days across the DST start (23h day)', () => {
    expect(daysBetween('2026-10-03', '2026-10-05')).toBe(2);
  });

  it('counts calendar days across the DST end (25h day)', () => {
    expect(daysBetween('2026-04-04', '2026-04-06')).toBe(2);
  });

  it('is negative when the second date is earlier', () => {
    expect(daysBetween('2026-10-05', '2026-10-03')).toBe(-2);
  });

  it('is zero for the same date', () => {
    expect(daysBetween('2026-10-04', '2026-10-04')).toBe(0);
  });

  it('ignores time of day for Date inputs (23:59 → 00:01 is one day)', () => {
    expect(daysBetween(new Date(2026, 0, 15, 23, 59), new Date(2026, 0, 16, 0, 1))).toBe(1);
  });

  it('ignores time of day for Date inputs on the same date', () => {
    expect(daysBetween(new Date(2026, 0, 15, 0, 1), new Date(2026, 0, 15, 23, 59))).toBe(0);
  });

  it('accepts mixed string and Date inputs', () => {
    expect(daysBetween('2026-01-15', new Date(2026, 0, 22, 18, 0))).toBe(7);
  });
});

describe('addDaysLocal', () => {
  it('steps over the DST start one day at a time', () => {
    expect(addDaysLocal('2026-10-03', 1)).toBe('2026-10-04');
    expect(addDaysLocal('2026-10-04', 1)).toBe('2026-10-05');
  });

  it('steps backwards over the DST end', () => {
    expect(addDaysLocal('2026-04-06', -1)).toBe('2026-04-05');
    expect(addDaysLocal('2026-04-05', -1)).toBe('2026-04-04');
  });

  it('rolls over month and year boundaries', () => {
    expect(addDaysLocal('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysLocal('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('adds many days across both DST changes', () => {
    expect(addDaysLocal('2026-01-01', 365)).toBe('2027-01-01');
  });
});
