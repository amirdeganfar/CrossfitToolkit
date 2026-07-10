import type { Category } from '../types/catalog';

/**
 * Blackout category → CSS custom-property color.
 * Points at the --color-cat-* tokens defined in index.css so category
 * accents recolor with the design system. Monostructural maps to the
 * "cardio/mono" green token.
 */
const CATEGORY_VAR: Record<Category, string> = {
  Benchmark: 'var(--color-cat-benchmark)',
  Lift: 'var(--color-cat-lift)',
  Monostructural: 'var(--color-cat-mono)',
  Skill: 'var(--color-cat-skill)',
  Custom: 'var(--color-cat-custom)',
};

/** Resolved hex fallbacks (for canvas/SVG contexts that can't read CSS vars). */
const CATEGORY_HEX: Record<Category, string> = {
  Benchmark: '#FF9F0A',
  Lift: '#0A84FF',
  Monostructural: '#34C759',
  Skill: '#BF5AF2',
  Custom: '#FF375F',
};

export const categoryColorVar = (category: Category): string =>
  CATEGORY_VAR[category] ?? 'var(--color-text-muted)';

export const categoryColorHex = (category: Category): string =>
  CATEGORY_HEX[category] ?? '#8E8E93';
