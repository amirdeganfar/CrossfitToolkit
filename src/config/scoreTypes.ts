/**
 * Score Type Registry
 *
 * Single source of truth for how each score type behaves: how a raw result
 * string parses to a comparable number, whether lower is better, what input
 * control the log form renders, and how results are formatted for display.
 *
 * Adding a new score type = add one entry to `SCORE_TYPES` (plus the id to the
 * `ScoreType` union in `types/catalog.ts`). Nothing else in the app hardcodes
 * per-type behavior — `resultParser`, `goalService`, and the UI all drive off
 * this registry.
 */

import type { ScoreType, CatalogItem, PRLog } from '../types/catalog';

// ═══════════════════════════════════════════════════════════════════════════
// PRIMITIVE PARSERS (leaf helpers — no dependency on other modules)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse a time string (MM:SS or HH:MM:SS) to seconds
 */
export const parseTimeToSeconds = (time: string): number => {
  const parts = time.split(':').map(Number);
  if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
};

/**
 * Format seconds to time string (MM:SS or HH:MM:SS)
 */
export const formatSecondsToTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Parse Rounds+Reps format (e.g., "18+5") to total reps equivalent
 * Assumes a standard round of ~15 reps for comparison purposes
 */
export const parseRoundsReps = (value: string): number => {
  const match = value.match(/^(\d+)\+(\d+)$/);
  if (match) {
    const rounds = parseInt(match[1], 10);
    const reps = parseInt(match[2], 10);
    return rounds * 100 + reps; // Normalize for comparison
  }
  return parseInt(value, 10) || 0;
};

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A constraint captured alongside the result (e.g. the time cap for RepsInTime,
 * the rep target for TimeForReps). Drives the extra input the log form shows.
 */
export interface ScoreConstraintDef {
  /** Which PRLog / CatalogItem field stores this constraint */
  field: 'timeCap' | 'targetReps';
  /** Field label shown in the log form (e.g. "TIME CAP") */
  label: string;
  /** Input control used to capture the constraint */
  kind: 'time' | 'number';
  /** Placeholder for the constraint input */
  placeholder?: string;
}

/**
 * Behavioral definition for a single score type.
 */
export interface ScoreTypeDef {
  /** Matches the `ScoreType` union in types/catalog.ts */
  id: ScoreType;
  /** Human name for dropdowns / section headers (e.g. "Reps in Time") */
  name: string;
  /** Label for the result input field (e.g. "Reps", "Time", "Weight") */
  resultLabel: string;
  /** True when a lower numeric result is better (e.g. Time) */
  lowerIsBetter: boolean;
  /** Placeholder text for the result input */
  placeholder: string;
  /** Which control the log form renders for the result value */
  resultInput: 'time' | 'load' | 'text';
  /** Unit the result carries, if any (resolved to weight/distance unit at render) */
  unit?: 'weight' | 'distance';
  /** Optional constraint captured with the result */
  constraint?: ScoreConstraintDef;
  /** Parse a raw result string to a comparable numeric value */
  parse: (result: string) => number;
  /** Validate a raw result string */
  validate: (result: string) => boolean;
  /** Format a result string for display (unit resolved by caller) */
  format: (result: string, unit?: string) => string;
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

const TIME_RE = /^(\d{1,2}:)?\d{1,2}:\d{2}$/;
const NUMERIC_RE = /^\d+(\.\d+)?$/;
const ROUNDS_RE = /^\d+(\+\d+)?$/;

/**
 * Behavioral registry for every score type. Keyed by `ScoreType` id.
 */
export const SCORE_TYPES: Record<ScoreType, ScoreTypeDef> = {
  Time: {
    id: 'Time',
    name: 'Time',
    resultLabel: 'Time',
    lowerIsBetter: true,
    placeholder: 'e.g., 4:32 or 1:05:30',
    resultInput: 'time',
    parse: (r) => parseTimeToSeconds(r),
    validate: (r) => TIME_RE.test(r),
    format: (r) => r, // Already formatted as MM:SS
  },
  Load: {
    id: 'Load',
    name: 'Load',
    resultLabel: 'Weight',
    lowerIsBetter: false,
    placeholder: 'e.g., 100',
    resultInput: 'load',
    unit: 'weight',
    parse: (r) => parseFloat(r) || 0,
    validate: (r) => NUMERIC_RE.test(r),
    format: (r, unit) => `${r}${unit || 'kg'}`,
  },
  Reps: {
    id: 'Reps',
    name: 'Reps',
    resultLabel: 'Reps',
    lowerIsBetter: false,
    placeholder: 'e.g., 25',
    resultInput: 'text',
    parse: (r) => parseFloat(r) || 0,
    validate: (r) => NUMERIC_RE.test(r),
    format: (r) => `${r} reps`,
  },
  'Rounds+Reps': {
    id: 'Rounds+Reps',
    name: 'Rounds + Reps',
    resultLabel: 'Rounds + Reps',
    lowerIsBetter: false,
    placeholder: 'e.g., 18+5',
    resultInput: 'text',
    parse: (r) => parseRoundsReps(r),
    validate: (r) => ROUNDS_RE.test(r),
    format: (r) => r, // Already formatted as "18+5"
  },
  Distance: {
    id: 'Distance',
    name: 'Distance',
    resultLabel: 'Distance',
    lowerIsBetter: false,
    placeholder: 'e.g., 1000',
    resultInput: 'text',
    unit: 'distance',
    parse: (r) => parseFloat(r) || 0,
    validate: (r) => NUMERIC_RE.test(r),
    format: (r, unit) => `${r}${unit || 'm'}`,
  },
  Calories: {
    id: 'Calories',
    name: 'Calories',
    resultLabel: 'Calories',
    lowerIsBetter: false,
    placeholder: 'e.g., 50',
    resultInput: 'text',
    parse: (r) => parseFloat(r) || 0,
    validate: (r) => NUMERIC_RE.test(r),
    format: (r) => `${r} cal`,
  },
  RepsInTime: {
    id: 'RepsInTime',
    name: 'Reps in Time',
    resultLabel: 'Reps',
    lowerIsBetter: false,
    placeholder: 'e.g., 15',
    resultInput: 'text',
    constraint: { field: 'timeCap', label: 'TIME CAP', kind: 'time' },
    parse: (r) => parseFloat(r) || 0,
    validate: (r) => NUMERIC_RE.test(r),
    format: (r) => `${r} reps`,
  },
  TimeForReps: {
    id: 'TimeForReps',
    name: 'Time for Reps',
    resultLabel: 'Time',
    lowerIsBetter: true,
    placeholder: 'e.g., 0:45',
    resultInput: 'time',
    constraint: { field: 'targetReps', label: 'TARGET REPS', kind: 'number', placeholder: 'e.g., 10' },
    parse: (r) => parseTimeToSeconds(r),
    validate: (r) => TIME_RE.test(r),
    format: (r) => r, // Already formatted as MM:SS
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ACCESSORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the behavioral definition for a score type.
 */
export const getScoreTypeDef = (scoreType: ScoreType): ScoreTypeDef => SCORE_TYPES[scoreType];

/**
 * Whether a lower numeric result is better for this score type.
 */
export const isLowerBetter = (scoreType: ScoreType): boolean => SCORE_TYPES[scoreType].lowerIsBetter;

/**
 * Resolve the score modes an item supports.
 *
 * If `scoreTypeIds` is set (and non-empty), those are the allowed modes.
 * Otherwise the item is single-mode and behaves exactly as before: `[scoreType]`.
 * The primary `scoreType` is guaranteed to be present and is the default.
 */
export const getScoreModes = (item: CatalogItem | null | undefined): ScoreType[] => {
  if (!item) return [];
  const ids = item.scoreTypeIds;
  if (ids && ids.length > 0) {
    // Ensure the primary type is present, keeping declared order, and drop any
    // duplicate entries (first occurrence wins).
    const ordered = ids.includes(item.scoreType) ? ids : [item.scoreType, ...ids];
    return [...new Set(ordered)];
  }
  return [item.scoreType];
};

/**
 * The score type a specific log was recorded under.
 * Backfills to the item's primary `scoreType` for logs saved before per-log
 * score types existed (zero-migration read path).
 */
export const getLogScoreType = (
  log: Pick<PRLog, 'scoreTypeId'>,
  item: Pick<CatalogItem, 'scoreType'>
): ScoreType => log.scoreTypeId ?? item.scoreType;
