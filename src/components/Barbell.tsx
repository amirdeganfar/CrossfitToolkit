/**
 * Barbell — loaded-bar progress toward a goal.
 * The filled portion is the iron; a cluster of colored plates sits at the
 * current load; a marker sits at the goal. Great for goal cards & detail.
 *
 *   <Barbell current={142.5} goal={160} />
 */
interface BarbellProps {
  current: number;
  goal: number;
  /** lower value is better (e.g. Fran time) — inverts the fill direction meaning */
  lowerIsBetter?: boolean;
}

export function Barbell({ current, goal, lowerIsBetter = false }: BarbellProps) {
  const raw = lowerIsBetter ? goal / current : current / goal;
  const pct = Math.max(4, Math.min(100, Math.round(raw * 100)));
  return (
    <div className="relative flex h-[30px] items-center">
      {/* track */}
      <div className="absolute inset-x-0 h-[5px] rounded-full" style={{ background: 'var(--color-border-strong)' }} />
      {/* loaded iron */}
      <div className="absolute left-0 h-[5px] rounded-full bg-white" style={{ width: `${pct}%` }} />
      {/* plate cluster at current load */}
      <div className="absolute flex items-center gap-[2px]" style={{ left: `${pct}%`, transform: 'translateX(-100%)' }}>
        <span className="h-4 w-[5px] rounded-[2px]" style={{ background: 'var(--plate-green)', boxShadow: '0 0 8px #34C75999' }} />
        <span className="h-[22px] w-[5px] rounded-[2px]" style={{ background: 'var(--plate-blue)', boxShadow: '0 0 8px #0A84FF99' }} />
        <span className="h-7 w-[5px] rounded-[2px]" style={{ background: 'var(--plate-red)', boxShadow: '0 0 8px #FF3B3099' }} />
      </div>
      {/* goal marker */}
      <div className="absolute right-0 h-5 w-[2px]" style={{ background: 'var(--color-text-dim)' }} />
    </div>
  );
}
