import { useMemo } from 'react';
import { create } from 'zustand';
import type { Goal, GoalWithProgress, CreateGoalInput, UpdateGoalInput } from '../types/goal';
import type { CatalogItem, PRLog, ScoreType } from '../types/catalog';
import * as db from '../db';
import * as goalService from '../services/goalService';

interface GoalsState {
  // Data
  goals: Goal[];
  activeGoals: GoalWithProgress[];
  achievedGoals: GoalWithProgress[];

  // UI State
  /** True only during the FIRST load (initialize). Use for full-page spinners. */
  isLoading: boolean;
  /** True while a background refresh/reload runs (keep showing current data). */
  isRefreshing: boolean;
  isInitialized: boolean;

  // Actions
  // NOTE: `weightUnit` params are kept for compatibility but ignored — display
  // units are read from stored settings on every load.
  initialize: (catalogItems: CatalogItem[], weightUnit?: string) => Promise<void>;
  refreshGoals: (catalogItems: CatalogItem[], weightUnit?: string) => Promise<void>;
  /** Reload all goals from the DB (import, clear-all, unit change). Defaults to the last catalog items. */
  reload: (catalogItems?: CatalogItem[]) => Promise<void>;
  addGoal: (
    input: CreateGoalInput,
    catalogItems: CatalogItem[],
    weightUnit?: string
  ) => Promise<string>;
  updateGoal: (
    id: string,
    updates: UpdateGoalInput,
    catalogItems: CatalogItem[],
    weightUnit?: string
  ) => Promise<void>;
  achieveGoal: (
    id: string,
    catalogItems: CatalogItem[],
    weightUnit?: string
  ) => Promise<void>;
  cancelGoal: (
    id: string,
    catalogItems: CatalogItem[],
    weightUnit?: string
  ) => Promise<void>;
  deleteGoal: (
    id: string,
    catalogItems: CatalogItem[],
    weightUnit?: string
  ) => Promise<void>;
  checkGoalsOnNewPR: (log: PRLog, item: CatalogItem) => Promise<string[]>;
  getActiveGoalForItem: (
    itemId: string,
    variant?: Goal['variant'],
    reps?: number,
    pool?: { scoreTypeId?: ScoreType; timeCap?: number; targetReps?: number; distance?: number }
  ) => Promise<Goal | undefined>;
}

/**
 * Enrich goals with progress data (display units from current settings).
 */
const enrichGoals = async (
  goals: Goal[],
  catalogItems: CatalogItem[],
  weightUnit: string,
  distanceUnit: string
): Promise<GoalWithProgress[]> => {
  const itemsById = new Map(catalogItems.map((i) => [i.id, i]));
  const enriched = await Promise.all(
    goals.map((goal) => {
      const item = itemsById.get(goal.itemId);
      return item ? goalService.enrichGoalWithProgress(goal, item, weightUnit, distanceUnit) : null;
    })
  );
  return enriched.filter((g): g is GoalWithProgress => g !== null);
};

/**
 * Load all goals from the DB and enrich/sort them.
 * Display units always come from the stored settings, so results are right
 * regardless of which unit the caller passes (or after a unit change).
 */
const loadGoals = async (catalogItems: CatalogItem[]) => {
  const [goals, settings] = await Promise.all([db.getAllGoals(), db.getSettings()]);
  const active = goals.filter((g) => g.status === 'active');
  const achieved = goals.filter((g) => g.status === 'achieved');

  const [activeGoals, achievedGoals] = await Promise.all([
    enrichGoals(active, catalogItems, settings.weightUnit, settings.distanceUnit),
    enrichGoals(achieved, catalogItems, settings.weightUnit, settings.distanceUnit),
  ]);

  // Active: by days remaining (ascending - most urgent first)
  activeGoals.sort((a, b) => a.daysRemaining - b.daysRemaining);
  // Achieved: by achieved date (descending - most recent first). YYYY-MM-DD sorts lexically.
  achievedGoals.sort((a, b) => (b.achievedAt ?? '').localeCompare(a.achievedAt ?? ''));

  return { goals, activeGoals, achievedGoals };
};

/** Catalog items from the last load, so reload() can run without arguments. */
let lastCatalogItems: CatalogItem[] = [];

export const useGoalsStore = create<GoalsState>((set, get) => ({
  // Initial state
  goals: [],
  activeGoals: [],
  achievedGoals: [],
  isLoading: false,
  isRefreshing: false,
  isInitialized: false,

  // Initialize goals from database (first load only — shows isLoading)
  initialize: async (catalogItems: CatalogItem[]) => {
    if (get().isInitialized) return;
    lastCatalogItems = catalogItems;

    set({ isLoading: true });

    try {
      const loaded = await loadGoals(catalogItems);
      set({ ...loaded, isInitialized: true, isLoading: false });
    } catch (error) {
      console.error('[GoalsStore] Failed to initialize:', error);
      set({ isLoading: false });
    }
  },

  // Refresh goals from database (background — sets isRefreshing, not isLoading)
  refreshGoals: async (catalogItems: CatalogItem[]) => {
    lastCatalogItems = catalogItems;
    set({ isRefreshing: true });

    try {
      const loaded = await loadGoals(catalogItems);
      set({ ...loaded, isInitialized: true, isRefreshing: false });
    } catch (error) {
      console.error('[GoalsStore] Failed to refresh:', error);
      set({ isRefreshing: false });
    }
  },

  // Reload from DB (after import / clear-all / unit change). Uses the last catalog items if omitted.
  reload: async (catalogItems?: CatalogItem[]) => {
    await get().refreshGoals(catalogItems ?? lastCatalogItems);
  },

  // Add a new goal
  addGoal: async (
    input: CreateGoalInput,
    catalogItems: CatalogItem[],
    weightUnit: string = 'kg'
  ) => {
    const id = await db.addGoal(input);
    await get().refreshGoals(catalogItems, weightUnit);
    return id;
  },

  // Update an existing goal
  updateGoal: async (
    id: string,
    updates: UpdateGoalInput,
    catalogItems: CatalogItem[],
    weightUnit: string = 'kg'
  ) => {
    await db.updateGoal(id, updates);
    await get().refreshGoals(catalogItems, weightUnit);
  },

  // Mark a goal as achieved
  achieveGoal: async (
    id: string,
    catalogItems: CatalogItem[],
    weightUnit: string = 'kg'
  ) => {
    await db.achieveGoal(id);
    await get().refreshGoals(catalogItems, weightUnit);
  },

  // Cancel a goal
  cancelGoal: async (
    id: string,
    catalogItems: CatalogItem[],
    weightUnit: string = 'kg'
  ) => {
    await db.cancelGoal(id);
    await get().refreshGoals(catalogItems, weightUnit);
  },

  // Delete a goal
  deleteGoal: async (
    id: string,
    catalogItems: CatalogItem[],
    weightUnit: string = 'kg'
  ) => {
    await db.deleteGoal(id);
    await get().refreshGoals(catalogItems, weightUnit);
  },

  // Check if any goals are achieved by a new PR
  checkGoalsOnNewPR: async (log: PRLog, item: CatalogItem) => {
    return goalService.checkGoalsOnNewPR(log, item);
  },

  // Get active goal for a specific item
  getActiveGoalForItem: async (
    itemId: string,
    variant?: Goal['variant'],
    reps?: number,
    pool?: { scoreTypeId?: ScoreType; timeCap?: number; targetReps?: number; distance?: number }
  ) => {
    return db.getActiveGoalForItem(itemId, variant, reps, pool);
  },
}));

// ═══════════════════════════════════════════════════════════════════════════
// SELECTORS (derived state)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get active goal for a specific item from store.
 *
 * For multi-mode items, pass `pool` to resolve the goal bound to a specific
 * score pool (score type + constraint). Legacy goals without a `scoreTypeId`
 * backfill to `pool.primaryScoreType` (the item's primary). Without `pool`,
 * returns the first active goal for the item — unchanged behavior.
 */
export const useActiveGoalForItem = (
  itemId: string,
  pool?: {
    scoreTypeId?: ScoreType;
    timeCap?: number;
    targetReps?: number;
    primaryScoreType?: ScoreType;
    /** Distance pool (meters) for Time goals on distance items */
    distance?: number;
  }
) => {
  return useGoalsStore((state) =>
    state.activeGoals.find((goal) => {
      if (goal.itemId !== itemId) return false;
      if (pool?.distance !== undefined && goal.distance !== pool.distance) return false;
      if (!pool?.scoreTypeId) return true;
      const goalScoreType = goal.scoreTypeId ?? pool.primaryScoreType;
      if (goalScoreType !== pool.scoreTypeId) return false;
      if (pool.timeCap !== undefined && goal.timeCap !== pool.timeCap) return false;
      if (pool.targetReps !== undefined && goal.targetReps !== pool.targetReps) return false;
      return true;
    })
  );
};

/**
 * Get all active goals for a specific item (one per score pool for multi-mode
 * items). Callers resolve the pool match themselves against each group.
 */
export const useActiveGoalsForItem = (itemId: string): GoalWithProgress[] => {
  // Select the stable array reference from the store, then derive the filtered
  // list with useMemo. Filtering inside the selector would return a fresh array
  // each render, breaking snapshot caching → infinite re-render loop.
  const activeGoals = useGoalsStore((state) => state.activeGoals);
  return useMemo(
    () => activeGoals.filter((goal) => goal.itemId === itemId),
    [activeGoals, itemId]
  );
};

/**
 * Get all active goals (already sorted by days remaining in the store)
 */
export const useSortedActiveGoals = () => {
  return useGoalsStore((state) => state.activeGoals);
};

/**
 * Get achieved goals (already sorted by achieved date in the store)
 */
export const useSortedAchievedGoals = () => {
  return useGoalsStore((state) => state.achievedGoals);
};
