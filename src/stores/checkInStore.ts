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

// ═══════════════════════════════════════════════════════════════════════════
// STORE TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface CheckInState {
  // Data
  todayCheckIn: DailyCheckIn | null;
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
      const [todayCheckIn, consecutiveDays, isFirstCheckIn, hasLongGap] = await Promise.all([
        checkInService.getTodayCheckIn(),
        checkInService.getConsecutiveTrainingDays(),
        checkInService.isFirstCheckIn(),
        checkInService.hasLongGap(),
      ]);

      // Calculate recovery score
      const recoveryScore = calculateRecoveryScore({
        consecutiveDays,
        checkIn: todayCheckIn,
      });

      set({
        todayCheckIn,
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
   * Save a training day check-in.
   */
  saveTrainingCheckIn: async (input: TrainingCheckInInput) => {
    set({ isSaving: true });

    try {
      const checkIn = await checkInService.saveTrainingCheckIn(input);

      // Recalculate consecutive days (includes today now)
      const consecutiveDays = await checkInService.getConsecutiveTrainingDays();

      // Recalculate recovery score
      const recoveryScore = calculateRecoveryScore({
        consecutiveDays,
        checkIn,
      });

      set({
        todayCheckIn: checkIn,
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
   * Save a rest day check-in.
   */
  saveRestDay: async () => {
    set({ isSaving: true });

    try {
      const checkIn = await checkInService.saveRestDayCheckIn();

      // Rest day resets consecutive counter for scoring purposes
      const recoveryScore = calculateRecoveryScore({
        consecutiveDays: 0, // Rest day = 0 for scoring
        checkIn,
      });

      set({
        todayCheckIn: checkIn,
        consecutiveDays: 0,
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
    const [todayCheckIn, consecutiveDays, isFirstCheckIn, hasLongGap] = await Promise.all([
      checkInService.getTodayCheckIn(),
      checkInService.getConsecutiveTrainingDays(),
      checkInService.isFirstCheckIn(),
      checkInService.hasLongGap(),
    ]);

    const recoveryScore = calculateRecoveryScore({
      consecutiveDays,
      checkIn: todayCheckIn,
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
