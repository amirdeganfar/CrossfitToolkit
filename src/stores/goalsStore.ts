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
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: (catalogItems: CatalogItem[], weightUnit?: string) => Promise<void>;
  refreshGoals: (catalogItems: CatalogItem[], weightUnit?: string) => Promise<void>;
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
    pool?: { scoreTypeId?: ScoreType; timeCap?: number; targetReps?: number }
  ) => Promise<Goal | undefined>;
}

/**
 * Enrich all goals with progress data and sort appropriately
 */
const enrichAndSortActiveGoals = async (
  goals: Goal[],
  catalogItems: CatalogItem[],
  weightUnit: string = 'kg'
): Promise<GoalWithProgress[]> => {
  const enrichedGoals: GoalWithProgress[] = [];

  for (const goal of goals) {
    const item = catalogItems.find((i) => i.id === goal.itemId);
    if (!item) continue;

    const enriched = await goalService.enrichGoalWithProgress(goal, item, weightUnit);
    enrichedGoals.push(enriched);
  }

  // Sort by days remaining (ascending - most urgent first)
  return enrichedGoals.sort((a, b) => a.daysRemaining - b.daysRemaining);
};

/**
 * Enrich achieved goals and sort by achieved date
 */
const enrichAndSortAchievedGoals = async (
  goals: Goal[],
  catalogItems: CatalogItem[],
  weightUnit: string = 'kg'
): Promise<GoalWithProgress[]> => {
  const enrichedGoals: GoalWithProgress[] = [];

  for (const goal of goals) {
    const item = catalogItems.find((i) => i.id === goal.itemId);
    if (!item) continue;

    const enriched = await goalService.enrichGoalWithProgress(goal, item, weightUnit);
    enrichedGoals.push(enriched);
  }

  // Sort by achieved date (descending - most recent first)
  return enrichedGoals.sort((a, b) => {
    if (!a.achievedAt || !b.achievedAt) return 0;
    return new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime();
  });
};

export const useGoalsStore = create<GoalsState>((set, get) => ({
  // Initial state
  goals: [],
  activeGoals: [],
  achievedGoals: [],
  isLoading: false,
  isInitialized: false,

  // Initialize goals from database
  initialize: async (catalogItems: CatalogItem[], weightUnit: string = 'kg') => {
    if (get().isInitialized) return;

    set({ isLoading: true });

    try {
      const goals = await db.getAllGoals();
      const active = goals.filter((g) => g.status === 'active');
      const achieved = goals.filter((g) => g.status === 'achieved');

      const [activeGoals, achievedGoals] = await Promise.all([
        enrichAndSortActiveGoals(active, catalogItems, weightUnit),
        enrichAndSortAchievedGoals(achieved, catalogItems, weightUnit),
      ]);

      set({
        goals,
        activeGoals,
        achievedGoals,
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('[GoalsStore] Failed to initialize:', error);
      set({ isLoading: false });
    }
  },

  // Refresh goals from database
  refreshGoals: async (catalogItems: CatalogItem[], weightUnit: string = 'kg') => {
    set({ isLoading: true });

    try {
      const goals = await db.getAllGoals();
      const active = goals.filter((g) => g.status === 'active');
      const achieved = goals.filter((g) => g.status === 'achieved');

      const [activeGoals, achievedGoals] = await Promise.all([
        enrichAndSortActiveGoals(active, catalogItems, weightUnit),
        enrichAndSortAchievedGoals(achieved, catalogItems, weightUnit),
      ]);

      set({
        goals,
        activeGoals,
        achievedGoals,
        isLoading: false,
      });
    } catch (error) {
      console.error('[GoalsStore] Failed to refresh:', error);
      set({ isLoading: false });
    }
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
    pool?: { scoreTypeId?: ScoreType; timeCap?: number; targetReps?: number }
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
  pool?: { scoreTypeId?: ScoreType; timeCap?: number; targetReps?: number; primaryScoreType?: ScoreType }
) => {
  return useGoalsStore((state) =>
    state.activeGoals.find((goal) => {
      if (goal.itemId !== itemId) return false;
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
