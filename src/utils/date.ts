/**
 * Local calendar-date helpers.
 *
 * Calendar dates (check-in days, goal target dates, ...) are stored as
 * `YYYY-MM-DD` strings in the user's LOCAL timezone. Never derive them with
 * `toISOString()` (UTC) or parse them with `new Date('YYYY-MM-DD')` (also UTC):
 * both shift the day for users away from UTC.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const pad2 = (n: number): string => n.toString().padStart(2, '0');

/** Format a Date as `YYYY-MM-DD` in the local timezone. */
export const toLocalDateString = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Today's local date as `YYYY-MM-DD`. */
export const todayLocal = (): string => toLocalDateString(new Date());

/** Parse `YYYY-MM-DD` to a Date at LOCAL midnight. */
export const parseLocalDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const toLocalMidnight = (d: Date | string): Date => {
  const date = typeof d === 'string' ? parseLocalDate(d) : new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Signed number of calendar days from `a` to `b` (positive when `b` is later).
 * Uses Math.round so DST transitions (23h/25h days) don't skew the count.
 */
export const daysBetween = (a: Date | string, b: Date | string): number =>
  Math.round((toLocalMidnight(b).getTime() - toLocalMidnight(a).getTime()) / DAY_MS);

/** Add `n` calendar days (may be negative) to a `YYYY-MM-DD` string. */
export const addDaysLocal = (s: string, n: number): string => {
  const d = parseLocalDate(s);
  d.setDate(d.getDate() + n);
  return toLocalDateString(d);
};
