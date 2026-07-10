/**
 * ScaleSelector (file kept as EmojiSelector for drop-in compatibility)
 *
 * BLACKOUT redesign — no emoji. A 5-point segmented tap-scale: segments
 * fill up to the selected value in a metric-appropriate tone (green for
 * positive metrics like energy, orange for load metrics like soreness),
 * with the chosen level's word shown below.
 *
 * Same props as the old EmojiSelector, so call sites need no changes.
 * The `emojis` prop is accepted but ignored.
 */

import type { MetricValue } from '../../types/training';

interface EmojiSelectorProps {
  value: MetricValue | undefined;
  onChange: (value: MetricValue) => void;
  emojis: Record<number, string>; // accepted for compatibility, unused
  labels: Record<number, string>;
  ariaLabel: string;
  disabled?: boolean;
}

export const EmojiSelector = ({
  value,
  onChange,
  labels,
  ariaLabel,
  disabled = false,
}: EmojiSelectorProps) => {
  const values: MetricValue[] = [1, 2, 3, 4, 5];

  // "load" metrics (soreness / stress) read as amber; everything else green.
  const tone = /soreness|sore|stress|fatigue/i.test(ariaLabel)
    ? 'var(--color-warning)'
    : 'var(--color-success)';

  const handleKeyDown = (e: React.KeyboardEvent, optionValue: MetricValue) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(optionValue);
    }
  };

  const selectedLabel = value ? labels[value] : undefined;

  return (
    <div>
      <div role="radiogroup" aria-label={ariaLabel} className="flex gap-1.5 w-full">
        {values.map((optionValue) => {
          const filled = value !== undefined && optionValue <= value;
          return (
            <button
              key={optionValue}
              type="button"
              role="radio"
              aria-checked={value === optionValue}
              aria-label={`${labels[optionValue] ?? ''} (${optionValue} of 5)`}
              tabIndex={0}
              disabled={disabled}
              onClick={() => onChange(optionValue)}
              onKeyDown={(e) => handleKeyDown(e, optionValue)}
              className={`flex-1 flex items-center justify-center rounded-[10px] h-11 text-[13px] font-semibold transition-all duration-150 ease-out ${
                disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'
              } focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1 focus:ring-offset-[var(--color-bg)]`}
              style={
                filled
                  ? { background: tone, color: 'var(--color-bg)', boxShadow: `0 0 10px ${value ? tone : 'transparent'}44` }
                  : { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }
              }
            >
              {optionValue}
            </button>
          );
        })}
      </div>
      <div className="mt-2 label-eyebrow" style={{ color: selectedLabel ? tone : 'var(--color-text-dim)' }}>
        {selectedLabel ?? 'Tap to rate'}
      </div>
    </div>
  );
};
