/**
 * Tiny haptics helper. Uses the Vibration API where it exists (Android
 * Chrome); a silent no-op elsewhere (iOS Safari, desktop) and when the user
 * prefers reduced motion.
 */
const vibrate = (pattern: number | number[]): void => {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw when vibration is blocked — never let that break a flow.
  }
};

export const haptics = {
  /** Light confirmation, e.g. a result was saved. */
  success: () => vibrate(15),
  /** Celebratory double pulse — new personal best. */
  pr: () => vibrate([20, 60, 40]),
  /** Goal achieved — longer triple pulse. */
  goal: () => vibrate([30, 50, 30, 50, 60]),
  /** Timer phase change (countdown → work, work ↔ rest, complete). */
  phase: () => vibrate(40),
};
