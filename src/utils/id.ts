/**
 * Generate a unique id with a readable prefix, e.g. `log-3f2a…`.
 * Uses crypto.randomUUID when available (secure contexts); otherwise falls
 * back to timestamp + random so rapid double submits can't collide.
 */
export const makeId = (prefix: string): string => {
  const unique =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${unique}`;
};
