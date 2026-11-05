/**
 * RecoveryTrends — review surface for daily check-in history.
 *
 * Small multiples (one mini bar chart per metric) of the last ~14 training
 * check-ins: energy, soreness, and sleep over time. Single-hue marks — recessive
 * grey bars with the latest reading in the primary accent — labels never rely on
 * color alone. Metrics live on different scales, so they are three separate
 * charts (never a dual axis).
 */

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { Skeleton } from '../Skeleton';
import { EmptyState } from '../EmptyState';
import { getRecentCheckIns } from '../../services/checkInService';
import { useCheckInStore } from '../../stores/checkInStore';
import { ENERGY_LABELS, SORENESS_LABELS, SLEEP_LABELS } from '../../config/recoveryScoring.config';
import type { DailyCheckIn } from '../../types/training';

// How many recent training check-ins the trend spans.
const WINDOW = 14;

interface MetricPoint {
  date: string;
  value: number; // raw metric value
  frac: number;  // 0..1 height fraction against the metric's scale
  label: string; // e.g. "Good", "3h", "Moderate"
}

interface TrendSpec {
  key: string;
  title: string;
  points: MetricPoint[];
}

// One mini bar chart: baseline-anchored thin bars, 2px gaps, latest bar accented.
const BarTrend = ({ title, points }: { title: string; points: MetricPoint[] }) => {
  const latest = points[points.length - 1];
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="label-eyebrow">{title}</span>
        <span className="font-display text-sm text-[var(--color-text)]">
          {latest.label}
          <span className="text-[var(--color-text-muted)]"> · latest</span>
        </span>
      </div>
      <div
        className="flex items-end gap-[2px] h-12"
        role="img"
        aria-label={`${title} over the last ${points.length} check-ins. Latest: ${latest.label}.`}
      >
        {points.map((p, i) => {
          const isLatest = i === points.length - 1;
          return (
            <div
              key={p.date}
              className="flex-1 rounded-t-[3px] min-h-[3px]"
              style={{
                height: `${Math.max(p.frac * 100, 6)}%`,
                background: isLatest ? 'var(--color-text)' : 'var(--color-text-muted)',
                opacity: isLatest ? 1 : 0.45,
              }}
              title={`${p.date}: ${p.label}`}
            />
          );
        })}
      </div>
    </div>
  );
};

export const RecoveryTrends = () => {
  // Re-fetch when today's check-in changes so a fresh save shows up.
  const todayCheckIn = useCheckInStore((s) => s.todayCheckIn);
  const [checkIns, setCheckIns] = useState<DailyCheckIn[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const recent = await getRecentCheckIns(30);
      if (!cancelled) setCheckIns(recent);
    })();
    return () => { cancelled = true; };
  }, [todayCheckIn]);

  if (checkIns === null) {
    return (
      <section aria-label="Recovery trends">
        <h2 className="t-section mb-3">Recovery trends</h2>
        <div className="card space-y-4" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-12 w-full" /></div>)}
        </div>
      </section>
    );
  }

  // Only training days carry energy/soreness/sleep. Oldest → newest, capped to window.
  const training = checkIns
    .filter((c) => c.type === 'training' && c.energy != null && c.soreness != null && c.sleepHours != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-WINDOW);

  if (training.length < 2) {
    return (
      <section aria-label="Recovery trends">
        <h2 className="t-section mb-3">Recovery trends</h2>
        <EmptyState icon={Activity} message="Log a few training-day check-ins to see energy, soreness and sleep trends." />
      </section>
    );
  }

  const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const specs: TrendSpec[] = [
    {
      key: 'energy',
      title: 'Energy',
      points: training.map((c) => ({ date: fmtDate(c.date), value: c.energy!, frac: c.energy! / 5, label: ENERGY_LABELS[c.energy!] })),
    },
    {
      key: 'soreness',
      title: 'Soreness',
      points: training.map((c) => ({ date: fmtDate(c.date), value: c.soreness!, frac: c.soreness! / 5, label: SORENESS_LABELS[c.soreness!] })),
    },
    {
      key: 'sleep',
      title: 'Sleep',
      // Sleep ranges 5–9h; anchor the baseline near 4h so differences read.
      points: training.map((c) => ({ date: fmtDate(c.date), value: c.sleepHours!, frac: (c.sleepHours! - 4) / 5, label: SLEEP_LABELS[c.sleepHours!] })),
    },
  ];

  return (
    <section aria-label="Recovery trends">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="t-section">Recovery trends</h2>
        <span className="t-caption num">Last {training.length} check-ins</span>
      </div>
      <div className="card space-y-4">
        {specs.map((s) => (
          <BarTrend key={s.key} title={s.title} points={s.points} />
        ))}
      </div>
    </section>
  );
};
