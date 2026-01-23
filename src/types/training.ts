/**
 * Training & Recovery Types
 *
 * Data models for daily check-ins and recovery scoring.
 */

import type { ReasonMetric, AlertLevel } from '../config/recoveryScoring.config';

// ═══════════════════════════════════════════════════════════════════════════
// METRIC VALUE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** 5-point scale for energy and soreness (1-5) */
export type MetricValue = 1 | 2 | 3 | 4 | 5;

/** Sleep hours preset options */
export type SleepHours = 5 | 6 | 7 | 8 | 9;

/** Check-in type: training day or rest day */
export type CheckInType = 'training' | 'rest';

// ═══════════════════════════════════════════════════════════════════════════
// DAILY CHECK-IN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Daily check-in record.
 *
 * For training days: includes energy, soreness, and sleep metrics.
 * For rest days: only type is set (marks explicit rest).
 */
export interface DailyCheckIn {
  /** Unique identifier */
  id: string;

  /** Date in ISO format (YYYY-MM-DD) */
  date: string;

  /** Type of day: training or explicit rest */
  type: CheckInType;

  /**
   * Energy level (1-5).
   * Only required for training days.
   * 1 = Exhausted, 5 = Great
   */
  energy?: MetricValue;

  /**
   * Soreness level (1-5).
   * Only required for training days.
   * 1 = None, 5 = Severe
   */
  soreness?: MetricValue;

  /**
   * Sleep hours from preset options.
   * Only required for training days.
   */
  sleepHours?: SleepHours;

  /** Timestamp when the check-in was created */
  createdAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// RECOVERY SCORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A single reason contributing to the recovery score.
 */
export interface RecoveryReason {
  /** Which metric contributed */
  metric: ReasonMetric;

  /** Points contributed (internal, not shown to user) */
  points: number;

  /** User-facing message */
  message: string;
}

/**
 * Computed recovery score with alert level and reasons.
 */
export interface RecoveryScore {
  /** Total fatigue points */
  total: number;

  /** Alert level based on total score */
  level: AlertLevel;

  /** Contributing factors with messages */
  reasons: RecoveryReason[];
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT TYPES FOR SERVICE LAYER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Input for creating a training day check-in.
 */
export interface TrainingCheckInInput {
  energy: MetricValue;
  soreness: MetricValue;
  sleepHours: SleepHours;
}

/**
 * Input for calculating recovery score.
 */
export interface RecoveryScoreInput {
  /** Number of consecutive training days (including today) */
  consecutiveDays: number;

  /** Today's check-in (if exists) */
  checkIn: DailyCheckIn | null;
}
