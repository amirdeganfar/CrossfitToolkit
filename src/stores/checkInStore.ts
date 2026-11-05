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
  /** Today's local date (YYYY-MM-DD). Updated by refreshToday() after midnight. */
  today: string;
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
  /** Force a full reload from the DB (e.g. after import / clear all data). Resets selection to today. */
  reload: () => Promise<void>;
  /** Recompute "today" if the calendar day changed (call on focus/visibilitychange). */
  refreshToday: () => Promise<void>;
  setSelectedDate: (date: string) => Promise<void>;
  saveTrainingCheckIn: (input: TrainingCheckInInput) => Promise<void>;
  saveRestDay: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load today-derived data (today's check-in, streak, flags) and compute the
 * recovery score. Always reads from the DB so it's correct after any save.
 */
const loadTodayState = async () => {
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

  return { today: checkInService.getTodayDate(), todayCheckIn, consecutiveDays, recoveryScore, isFirstCheckIn, hasLongGap };
};

/** Incremented on each setSelectedDate call; only the latest response is applied. */
let selectRequestId = 0;
let visibilityListenerInstalled = false;

// ═══════════════════════════════════════════════════════════════════════════
// STORE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export const useCheckInStore = create<CheckInState>((set, get) => ({
  // Initial state
  today: checkInService.getTodayDate(),
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

    // Recompute "today" when the app returns to the foreground / regains focus,
    // and at local midnight while it stays open.
    if (!visibilityListenerInstalled && typeof document !== 'undefined') {
      visibilityListenerInstalled = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void get().refreshToday();
      });
      window.addEventListener('focus', () => void get().refreshToday());
      const armMidnightTimer = () => {
        const now = new Date();
        const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        // +1s margin so the new day is definitely in effect; re-arm after each fire.
        window.setTimeout(() => {
          void get().refreshToday();
          armMidnightTimer();
        }, nextMidnight.getTime() - now.getTime() + 1000);
      };
      armMidnightTimer();
    }

    await get().reload();
  },

  reload: async () => {
    selectRequestId++; // invalidate any in-flight date selection
    set({ isLoading: true });

    try {
      const todayState = await loadTodayState();
      set({
        ...todayState,
        selectedDate: todayState.today,
        selectedCheckIn: todayState.todayCheckIn, // Default to today
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('[CheckInStore] Failed to initialize:', error);
      set({ isLoading: false });
    }
  },

  refreshToday: async () => {
    const { today, selectedDate, isInitialized } = get();
    const newToday = checkInService.getTodayDate();
    if (!isInitialized || newToday === today) return;

    // Day rolled over: keep a past selection, but move "today" selection forward.
    if (selectedDate === today) {
      await get().reload();
    } else {
      await get().refresh();
    }
  },

  /**
   * Set the selected date and load the check-in for that date.
   */
  setSelectedDate: async (date: string) => {
    const requestId = ++selectRequestId;
    set({ isLoading: true, selectedDate: date });

    try {
      const checkIn = await checkInService.getCheckInByDate(date);
      if (requestId !== selectRequestId) return; // a newer selection won
      set({
        selectedCheckIn: checkIn,
        isLoading: false,
      });
    } catch (error) {
      if (requestId !== selectRequestId) return;
      console.error('[CheckInStore] Failed to load check-in for date:', error);
      set({ selectedCheckIn: null, isLoading: false });
    }
  },

  /**
   * Save a training day check-in for the selected date.
   */
  saveTrainingCheckIn: async (input: TrainingCheckInInput) => {
    const { selectedDate } = get();
    set({ isSaving: true });

    try {
      const checkIn = await checkInService.saveTrainingCheckIn(input, selectedDate);
      // Any save (today or a past date) can change the streak → recompute all.
      const todayState = await loadTodayState();
      set({
        ...todayState,
        selectedCheckIn: get().selectedDate === selectedDate ? checkIn : get().selectedCheckIn,
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
    set({ isSaving: true });

    try {
      const checkIn = await checkInService.saveRestDayCheckIn(selectedDate);
      const todayState = await loadTodayState();
      set({
        ...todayState,
        selectedCheckIn: get().selectedDate === selectedDate ? checkIn : get().selectedCheckIn,
        isSaving: false,
      });
    } catch (error) {
      console.error('[CheckInStore] Failed to save rest day:', error);
      set({ isSaving: false });
      throw error;
    }
  },

  /**
   * Refresh all today-derived check-in data (keeps the selected date).
   */
  refresh: async () => {
    const todayState = await loadTodayState();
    set(todayState);
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
