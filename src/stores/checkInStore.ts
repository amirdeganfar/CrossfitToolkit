/**
 * Check-In Store
 *
 * Zustand store for daily check-ins and recovery scoring.
 */

import { create } from 'zustand';
import type {
  DailyCheckIn,
  RecoveryScore,
  TrainingCheckInInput,
} from '../types/training';
import * as checkInService from '../services/checkInService';
import { calculateRecoveryScore } from '../services/recoveryScoreService';
import { getSettings } from '../db';

// ═══════════════════════════════════════════════════════════════════════════
// STORE TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface CheckInState {
  // Data
  todayCheckIn: DailyCheckIn | null;
  selectedDate: string; // ISO date string YYYY-MM-DD
  selectedCheckIn: DailyCheckIn | null;
  consecutiveDays: number;
  recoveryScore: RecoveryScore | null;

  // UI State
  isLoading: boolean;
  isInitialized: boolean;
  isSaving: boolean;
  isFirstCheckIn: boolean;
  hasLongGap: boolean;

  // Actions
  initialize: () => Promise<void>;
  setSelectedDate: (date: string) => Promise<void>;
  saveTrainingCheckIn: (input: TrainingCheckInInput) => Promise<void>;
  saveRestDay: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// STORE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export const useCheckInStore = create<CheckInState>((set, get) => ({
  // Initial state
  todayCheckIn: null,
  selectedDate: checkInService.getTodayDate(),
  selectedCheckIn: null,
  consecutiveDays: 0,
  recoveryScore: null,
  isLoading: false,
  isInitialized: false,
  isSaving: false,
  isFirstCheckIn: true,
  hasLongGap: false,

  /**
   * Initialize the store by loading today's check-in and calculating score.
   */
  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });

    try {
      const [todayCheckIn, consecutiveDays, isFirstCheckIn, hasLongGap, settings] = await Promise.all([
        checkInService.getTodayCheckIn(),
        checkInService.getConsecutiveTrainingDays(),
        checkInService.isFirstCheckIn(),
        checkInService.hasLongGap(),
        getSettings(),
      ]);

      // Calculate recovery score with user's min sleep setting
      const recoveryScore = calculateRecoveryScore({
        consecutiveDays,
        checkIn: todayCheckIn,
        minSleepHours: settings.minSleepHours,
      });

      set({
        todayCheckIn,
        selectedDate: checkInService.getTodayDate(),
        selectedCheckIn: todayCheckIn, // Default to today
        consecutiveDays,
        recoveryScore,
        isFirstCheckIn,
        hasLongGap,
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('[CheckInStore] Failed to initialize:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Set the selected date and load the check-in for that date.
   */
  setSelectedDate: async (date: string) => {
    set({ isLoading: true, selectedDate: date });

    try {
      const checkIn = await checkInService.getCheckInByDate(date);
      set({
        selectedCheckIn: checkIn,
        isLoading: false,
      });
    } catch (error) {
      console.error('[CheckInStore] Failed to load check-in for date:', error);
      set({ selectedCheckIn: null, isLoading: false });
    }
  },

  /**
   * Save a training day check-in for the selected date.
   */
  saveTrainingCheckIn: async (input: TrainingCheckInInput) => {
    const { selectedDate } = get();
    const isToday = selectedDate === checkInService.getTodayDate();
    
    set({ isSaving: true });

    try {
      const [checkIn, settings] = await Promise.all([
        checkInService.saveTrainingCheckIn(input, selectedDate),
        getSettings(),
      ]);

      // Recalculate consecutive days
      const consecutiveDays = await checkInService.getConsecutiveTrainingDays();

      // Recalculate recovery score (only relevant for today)
      const recoveryScore = isToday
        ? calculateRecoveryScore({ consecutiveDays, checkIn, minSleepHours: settings.minSleepHours })
        : get().recoveryScore;

      set({
        todayCheckIn: isToday ? checkIn : get().todayCheckIn,
        selectedCheckIn: checkIn,
        consecutiveDays,
        recoveryScore,
        isFirstCheckIn: false,
        isSaving: false,
      });
    } catch (error) {
      console.error('[CheckInStore] Failed to save training check-in:', error);
      set({ isSaving: false });
      throw error;
    }
  },

  /**
   * Save a rest day check-in for the selected date.
   */
  saveRestDay: async () => {
    const { selectedDate } = get();
    const isToday = selectedDate === checkInService.getTodayDate();
    
    set({ isSaving: true });

    try {
      const [checkIn, settings] = await Promise.all([
        checkInService.saveRestDayCheckIn(selectedDate),
        getSettings(),
      ]);

      // Rest day resets consecutive counter for scoring purposes
      const recoveryScore = isToday
        ? calculateRecoveryScore({ consecutiveDays: 0, checkIn, minSleepHours: settings.minSleepHours })
        : get().recoveryScore;

      set({
        todayCheckIn: isToday ? checkIn : get().todayCheckIn,
        selectedCheckIn: checkIn,
        consecutiveDays: isToday ? 0 : get().consecutiveDays,
        recoveryScore,
        isFirstCheckIn: false,
        isSaving: false,
      });
    } catch (error) {
      console.error('[CheckInStore] Failed to save rest day:', error);
      set({ isSaving: false });
      throw error;
    }
  },

  /**
   * Refresh all check-in data.
   */
  refresh: async () => {
    const [todayCheckIn, consecutiveDays, isFirstCheckIn, hasLongGap, settings] = await Promise.all([
      checkInService.getTodayCheckIn(),
      checkInService.getConsecutiveTrainingDays(),
      checkInService.isFirstCheckIn(),
      checkInService.hasLongGap(),
      getSettings(),
    ]);

    const recoveryScore = calculateRecoveryScore({
      consecutiveDays,
      checkIn: todayCheckIn,
      minSleepHours: settings.minSleepHours,
    });

    set({
      todayCheckIn,
      consecutiveDays,
      recoveryScore,
      isFirstCheckIn,
      hasLongGap,
    });
  },
}));

// ═══════════════════════════════════════════════════════════════════════════
// SELECTORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to check if check-in has been done today.
 */
export const useHasCheckedInToday = () => 
  useCheckInStore((state) => state.todayCheckIn !== null);

/**
 * Hook to check if an alert should be shown.
 */
export const useShouldShowAlert = () =>
  useCheckInStore((state) => 
    state.recoveryScore !== null && state.recoveryScore.level !== 'none'
  );
