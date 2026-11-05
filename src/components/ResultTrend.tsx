/**
 * ResultTrend — one pool's results over time (rep scheme, variant, distance…).
 *
 * Single series: neutral line + points, running-best (PR) points in the primary
 * red, optional dashed goal line. Values arrive already in display units.
 * Lower-is-better pools flip the y-axis so "up" always reads as better.
 *
 * Interaction: tap / hover picks the nearest point; the chart is one focusable
 * group driven by arrow keys (Home/End, Escape clears). An sr-only summary
 * describes the whole series.
 */

import { useEffect, useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { formatSecondsToTime } from '../config/scoreTypes';

export type TrendKind = 'weight' | 'distance' | 'time' | 'rr' | 'reps' | 'cal';

export interface TrendPoint {
  id: string;
  date: number;  // timestamp
  value: number; // display units (kg/lb, m/ft, seconds, rounds+reps/100, reps, cal)
}

export interface TrendPool {
  key: string;
  label: string;          // chip label: "1RM", "Rx", "500m"
  kind: TrendKind;
  lowerIsBetter: boolean;
  points: TrendPoint[];
  goal?: number;          // display units
}

interface ResultTrendProps {
  itemName: string;
  pools: TrendPool[];
  defaultKey?: string;
  weightUnit: 'kg' | 'lb';
  distanceUnit: 'm' | 'ft';
}

const HEIGHT = 160;
const M = { top: 22, right: 12, bottom: 22, left: 40 };
// Inner inset so edge points never sit on the axis labels / clip.
const INSET = 7;
const r1 = (n: number) => Math.round(n * 10) / 10;

const formatRR = (v: number): string => {
  const rounds = Math.floor(v + 1e-9);
  return `${rounds}+${Math.round((v - rounds) * 100)}`;
};

// Full value for readouts / summary.
const formatValue = (v: number, kind: TrendKind, wu: string, du: string): string => {
  switch (kind) {
    case 'weight': return `${r1(v)}${wu}`;
    case 'distance': return `${Math.round(v)}${du}`;
    case 'time': return formatSecondsToTime(v);
    case 'rr': return formatRR(v);
    case 'reps': return `${r1(v)} reps`;
    case 'cal': return `${r1(v)} cal`;
  }
};

// Compact axis tick (unit lives in the axis caption).
const formatTick = (v: number, kind: TrendKind): string => {
  if (kind === 'time') return formatSecondsToTime(v);
  if (kind === 'rr') return formatRR(v);
  return String(r1(v));
};

const axisCaption = (kind: TrendKind, lowerIsBetter: boolean, wu: string, du: string): string => {
  if (lowerIsBetter) return 'faster ↑';
  switch (kind) {
    case 'weight': return wu;
    case 'distance': return du;
    case 'rr': return 'R+R';
    case 'reps': return 'reps';
    case 'cal': return 'cal';
    default: return '';
  }
};

const TIME_STEPS = [1, 2, 5, 10, 15, 20, 30, 60, 120, 300, 600, 900, 1800, 3600];

// "Nice" step for ~`count` ticks. Times snap to clock-friendly seconds.
const niceStep = (span: number, count: number, kind: TrendKind): number => {
  const raw = span / Math.max(count - 1, 1);
  if (kind === 'time') return TIME_STEPS.find((s) => s >= raw) ?? Math.ceil(raw / 3600) * 3600;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  let step = nice * mag;
  if (kind === 'reps' || kind === 'cal' || kind === 'distance') step = Math.max(1, Math.round(step));
  if (kind === 'rr') step = Math.max(0.01, Math.round(step * 100) / 100);
  return step;
};

const niceDomain = (values: number[], kind: TrendKind) => {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    const pad = kind === 'time' ? 15 : Math.max(Math.abs(min) * 0.05, 1);
    min -= pad;
    max += pad;
  }
  const step = niceStep(max - min, 4, kind);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return { lo, hi, ticks };
};

const shortDate = (ts: number, withYear: boolean): string =>
  new Date(ts).toLocaleDateString('en-US', withYear ? { month: 'short', year: '2-digit' } : { month: 'short', day: 'numeric' });

const longDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Width of the container, tracked with a ResizeObserver. A callback ref so it
// still attaches when the chart mounts later (pool gains its 2nd result).
const useWidth = () => {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, width] as const;
};

export function ResultTrend({ itemName, pools, defaultKey, weightUnit, distanceUnit }: ResultTrendProps) {
  const eligible = useMemo(() => pools.filter((p) => p.points.length >= 2), [pools]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [wrapRef, width] = useWidth();
  const summaryId = useId();

  const pool =
    eligible.find((p) => p.key === selectedKey) ??
    eligible.find((p) => p.key === defaultKey) ??
    [...eligible].sort((a, b) => b.points.length - a.points.length)[0];

  if (!pool) return null;

  const { kind, lowerIsBetter, goal } = pool;
  const points = [...pool.points].sort((a, b) => a.date - b.date);
  const fmt = (v: number) => formatValue(v, kind, weightUnit, distanceUnit);
  const better = (a: number, b: number) => (lowerIsBetter ? a < b : a > b);

  // Running best: a point that beats everything before it. The first point only
  // counts when it is still the overall best, so the PB is always highlighted.
  const bestValue = points.reduce((b, p) => (better(p.value, b) ? p.value : b), points[0].value);
  const isPR = points.map((p, i) => {
    if (i === 0) return p.value === bestValue;
    return points.slice(0, i).every((q) => better(p.value, q.value));
  });

  // Scales
  const domain = niceDomain(goal !== undefined ? [...points.map((p) => p.value), goal] : points.map((p) => p.value), kind);
  const x0 = M.left + INSET;
  const plotW = Math.max(width - x0 - M.right - INSET, 1);
  const plotH = HEIGHT - M.top - M.bottom - INSET * 2;
  const t0 = points[0].date;
  const t1 = points[points.length - 1].date;
  const xOf = (p: TrendPoint, i: number) =>
    x0 + (t1 === t0 ? (i / (points.length - 1)) * plotW : ((p.date - t0) / (t1 - t0)) * plotW);
  const yOf = (v: number) => {
    const f = (v - domain.lo) / (domain.hi - domain.lo || 1);
    return M.top + INSET + (lowerIsBetter ? f : 1 - f) * plotH;
  };
  const xy = points.map((p, i) => ({ x: xOf(p, i), y: yOf(p.value) }));
  const path = xy.map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  // X ticks: first, last and (when room) the midpoint date.
  const crossesYear = new Date(t0).getFullYear() !== new Date(t1).getFullYear();
  const spanDays = (t1 - t0) / 86_400_000;
  const xTickTimes = t1 === t0 ? [t0] : width >= 300 && spanDays > 14 ? [t0, (t0 + t1) / 2, t1] : [t0, t1];
  const xTickLabel = (ts: number) => shortDate(ts, crossesYear && spanDays > 120);
  const xTickPos = (ts: number) => (t1 === t0 ? x0 + plotW / 2 : x0 + ((ts - t0) / (t1 - t0)) * plotW);

  const caption = axisCaption(kind, lowerIsBetter, weightUnit, distanceUnit);
  const summary = `${itemName} ${pool.label}: ${points.length} results from ${longDate(t0)} to ${longDate(t1)}, best ${fmt(bestValue)}${
    goal !== undefined ? `, goal ${fmt(goal)}` : ''
  }.`;

  const nearestIndex = (clientX: number, target: Element): number => {
    const x = clientX - target.getBoundingClientRect().left;
    let best = 0;
    xy.forEach((c, i) => {
      if (Math.abs(c.x - x) < Math.abs(xy[best].x - x)) best = i;
    });
    return best;
  };

  const onPointer = (e: PointerEvent<SVGSVGElement>) => setActive(nearestIndex(e.clientX, e.currentTarget));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = points.length - 1;
    const cur = active ?? last;
    let next: number | null = cur;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(0, cur - 1);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(last, cur + 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else if (e.key === 'Escape') next = null;
    else return;
    e.preventDefault();
    setActive(next);
  };

  const selectPool = (key: string) => {
    setSelectedKey(key);
    setActive(null);
  };

  const activePoint = active !== null && active < points.length ? points[active] : null;
  const activeXY = active !== null && active < xy.length ? xy[active] : null;
  // Tooltip: centered over the point, clamped inside the chart.
  const TIP_W = 116;
  const tipLeft = activeXY ? Math.min(Math.max(activeXY.x - TIP_W / 2, 0), Math.max(width - TIP_W, 0)) : 0;
  const tipAbove = activeXY ? activeXY.y > 52 : true;

  return (
    <section className="card" aria-label={`${itemName} trend`}>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="t-section">Trend</h2>
        <span className="t-caption num flex items-center gap-1.5">
          <svg width="8" height="8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill="var(--color-primary)" /></svg>
          PR
          <span className="text-[var(--color-text-dim)]">·</span>
          {points.length} results
        </span>
      </div>

      {eligible.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Choose what to chart">
          {eligible.map((p) => {
            const on = p.key === pool.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => selectPool(p.key)}
                aria-pressed={on}
                className={`px-2.5 min-h-[32px] rounded-sm text-[13px] font-semibold num border transition-colors ${
                  on
                    ? 'chip-selected'
                    : 'bg-[var(--color-bg)] border-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      <p id={summaryId} className="sr-only">{summary}</p>

      <div
        ref={wrapRef}
        className="relative w-full select-none outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        style={{ height: HEIGHT }}
        tabIndex={0}
        role="group"
        aria-roledescription="chart"
        aria-label={`${itemName} ${pool.label} trend. Use arrow keys to step through results.`}
        aria-describedby={summaryId}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((a) => a ?? points.length - 1)}
        onBlur={() => setActive(null)}
      >
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            className="block touch-pan-y"
            aria-hidden="true"
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(null); }}
          >
            {/* Y grid + ticks */}
            {domain.ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={width - M.right} y1={yOf(t)} y2={yOf(t)} stroke="var(--color-border-strong)" strokeWidth={1} />
                <text x={M.left - 6} y={yOf(t)} dy="0.32em" textAnchor="end" className="num" fontSize={11} fill="var(--color-text-dim)">
                  {formatTick(t, kind)}
                </text>
              </g>
            ))}
            {caption && (
              <text x={M.left} y={11} fontSize={10.5} fontWeight={600} fill="var(--color-text-dim)">{caption}</text>
            )}

            {/* X ticks */}
            {xTickTimes.map((ts, i) => (
              <text
                key={ts}
                x={xTickPos(ts)}
                y={HEIGHT - 6}
                fontSize={11}
                className="num"
                fill="var(--color-text-dim)"
                textAnchor={xTickTimes.length === 1 ? 'middle' : i === 0 ? 'start' : i === xTickTimes.length - 1 ? 'end' : 'middle'}
              >
                {xTickLabel(ts)}
              </text>
            ))}

            {/* Goal */}
            {goal !== undefined && (
              <g>
                <line x1={M.left} x2={width - M.right} y1={yOf(goal)} y2={yOf(goal)} stroke="var(--color-text-muted)" strokeWidth={1.25} strokeDasharray="4 4" />
                <text x={width - M.right} y={yOf(goal) - 5} textAnchor="end" fontSize={10.5} fontWeight={600} fill="var(--color-text-muted)">
                  Goal {fmt(goal)}
                </text>
              </g>
            )}

            {/* Crosshair */}
            {activeXY && (
              <line x1={activeXY.x} x2={activeXY.x} y1={M.top} y2={HEIGHT - M.bottom} stroke="var(--color-text-dim)" strokeWidth={1} />
            )}

            {/* Line */}
            <path
              key={pool.key}
              d={path}
              pathLength={1}
              className="trend-draw"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeOpacity={0.7}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Points */}
            {xy.map((c, i) => {
              const on = i === active;
              return (
                <circle
                  key={points[i].id}
                  cx={c.x}
                  cy={c.y}
                  r={on ? 6 : isPR[i] ? 4.5 : 4}
                  fill={isPR[i] ? 'var(--color-primary)' : 'var(--color-text-muted)'}
                  stroke={on ? 'var(--color-text)' : 'var(--color-surface)'}
                  strokeWidth={2}
                />
              );
            })}
          </svg>
        )}

        {activePoint && activeXY && (
          <div
            className="pointer-events-none absolute z-10 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-2 py-1 shadow-lg"
            style={{
              left: tipLeft,
              width: TIP_W,
              top: tipAbove ? activeXY.y - 48 : activeXY.y + 12,
            }}
          >
            <p className="text-[11px] text-[var(--color-text-muted)] num leading-tight">{longDate(activePoint.date)}</p>
            <p className="text-[14px] font-semibold text-[var(--color-text)] num leading-tight flex items-center gap-1.5">
              {fmt(activePoint.value)}
              {isPR[active!] && <span className="text-[10px] font-extrabold text-[var(--color-primary-text)]">PR</span>}
            </p>
          </div>
        )}
      </div>

      {/* Announce the focused point to screen readers. */}
      <p className="sr-only" aria-live="polite">
        {activePoint ? `${longDate(activePoint.date)}: ${fmt(activePoint.value)}${isPR[active!] ? ', PR' : ''}` : ''}
      </p>
    </section>
  );
}
