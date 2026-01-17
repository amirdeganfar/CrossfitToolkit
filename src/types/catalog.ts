/**
 * Category of a catalog item
 */
export type Category = 
  | 'Benchmark'      // Named WODs (Fran, Grace, etc.)
  | 'Lift'           // Strength movements (Back Squat, Clean, etc.)
  | 'Monostructural' // Cardio (Row, Run, Bike, etc.)
  | 'Skill'          // Gymnastics & skills (Pull-ups, Muscle-ups, etc.)
  | 'Custom';        // User-created items

/**
 * How the result is scored
 */
export type ScoreType = 
  | 'Time'           // Measured in MM:SS (lower is better)
  | 'Load'           // Measured in kg/lb (higher is better)
  | 'Reps'           // Count of repetitions (higher is better)
  | 'Rounds+Reps'    // AMRAP format: "18+5" (higher is better)
  | 'Distance'       // Measured in meters (higher is better)
  | 'Calories';      // Measured in cal (higher is better)

/**
 * Variant of performance (affects PR comparison)
 */
export type Variant = 'Rx' | 'Scaled' | 'Rx+' | null;

/**
 * A catalog item (benchmark, lift, or custom)
 */
export interface CatalogItem {
  id: string;
  name: string;
  category: Category;
  scoreType: ScoreType;
  description?: string;
  isBuiltin: boolean;      // true for seed items, false for user-created
  isFavorite: boolean;     // user preference
  createdAt: number;       // timestamp
}

/**
 * A logged result/PR
 */
export interface PRLog {
  id: string;
  catalogItemId: string;
  result: string;          // "4:32", "100", "18+5", etc.
  resultValue: number;     // Normalized numeric value for comparison
  variant: Variant;
  date: number;            // timestamp
  notes?: string;
  createdAt: number;
}

/**
 * User settings
 */
export interface UserSettings {
  weightUnit: 'kg' | 'lb';
  distanceUnit: 'm' | 'ft';
}
