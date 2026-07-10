import type { ReactNode } from 'react';

/**
 * PlateStepper — weight picker whose ± keys are colored plates you rack on
 * and off. Blue strips weight, red adds it.
 *
 *   const [w, setW] = useState(142.5);
 *   <PlateStepper value={w} step={2.5} unit="kg" onChange={setW} />
 */
interface PlateStepperProps {
  value: number;
  step?: number;
  unit?: string;
  min?: number;
  onChange?: (v: number) => void;
}

function PlateKey({ color, glow, label, onClick, children }: { color: string; glow: string; label: string; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex shrink-0 items-center justify-center transition-transform active:scale-95"
      style={{ width: 56, height: 56, borderRadius: 9999, background: color, boxShadow: `0 0 16px ${glow}` }}
    >
      <span
        className="flex items-center justify-center"
        style={{ width: 37, height: 37, borderRadius: 9999, background: 'var(--color-surface)', color }}
      >
        {children}
      </span>
    </button>
  );
}

export function PlateStepper({ value, step = 2.5, unit = 'kg', min = 0, onChange }: PlateStepperProps) {
  const rounded = Math.round(value * 100) / 100;
  return (
    <div className="flex items-center justify-between gap-3">
      <PlateKey color="var(--plate-blue)" glow="#0A84FF80" label={`Remove ${step} ${unit}`} onClick={() => onChange?.(Math.max(min, rounded - step))}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14" /></svg>
      </PlateKey>
      <div className="text-center">
        <div className="timer-digits text-[44px] text-white" style={{ letterSpacing: '-1.5px' }}>{rounded}</div>
        <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
          {unit.toUpperCase()} · +{step} STEP
        </div>
      </div>
      <PlateKey color="var(--plate-red)" glow="#FF3B3080" label={`Add ${step} ${unit}`} onClick={() => onChange?.(rounded + step)}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </PlateKey>
    </div>
  );
}
