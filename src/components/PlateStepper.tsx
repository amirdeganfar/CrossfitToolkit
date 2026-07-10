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

function PlateKey({ color, onClick, children }: { color: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 items-center justify-center transition-transform active:scale-95"
      style={{ width: 56, height: 56, borderRadius: 9999, background: color, boxShadow: `0 0 16px ${color}80` }}
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
  return (
    <div className="flex items-center justify-between gap-3">
      <PlateKey color="#0A84FF" onClick={() => onChange?.(Math.max(min, value - step))}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14" /></svg>
      </PlateKey>
      <div className="text-center">
        <div className="timer-digits text-[44px] text-white" style={{ letterSpacing: '-1.5px' }}>{value}</div>
        <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
          {unit.toUpperCase()} · +{step} STEP
        </div>
      </div>
      <PlateKey color="#FF3B30" onClick={() => onChange?.(value + step)}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </PlateKey>
    </div>
  );
}
