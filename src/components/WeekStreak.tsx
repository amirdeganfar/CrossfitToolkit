/**
 * WeekStreak — BLACKOUT. The gym-whiteboard week strip.
 * Seven day-dots (Mon–Sun of the current week): a completed training day glows
 * in a plate color, a rest day is a muted dot, today is ringed in its color, future
 * days are faint outlines. Right side shows the consecutive-day streak.
 *
 * Reads real data: last 14 days of check-ins from Dexie + the store's
 * consecutiveDays. No new data model.
 */

import { useEffect, useState } from 'react';
import { getRecentCheckIns } from '../services/checkInService';
import { useCheckInStore } from '../stores/checkInStore';
import { parseLocalDate, addDaysLocal } from '../utils/date';
import type { DailyCheckIn } from '../types/training';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
// One distinct color per weekday so the strip reads colorful even before
// training. --day-N tokens in index.css (deepened in light theme for contrast).
const DAY_COLORS = Array.from({ length: 7 }, (_, i) => `var(--day-${i + 1})`);

/** `color` at `pct` opacity, e.g. '40%' or a CSS var (works with CSS variables). */
const tint = (color: string, pct: string) => `color-mix(in srgb, ${color} ${pct}, transparent)`;

/** Monday-based local dates (YYYY-MM-DD) for the week containing `today`. */
function weekDates(today: string): string[] {
  const dow = (parseLocalDate(today).getDay() + 6) % 7; // 0 = Monday
  const monday = addDaysLocal(today, -dow);
  return Array.from({ length: 7 }, (_, i) => addDaysLocal(monday, i));
}

export const WeekStreak = () => {
  const consecutiveDays = useCheckInStore((s) => s.consecutiveDays);
  const selectedCheckIn = useCheckInStore((s) => s.selectedCheckIn); // re-render on save
  // Store-owned local "today" — refreshed past midnight / on tab focus.
  const today = useCheckInStore((s) => s.today);
  const [byDate, setByDate] = useState<Record<string, DailyCheckIn>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const recent = await getRecentCheckIns(14);
      if (cancelled) return;
      const map: Record<string, DailyCheckIn> = {};
      for (const c of recent) map[c.date] = c;
      setByDate(map);
    })();
    return () => { cancelled = true; };
  }, [selectedCheckIn, today]);

  const dates = weekDates(today);

  return (
    <div className="flex items-center justify-between">
      {dates.map((date, i) => {
        const c = byDate[date];
        const isToday = date === today;
        const isFuture = date > today;
        const trained = c?.type === 'training';
        const rested = c?.type === 'rest';

        const color = DAY_COLORS[i];

        let dot: React.CSSProperties;
        if (trained) {
          dot = { background: color, boxShadow: `0 0 8px ${tint(color, '40%')}` };
        } else if (rested) {
          dot = { background: 'var(--color-text-dim)' };
        } else if (isToday) {
          dot = { background: 'transparent', border: `2px solid ${color}`, boxShadow: `0 0 10px ${tint(color, '40%')}` };
        } else if (isFuture) {
          dot = { background: 'transparent', border: `1.5px solid ${tint(color, 'var(--day-ring-future)')}` };
        } else {
          dot = { background: 'transparent', border: `1.5px solid ${tint(color, 'var(--day-ring-past)')}` };
        }

        return (
          <div key={date} className="flex flex-col items-center gap-1.5">
            <span
              className="text-[10px] font-semibold"
              style={{ color, opacity: isToday ? 1 : isFuture ? 'var(--day-label-future)' : 'var(--day-label-past)' }}
            >
              {DOW[i]}
            </span>
            <div className="w-[26px] h-[26px] rounded-full transition-all" style={dot} />
          </div>
        );
      })}

      <div className="w-px h-[34px]" style={{ background: 'var(--color-border-strong)' }} />

      <div className="text-center">
        <div className="font-display-black text-[22px] leading-none text-[var(--color-text)] num">{consecutiveDays}</div>
        <div className="text-[11px] font-medium leading-tight mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          day<br />streak
        </div>
      </div>
    </div>
  );
};
