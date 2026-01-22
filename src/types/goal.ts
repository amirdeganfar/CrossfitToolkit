import type { Variant } from './catalog';

/**
 * Goal status
 */
export type GoalStatus = 'active' | 'achieved' | 'cancelled';

/**
 * Trend indicator for goal progress
 */
export type TrendStatus = 'ahead' | 'on_track' | 'behind' | 'no_data';

/**
 * A user-defined goal for a catalog item
 */
export interface Goal {
  id: string;
  itemId: string;              // Reference to catalog item
  targetValue: number;         // Normalized value (kg, seconds, reps)
  targetDate: string;          // ISO date string (YYYY-MM-DD)
  createdAt: string;           // ISO date string when goal was created
  status: GoalStatus;
  achievedAt?: string;         // ISO date string when goal was achieved
  variant?: Variant;           // For benchmarks (Rx/Scaled/Rx+)
  reps?: number;               // For lifts (e.g., 1RM vs 3RM goal)
}

/**
 * Goal with computed progress data
 */
export interface GoalWithProgress extends Goal {
  itemName: string;
  currentValue: number | null;  // Current best PR value
  currentResult: string | null; // Current best PR formatted result
  targetResult: string;         // Target value formatted as result
  progress: number;             // 0-100 percentage
  daysRemaining: number;        // Days until target date
  trend: TrendStatus;           // Projected trend
  projectedDate?: string;       // Estimated achievement date
}

/**
 * Input for creating a new goal
 */
export interface CreateGoalInput {
  itemId: string;
  targetValue: number;
  targetDate: string;
  variant?: Variant;
  reps?: number;
}

/**
 * Input for updating an existing goal
 */
export interface UpdateGoalInput {
  targetValue?: number;
  targetDate?: string;
  status?: GoalStatus;
  achievedAt?: string;
  variant?: Variant;
  reps?: number;
}
