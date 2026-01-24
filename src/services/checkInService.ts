/**
 * Check-In Service
 *
 * CRUD operations for daily check-ins with consecutive day tracking.
 */

import { db } from '../db';
import { GAP_RESET_DAYS } from '../config/recoveryScoring.config';
import type {
  DailyCheckIn,
  TrainingCheckInInput,
} from '../types/training';

// ═══════════════════════════════════════════════════════════════════════════
// DATE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get today's date in ISO format (YYYY-MM-DD).
 */
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Format a Date object to ISO date string (YYYY-MM-DD).
 */
export const formatDateToISO = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Get yesterday's date in ISO format.
 */
export const getYesterdayDate = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

/**
 * Calculate the difference in days between two dates.
 */
export const getDaysDifference = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

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
 * Create or update a training day check-in.
 * @param input - Training check-in data
 * @param date - Optional date (defaults to today)
 */
export const saveTrainingCheckIn = async (
  input: TrainingCheckInInput,
  date?: string
): Promise<DailyCheckIn> => {
  const targetDate = date ?? getTodayDate();
  const existing = await getCheckInByDate(targetDate);

  if (existing) {
    // Update existing check-in
    await db.dailyCheckIns.update(existing.id, {
      type: 'training',
      energy: input.energy,
      soreness: input.soreness,
      sleepHours: input.sleepHours,
    });
    return {
      ...existing,
      type: 'training',
      energy: input.energy,
      soreness: input.soreness,
      sleepHours: input.sleepHours,
    };
  }

  // Create new check-in
  const id = `checkin-${Date.now()}`;
  const checkIn: DailyCheckIn = {
    id,
    date: targetDate,
    type: 'training',
    energy: input.energy,
    soreness: input.soreness,
    sleepHours: input.sleepHours,
    createdAt: Date.now(),
  };

  await db.dailyCheckIns.add(checkIn);
  return checkIn;
};

/**
 * Create or update a rest day check-in.
 * @param date - Optional date (defaults to today)
 */
export const saveRestDayCheckIn = async (date?: string): Promise<DailyCheckIn> => {
  const targetDate = date ?? getTodayDate();
  const existing = await getCheckInByDate(targetDate);

  if (existing) {
    // Update existing to rest day
    await db.dailyCheckIns.update(existing.id, {
      type: 'rest',
      energy: undefined,
      soreness: undefined,
      sleepHours: undefined,
    });
    return {
      ...existing,
      type: 'rest',
      energy: undefined,
      soreness: undefined,
      sleepHours: undefined,
    };
  }

  // Create new rest day check-in
  const id = `checkin-${Date.now()}`;
  const checkIn: DailyCheckIn = {
    id,
    date: targetDate,
    type: 'rest',
    createdAt: Date.now(),
  };

  await db.dailyCheckIns.add(checkIn);
  return checkIn;
};

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
 * - Start counting from today or yesterday (if today has no training check-in)
 * - Count backwards until a rest day or gap is found
 * - A gap of GAP_RESET_DAYS or more resets the counter
 */
export const getConsecutiveTrainingDays = async (): Promise<number> => {
  // Get recent check-ins ordered by date descending
  const recentCheckIns = await db.dailyCheckIns
    .orderBy('date')
    .reverse()
    .limit(30) // Look back up to 30 days
    .toArray();

  if (recentCheckIns.length === 0) {
    return 0;
  }

  const today = getTodayDate();
  let consecutiveDays = 0;
  let expectedDate = today;

  for (const checkIn of recentCheckIns) {
    const daysDiff = getDaysDifference(checkIn.date, expectedDate);

    // If there's a gap larger than allowed, stop counting
    if (daysDiff > GAP_RESET_DAYS) {
      break;
    }

    // If this is a rest day, stop counting
    if (checkIn.type === 'rest') {
      break;
    }

    // Count this training day
    if (checkIn.type === 'training') {
      consecutiveDays++;
      // Move expected date to the day before this check-in
      const prevDate = new Date(checkIn.date);
      prevDate.setDate(prevDate.getDate() - 1);
      expectedDate = prevDate.toISOString().split('T')[0];
    }
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
 * Check if there's a gap of 3+ days since last check-in (welcome back scenario).
 */
export const hasLongGap = async (): Promise<boolean> => {
  const lastCheckIn = await db.dailyCheckIns.orderBy('date').last();
  if (!lastCheckIn) return false;

  const today = getTodayDate();
  const daysSinceLastCheckIn = getDaysDifference(lastCheckIn.date, today);
  return daysSinceLastCheckIn >= 3;
};
