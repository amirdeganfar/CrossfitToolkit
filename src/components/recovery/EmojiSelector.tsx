/**
 * EmojiSelector Component
 *
 * Military readiness scale — 5-point selector with tactical styling.
 */

import type { MetricValue } from '../../types/training';

interface EmojiSelectorProps {
  value: MetricValue | undefined;
  onChange: (value: MetricValue) => void;
  emojis: Record<number, string>;
  labels: Record<number, string>;
  ariaLabel: string;
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
    <div role="radiogroup" aria-label={ariaLabel} className="flex gap-1 w-full">
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
              flex flex-col items-center justify-center gap-0.5
              flex-1 py-4 rounded-none
              transition-all duration-150 ease-out
              ${isSelected
                ? 'bg-[var(--color-primary)] text-[#0B130B] border border-[var(--color-primary)]'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-border-strong)]'
              }
              ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1 focus:ring-offset-[var(--color-bg)]
            `}
          >
            <span
              className={`text-[10px] font-display leading-none ${isSelected ? 'text-[#0B130B]/60' : 'text-[var(--color-text-muted)]'}`}
              aria-hidden="true"
            >
              {optionValue}
            </span>
            <span className="text-4xl leading-none" aria-hidden="true">{emoji}</span>
            <span
              className={`text-[9px] font-display tracking-[0.1em] leading-tight text-center px-0.5 ${isSelected ? 'text-[#0B130B]/80' : 'text-[var(--color-text-muted)]'}`}
            >
              {label.toUpperCase()}
            </span>
          </button>
        );
      })}
    </div>
  );
};
