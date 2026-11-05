/**
 * Check-In Service
 *
 * CRUD operations for daily check-ins with consecutive day tracking.
 */

import { db } from '../db';
import { GAP_RESET_DAYS } from '../config/recoveryScoring.config';
import { todayLocal, toLocalDateString, addDaysLocal, daysBetween } from '../utils/date';
import { makeId } from '../utils/id';
import type {
  DailyCheckIn,
  TrainingCheckInInput,
} from '../types/training';

// ═══════════════════════════════════════════════════════════════════════════
// DATE UTILITIES (thin wrappers over utils/date — LOCAL calendar dates)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get today's local date (YYYY-MM-DD).
 */
export const getTodayDate = (): string => todayLocal();

/**
 * Format a Date object to a local date string (YYYY-MM-DD).
 */
export const formatDateToISO = (date: Date): string => toLocalDateString(date);

/**
 * Get yesterday's local date (YYYY-MM-DD).
 */
export const getYesterdayDate = (): string => addDaysLocal(todayLocal(), -1);

/**
 * Absolute difference in calendar days between two YYYY-MM-DD dates.
 */
export const getDaysDifference = (date1: string, date2: string): number =>
  Math.abs(daysBetween(date1, date2));

// ═══════════════════════════════════════════════════════════════════════════
// CHECK-IN CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get today's check-in if it exists.
 */
export const getTodayCheckIn = async (): Promise<DailyCheckIn | null> => {
  const today = getTodayDate();
  const checkIn = await db.dailyCheckIns.where('date').equals(today).first();
  return checkIn ?? null;
};

/**
 * Get a check-in by date.
 */
export const getCheckInByDate = async (date: string): Promise<DailyCheckIn | null> => {
  const checkIn = await db.dailyCheckIns.where('date').equals(date).first();
  return checkIn ?? null;
};

/**
 * Get recent check-ins ordered by date (descending).
 */
export const getRecentCheckIns = async (limit: number = 7): Promise<DailyCheckIn[]> => {
  return db.dailyCheckIns.orderBy('date').reverse().limit(limit).toArray();
};

/**
 * Upsert the check-in for a date atomically. Read + write happen in one
 * transaction so concurrent saves can't both insert; any pre-existing
 * duplicates for the date (from older versions) are removed.
 */
const upsertCheckInForDate = async (
  date: string,
  fields: Pick<DailyCheckIn, 'type' | 'energy' | 'soreness' | 'sleepHours'>
): Promise<DailyCheckIn> => {
  return db.transaction('rw', db.dailyCheckIns, async () => {
    const [existing, ...duplicates] = await db.dailyCheckIns.where('date').equals(date).toArray();
    if (duplicates.length > 0) {
      await db.dailyCheckIns.bulkDelete(duplicates.map((c) => c.id));
    }

    const checkIn: DailyCheckIn = existing
      ? { ...existing, ...fields }
      : { id: makeId('checkin'), date, createdAt: Date.now(), ...fields };

    await db.dailyCheckIns.put(checkIn);
    return checkIn;
  });
};

/**
 * Create or update a training day check-in.
 * @param input - Training check-in data
 * @param date - Optional date (defaults to today)
 */
export const saveTrainingCheckIn = async (
  input: TrainingCheckInInput,
  date?: string
): Promise<DailyCheckIn> =>
  upsertCheckInForDate(date ?? getTodayDate(), {
    type: 'training',
    energy: input.energy,
    soreness: input.soreness,
    sleepHours: input.sleepHours,
  });

/**
 * Create or update a rest day check-in.
 * @param date - Optional date (defaults to today)
 */
export const saveRestDayCheckIn = async (date?: string): Promise<DailyCheckIn> =>
  upsertCheckInForDate(date ?? getTodayDate(), {
    type: 'rest',
    energy: undefined,
    soreness: undefined,
    sleepHours: undefined,
  });

/**
 * Delete a check-in by ID.
 */
export const deleteCheckIn = async (id: string): Promise<void> => {
  await db.dailyCheckIns.delete(id);
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSECUTIVE DAYS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate consecutive training days including today (if applicable).
 *
 * Rules:
 * - Start counting from today, or from yesterday if today has no check-in yet
 * - Count backwards until a rest day or gap is found
 * - A gap of GAP_RESET_DAYS or more missed days resets the counter
 * - Duplicate check-ins for the same date count once
 */
export const getConsecutiveTrainingDays = async (): Promise<number> => {
  // Get recent check-ins ordered by date descending
  const recentCheckIns = await db.dailyCheckIns
    .orderBy('date')
    .reverse()
    .limit(30) // Look back up to 30 days
    .toArray();

  const today = getTodayDate();
  // Ignore future-dated entries; today has no check-in yet → start from yesterday.
  const pastCheckIns = recentCheckIns.filter((c) => c.date <= today);
  if (pastCheckIns.length === 0) {
    return 0;
  }

  let consecutiveDays = 0;
  let expectedDate = pastCheckIns[0].date === today ? today : getYesterdayDate();

  for (const checkIn of pastCheckIns) {
    // Missed days between this check-in and the expected day (negative = a
    // duplicate of a date already counted).
    const missedDays = daysBetween(checkIn.date, expectedDate);
    if (missedDays < 0) continue;

    // If the gap reaches the reset threshold, stop counting
    if (missedDays >= GAP_RESET_DAYS) {
      break;
    }

    // If this is a rest day, stop counting
    if (checkIn.type === 'rest') {
      break;
    }

    // Count this training day; next expected date is the day before it
    consecutiveDays++;
    expectedDate = addDaysLocal(checkIn.date, -1);
  }

  return consecutiveDays;
};

/**
 * Check if this is the user's first check-in ever.
 */
export const isFirstCheckIn = async (): Promise<boolean> => {
  const count = await db.dailyCheckIns.count();
  return count === 0;
};

/**
 * Check if the gap since the last check-in is long enough to reset the streak
 * (welcome back scenario): more than GAP_RESET_DAYS days since the last
 * check-in, i.e. GAP_RESET_DAYS+ missed days before today.
 */
export const hasLongGap = async (): Promise<boolean> => {
  const lastCheckIn = await db.dailyCheckIns.orderBy('date').last();
  if (!lastCheckIn) return false;

  const daysSinceLastCheckIn = daysBetween(lastCheckIn.date, getTodayDate());
  return daysSinceLastCheckIn > GAP_RESET_DAYS;
};
