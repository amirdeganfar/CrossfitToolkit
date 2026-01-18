import type { CatalogItem } from '../types/catalog';

/**
 * Curated catalog of ~30 common CrossFit benchmarks, lifts, and movements
 */
export const BUILTIN_CATALOG: Omit<CatalogItem, 'isFavorite' | 'createdAt'>[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // BENCHMARK WODs (The Girls)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'fran',
    name: 'Fran',
    category: 'Benchmark',
    scoreType: 'Time',
    description: '21-15-9: Thrusters (95/65 lb) & Pull-ups',
    isBuiltin: true,
  },
  {
    id: 'grace',
    name: 'Grace',
    category: 'Benchmark',
    scoreType: 'Time',
    description: '30 Clean & Jerks for time (135/95 lb)',
    isBuiltin: true,
  },
  {
    id: 'helen',
    name: 'Helen',
    category: 'Benchmark',
    scoreType: 'Time',
    description: '3 RFT: 400m Run, 21 KB Swings (53/35 lb), 12 Pull-ups',
    isBuiltin: true,
  },
  {
    id: 'diane',
    name: 'Diane',
    category: 'Benchmark',
    scoreType: 'Time',
    description: '21-15-9: Deadlifts (225/155 lb) & Handstand Push-ups',
    isBuiltin: true,
  },
  {
    id: 'elizabeth',
    name: 'Elizabeth',
    category: 'Benchmark',
    scoreType: 'Time',
    description: '21-15-9: Cleans (135/95 lb) & Ring Dips',
    isBuiltin: true,
  },
  {
    id: 'cindy',
    name: 'Cindy',
    category: 'Benchmark',
    scoreType: 'Rounds+Reps',
    description: '20 min AMRAP: 5 Pull-ups, 10 Push-ups, 15 Air Squats',
    isBuiltin: true,
  },
  {
    id: 'murph',
    name: 'Murph',
    category: 'Benchmark',
    scoreType: 'Time',
    description: '1 mile Run, 100 Pull-ups, 200 Push-ups, 300 Squats, 1 mile Run (20/14 lb vest)',
    isBuiltin: true,
  },
  {
    id: 'jackie',
    name: 'Jackie',
    category: 'Benchmark',
    scoreType: 'Time',
    description: '1000m Row, 50 Thrusters (45/35 lb), 30 Pull-ups',
    isBuiltin: true,
  },
  {
    id: 'isabel',
    name: 'Isabel',
    category: 'Benchmark',
    scoreType: 'Time',
    description: '30 Snatches for time (135/95 lb)',
    isBuiltin: true,
  },
  {
    id: 'karen',
    name: 'Karen',
    category: 'Benchmark',
    scoreType: 'Time',
    description: '150 Wall Balls for time (20/14 lb)',
    isBuiltin: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFTS (1RM / Max Efforts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'back-squat',
    name: 'Back Squat',
    category: 'Lift',
    scoreType: 'Load',
    description: '1 Rep Max Back Squat',
    isBuiltin: true,
  },
  {
    id: 'front-squat',
    name: 'Front Squat',
    category: 'Lift',
    scoreType: 'Load',
    description: '1 Rep Max Front Squat',
    isBuiltin: true,
  },
  {
    id: 'overhead-squat',
    name: 'Overhead Squat',
    category: 'Lift',
    scoreType: 'Load',
    description: '1 Rep Max Overhead Squat',
    isBuiltin: true,
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    category: 'Lift',
    scoreType: 'Load',
    description: '1 Rep Max Deadlift',
    isBuiltin: true,
  },
  {
    id: 'clean',
    name: 'Clean',
    category: 'Lift',
    scoreType: 'Load',
    description: '1 Rep Max Clean (squat or power)',
    isBuiltin: true,
  },
  {
    id: 'clean-and-jerk',
    name: 'Clean & Jerk',
    category: 'Lift',
    scoreType: 'Load',
    description: '1 Rep Max Clean & Jerk',
    isBuiltin: true,
  },
  {
    id: 'snatch',
    name: 'Snatch',
    category: 'Lift',
    scoreType: 'Load',
    description: '1 Rep Max Snatch (squat or power)',
    isBuiltin: true,
  },
  {
    id: 'strict-press',
    name: 'Strict Press',
    category: 'Lift',
    scoreType: 'Load',
    description: '1 Rep Max Strict Press',
    isBuiltin: true,
  },
  {
    id: 'push-press',
    name: 'Push Press',
    category: 'Lift',
    scoreType: 'Load',
    description: '1 Rep Max Push Press',
    isBuiltin: true,
  },
  {
    id: 'push-jerk',
    name: 'Push Jerk',
    category: 'Lift',
    scoreType: 'Load',
    description: '1 Rep Max Push Jerk',
    isBuiltin: true,
  },
  {
    id: 'bench-press',
    name: 'Bench Press',
    category: 'Lift',
    scoreType: 'Load',
    description: '1 Rep Max Bench Press',
    isBuiltin: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MONOSTRUCTURAL (Cardio / Endurance)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'run',
    name: 'Run',
    category: 'Monostructural',
    scoreType: 'Time',
    description: 'Running for time — specify distance when logging',
    isBuiltin: true,
  },
  {
    id: 'row',
    name: 'Row',
    category: 'Monostructural',
    scoreType: 'Time',
    description: 'Rowing for time — specify distance when logging',
    isBuiltin: true,
  },
  {
    id: 'bike-cals',
    name: 'Assault Bike (Cal)',
    category: 'Monostructural',
    scoreType: 'Calories',
    description: 'Max calories in set time on Assault Bike',
    isBuiltin: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SKILLS (Gymnastics / Max Reps)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'pullups-max',
    name: 'Pull-ups (Max)',
    category: 'Skill',
    scoreType: 'Reps',
    description: 'Max unbroken strict or kipping pull-ups',
    isBuiltin: true,
  },
  {
    id: 'hspu-max',
    name: 'HSPU (Max)',
    category: 'Skill',
    scoreType: 'Reps',
    description: 'Max unbroken handstand push-ups',
    isBuiltin: true,
  },
  {
    id: 'muscle-ups-max',
    name: 'Muscle-ups (Max)',
    category: 'Skill',
    scoreType: 'Reps',
    description: 'Max unbroken ring or bar muscle-ups',
    isBuiltin: true,
  },
  {
    id: 'double-unders-max',
    name: 'Double-unders (Max)',
    category: 'Skill',
    scoreType: 'Reps',
    description: 'Max unbroken double-unders',
    isBuiltin: true,
  },
  {
    id: 'toes-to-bar-max',
    name: 'Toes-to-Bar (Max)',
    category: 'Skill',
    scoreType: 'Reps',
    description: 'Max unbroken toes-to-bar',
    isBuiltin: true,
  },
];

/**
 * Create a full CatalogItem from seed data
 */
export const createCatalogItem = (
  seed: Omit<CatalogItem, 'isFavorite' | 'createdAt'>
): CatalogItem => ({
  ...seed,
  isFavorite: false,
  createdAt: Date.now(),
});

/**
 * Get all builtin catalog items as full CatalogItem objects
 */
export const getBuiltinCatalog = (): CatalogItem[] => 
  BUILTIN_CATALOG.map(createCatalogItem);
