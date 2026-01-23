/**
 * EmojiSelector Component
 *
 * A 5-point emoji-based input for metrics like energy and soreness.
 * Provides accessible, mobile-friendly selection with visual feedback.
 */

import type { MetricValue } from '../../types/training';

interface EmojiSelectorProps {
  /** Current selected value (1-5 or undefined) */
  value: MetricValue | undefined;
  /** Called when a value is selected */
  onChange: (value: MetricValue) => void;
  /** Mapping of values to emoji characters */
  emojis: Record<number, string>;
  /** Mapping of values to labels */
  labels: Record<number, string>;
  /** Accessible label for the group */
  ariaLabel: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

export const EmojiSelector = ({
  value,
  onChange,
  emojis,
  labels,
  ariaLabel,
  disabled = false,
}: EmojiSelectorProps) => {
  const values: MetricValue[] = [1, 2, 3, 4, 5];

  const handleKeyDown = (e: React.KeyboardEvent, optionValue: MetricValue) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(optionValue);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex gap-1.5"
    >
      {values.map((optionValue) => {
        const isSelected = value === optionValue;
        const emoji = emojis[optionValue] ?? '?';
        const label = labels[optionValue] ?? '';

        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${label} (${optionValue} of 5)`}
            tabIndex={0}
            disabled={disabled}
            onClick={() => onChange(optionValue)}
            onKeyDown={(e) => handleKeyDown(e, optionValue)}
            className={`
              flex flex-col items-center justify-center
              w-12 h-14 rounded-lg
              transition-all duration-150 ease-out
              ${isSelected
                ? 'bg-[var(--color-primary)] text-white scale-105 shadow-md'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]'
              }
              ${disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-elevated)] active:scale-95'
              }
              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg)]
            `}
          >
            <span className="text-xl" aria-hidden="true">
              {emoji}
            </span>
            <span className={`text-[10px] mt-0.5 font-medium ${isSelected ? 'text-white/90' : 'text-[var(--color-text-muted)]'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
