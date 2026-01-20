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
 * Optional subtype classification for richer filtering/search.
 * Kept separate from `Category` to avoid breaking existing UI flows.
 */
export type SubCategory =
  | 'Girls'
  | 'Heroes'
  | 'Open'
  | 'Games'
  | 'Notable'
  | 'Movement'
  | 'Equipment'
  | 'Test'
  | 'Other';

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
 * Metric type for Monostructural items (what input metrics are supported)
 */
export type MetricType = 'distance' | 'calories' | 'distance+calories';

/**
 * A catalog item (benchmark, lift, or custom)
 */
export interface CatalogItem {
  id: string;
  name: string;
  category: Category;
  subCategory?: SubCategory;
  tags?: string[];
  scoreType: ScoreType;
  description?: string;
  movements?: string[];    // Structured list of movements for benchmarks (e.g., ["Thrusters", "Pull-ups"])
  aliases?: string[];      // Alternative names for search (e.g. "C&J", "Clean and Jerk")
  source?: string;         // Provenance label (e.g. "curated", "CrossFit Open", "community")
  sourceUrl?: string;      // Optional URL to the original reference
  isBuiltin: boolean;      // true for seed items, false for user-created
  isFavorite: boolean;     // user preference
  createdAt: number;       // timestamp
  metrics?: MetricType;    // For Monostructural items: what input metrics are supported
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
  reps?: number;           // For Load scoreType (e.g., 5 reps @ 100kg)
  distance?: number;       // For Monostructural Time (e.g., 200m in 30s)
  calories?: number;       // For Monostructural Time on bike (e.g., 50 cal in 3:20)
  createdAt: number;
}

/**
 * User settings
 */
export interface UserSettings {
  weightUnit: 'kg' | 'lb';
  distanceUnit: 'm' | 'ft';
  hasSeenOnboarding?: boolean;
}

/**
 * Favorite item reference (stores only the itemId)
 */
export interface Favorite {
  id: string; // Same as the catalog item ID
}

/**
 * Custom catalog item created by user (stored in DB)
 */
export interface CustomItem {
  id: string;
  name: string;
  category: Category;
  subCategory?: SubCategory;
  tags?: string[];
  scoreType: ScoreType;
  description?: string;
  movements?: string[];    // Structured list of movements for benchmarks
  aliases?: string[];
  source?: string;
  sourceUrl?: string;
  createdAt: number;
  metrics?: MetricType;
}
