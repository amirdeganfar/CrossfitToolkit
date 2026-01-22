import { create } from 'zustand';
import type { Goal, GoalWithProgress, CreateGoalInput, UpdateGoalInput } from '../types/goal';
import type { CatalogItem, PRLog } from '../types/catalog';
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
    reps?: number
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
    reps?: number
  ) => {
    return db.getActiveGoalForItem(itemId, variant, reps);
  },
}));

// ═══════════════════════════════════════════════════════════════════════════
// SELECTORS (derived state)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get active goal for a specific item from store
 */
export const useActiveGoalForItem = (itemId: string) => {
  return useGoalsStore((state) =>
    state.activeGoals.find((goal) => goal.itemId === itemId)
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
