import { splitUnit } from '../utils/units';

/**
 * Stat — a number with a smaller muted unit suffix, tabular digits.
 *
 *   <Stat value="100" unit="kg" size="hero" tone="primary" />
 *   <Stat text="220.5lb" />          // splits the suffix itself
 *   <Stat text="5 reps @ 100kg" />   // small "5 reps @", big "100", small "kg"
 */
interface StatProps {
  /** Pre-split value. Ignored when `text` is given. */
  value?: string | number;
  unit?: string;
  /** A formatted string like "100kg" / "50 cal"; the unit is split off. */
  text?: string;
  size?: 'hero' | 'lg' | 'md' | 'sm';
  tone?: 'default' | 'primary';
  className?: string;
}

const SIZE: Record<NonNullable<StatProps['size']>, string> = {
  hero: 'text-[clamp(40px,13vw,56px)]',
  lg: 'text-[28px]',
  md: 'text-[20px]',
  sm: 'text-[17px]',
};

export function Stat({ value, unit, text, size = 'md', tone = 'default', className = '' }: StatProps) {
  const parts =
    text !== undefined ? splitUnit(text) : { prefix: '', value: String(value ?? ''), unit: unit ?? '' };
  const color = tone === 'primary' ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text)]';
  return (
    <span className={`stat ${SIZE[size]} ${className}`}>
      {/* Compound label ("5 reps @") stays caption-sized; only the number is big. */}
      {parts.prefix && <span className="stat-unit mr-[0.2em]">{parts.prefix}</span>}
      <span className={`stat-value ${color}`}>{parts.value}</span>
      {parts.unit && <span className="stat-unit">{parts.unit}</span>}
    </span>
  );
}
