/**
 * WeekStreak — BLACKOUT. The gym-whiteboard week strip.
 * Seven day-dots (Mon–Sun of the current week): a completed training day glows
 * in a plate color, a rest day is a muted dot, today is ringed yellow, future
 * days are faint outlines. Right side shows the consecutive-day streak.
 *
 * Reads real data: last 14 days of check-ins from Dexie + the store's
 * consecutiveDays. No new data model.
 */

import { useEffect, useState } from 'react';
import { getRecentCheckIns, getTodayDate } from '../services/checkInService';
import { useCheckInStore } from '../stores/checkInStore';
import type { DailyCheckIn } from '../types/training';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const PLATE = ['#FF3B30', '#0A84FF', '#34C759', '#FFD60A', '#FF9F0A', '#BF5AF2', '#34C759'];

function isoOf(d: Date) {
  return d.toISOString().split('T')[0];
}

/** Monday-based dates for the current week (UTC, to match getTodayDate()). */
function weekDates(): string[] {
  const now = new Date();
  const dow = (now.getUTCDay() + 6) % 7; // 0 = Monday, in UTC
  const monday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    return isoOf(d);
  });
}

export const WeekStreak = () => {
  const consecutiveDays = useCheckInStore((s) => s.consecutiveDays);
  const selectedCheckIn = useCheckInStore((s) => s.selectedCheckIn); // re-render on save
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
  }, [selectedCheckIn]);

  const today = getTodayDate();
  const dates = weekDates();

  return (
    <div className="flex items-center justify-between">
      {dates.map((date, i) => {
        const c = byDate[date];
        const isToday = date === today;
        const isFuture = date > today;
        const trained = c?.type === 'training';
        const rested = c?.type === 'rest';

        let dot: React.CSSProperties;
        if (trained) {
          const color = PLATE[i % PLATE.length];
          dot = { background: color, boxShadow: `0 0 8px ${color}66` };
        } else if (rested) {
          dot = { background: 'var(--color-text-dim)' };
        } else if (isToday) {
          dot = { background: 'transparent', border: '2px solid var(--color-primary)', boxShadow: '0 0 10px rgba(232,50,28,0.4)' };
        } else if (isFuture) {
          dot = { background: 'transparent', border: '1.5px solid rgba(255,255,255,0.12)' };
        } else {
          dot = { background: 'transparent', border: '1.5px solid rgba(255,255,255,0.12)' };
        }

        return (
          <div key={date} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-semibold" style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
              {DOW[i]}
            </span>
            <div className="w-[26px] h-[26px] rounded-full transition-all" style={dot} />
          </div>
        );
      })}

      <div className="w-px h-[34px]" style={{ background: 'var(--color-border-strong)' }} />

      <div className="text-center">
        <div className="font-display-black text-[22px] leading-none text-[var(--color-text)]">{consecutiveDays}</div>
        <div className="text-[9px] tracking-[0.06em] leading-tight mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          DAY<br />STREAK
        </div>
      </div>
    </div>
  );
};
