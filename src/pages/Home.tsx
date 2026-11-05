import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Plus, Timer, Dumbbell, Activity, Repeat, ClipboardList } from 'lucide-react';
import { Stat } from '../components/Stat';
import { EmptyState } from '../components/EmptyState';
import { Skeleton, SkeletonRows } from '../components/Skeleton';
import { useCatalogStore } from '../stores/catalogStore';
import { useGoalsStore, useSortedActiveGoals } from '../stores/goalsStore';
import { useCheckInStore } from '../stores/checkInStore';
import { useInitialize } from '../hooks/useInitialize';
import { QuickCheckIn, RecoveryAlert } from '../components/recovery';
import { WeekStreak } from '../components/WeekStreak';
import { LoadedBarButton } from '../components/LoadedBarButton';
import { BottomSheet } from '../components/BottomSheet';
import { PlateBadge } from '../components/PlateBadge';
import { categoryColorVar } from '../utils/categoryColors';
import { getLogScoreType } from '../config/scoreTypes';
import type { AlertLevel } from '../config/recoveryScoring.config';
import { formatWeight, formatDistance } from '../utils/units';
import { toLocalDateString } from '../utils/date';
import * as db from '../db';
import type { Category, Variant } from '../types/catalog';
import type { DailyCheckIn } from '../types/training';

const GLYPH: Record<Category, typeof Dumbbell> = {
  Lift: Dumbbell,
  Benchmark: Timer,
  Monostructural: Activity,
  Skill: Repeat,
  Custom: Dumbbell,
};

interface RecentLogWithItem {
  id: string;
  itemId: string;
  itemName: string;
  category: Category;
  result: string;
  variant: Variant;
  date: string;
  isToday: boolean;
}

const tint = (color: string) => `color-mix(in srgb, ${color} 14%, transparent)`;

/** Headline + chip per recovery level (higher level = more fatigue). Red only when critical. */
const READINESS: Record<AlertLevel, { headline: string; chip: string; color: string }> = {
  none: { headline: 'Ready to train.', chip: 'Primed', color: 'var(--color-success)' },
  info: { headline: 'Train smart today.', chip: 'Fair', color: 'var(--color-info)' },
  warning: { headline: 'Go easy today.', chip: 'Low', color: 'var(--color-warning)' },
  critical: { headline: 'Rest day recommended.', chip: 'Depleted', color: 'var(--color-danger)' },
};

/** Not checked in: neutral headline, chip invites a check-in. Checked in: reflects the recovery level. */
const getReadiness = (checkIn: DailyCheckIn | null, level: AlertLevel) => {
  if (!checkIn) {
    return {
      headline: 'Ready to train.',
      chip: 'Check in',
      chipStyle: { background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border-strong)' },
    };
  }
  if (checkIn.type === 'rest') {
    return {
      headline: 'Rest day.',
      chip: 'Resting',
      chipStyle: { background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' },
    };
  }
  const r = READINESS[level];
  return { headline: r.headline, chip: r.chip, chipStyle: { background: tint(r.color), color: r.color } };
};

export const Home = () => {
  const navigate = useNavigate();
  const { isInitialized, isLoading } = useInitialize();

  const catalogItems = useCatalogStore((state) => state.catalogItems);
  const favorites = useCatalogStore((state) => state.favorites);
  const recentLogs = useCatalogStore((state) => state.recentLogs);
  const weightUnit = useCatalogStore((state) => state.settings.weightUnit);
  const distanceUnit = useCatalogStore((state) => state.settings.distanceUnit);

  const goalsIsInitialized = useGoalsStore((s) => s.isInitialized);
  const goalsInitialize = useGoalsStore((s) => s.initialize);
  const activeGoals = useSortedActiveGoals();

  const checkInIsInitialized = useCheckInStore((s) => s.isInitialized);
  const checkInInitialize = useCheckInStore((s) => s.initialize);
  const recoveryScore = useCheckInStore((s) => s.recoveryScore);
  const todayCheckIn = useCheckInStore((s) => s.todayCheckIn);
  const today = useCheckInStore((s) => s.today);

  const [recentLogsWithItems, setRecentLogsWithItems] = useState<RecentLogWithItem[]>([]);
  // False until recent logs first resolve, so the empty state doesn't flash.
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);

  useEffect(() => {
    if (isInitialized && !goalsIsInitialized && catalogItems.length > 0) {
      goalsInitialize(catalogItems);
    }
  }, [isInitialized, goalsIsInitialized, catalogItems, goalsInitialize]);

  useEffect(() => {
    if (isInitialized && !checkInIsInitialized) {
      checkInInitialize();
    }
  }, [isInitialized, checkInIsInitialized, checkInInitialize]);

  useEffect(() => {
    let cancelled = false;
    const fetchItemNames = async () => {
      if (recentLogs.length === 0) {
        if (!cancelled) {
          setRecentLogsWithItems([]);
          setRecentLoaded(true);
        }
        return;
      }
      const logsWithItems = await Promise.all(
        recentLogs.map(async (log) => {
          const item = await db.getCatalogItemById(log.catalogItemId);
          const scoreType = item ? getLogScoreType(log, item) : undefined;
          return {
            id: log.id,
            itemId: log.catalogItemId,
            itemName: item?.name ?? 'Unknown',
            category: item?.category ?? 'Custom',
            // Load / Distance results are shown in the current unit (converted from the log's unit).
            result: scoreType === 'Load'
              ? `${log.result.includes('@ ') ? log.result.slice(0, log.result.lastIndexOf('@ ') + 2) : ''}${formatWeight(log.resultValue, log.unit, weightUnit)}`
              : scoreType === 'Distance'
                ? formatDistance(log.resultValue, log.distanceUnit, distanceUnit)
                : log.result,
            variant: log.variant,
            date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            isToday: toLocalDateString(new Date(log.date)) === today,
          } as RecentLogWithItem;
        })
      );
      if (!cancelled) {
        setRecentLogsWithItems(logsWithItems);
        setRecentLoaded(true);
      }
    };
    void fetchItemNames();
    return () => { cancelled = true; };
  }, [recentLogs, weightUnit, distanceUnit, today]);

  const handleItemClick = (itemId: string) => navigate(`/item/${itemId}`);
  const handleLogResult = () => navigate('/search');
  const handleGoals = () => navigate('/progress');

  // Wait for the check-in store too, so the headline / chip don't flip after first paint.
  if (!isInitialized || isLoading || !checkInIsInitialized) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between -mb-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-[44px] w-24 rounded-full" />
            </div>
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-[54px] w-full rounded-full" />
        </div>
        <Skeleton className="h-[48px] w-full" />
        <section className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <SkeletonRows count={3} label="Loading recent results" />
        </section>
      </div>
    );
  }

  const now = new Date();
  const heroDate = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const readiness = getReadiness(todayCheckIn, recoveryScore?.level ?? 'none');
  const todayLogs = recentLogsWithItems.filter((log) => log.isToday);
  const nextGoal = activeGoals[0];

  return (
    <div className="space-y-6">
      {/* Readiness + today's action — one group */}
      <div className="space-y-4">
        {/* Date + readiness chip on one row, so a two-line headline never pushes the chip around. */}
        <div>
          <div className="flex items-center justify-between gap-3 -mb-1">
            <div className="t-caption">{heroDate}</div>
            <button
              onClick={() => setShowCheckIn(true)}
              className="flex items-center gap-1.5 rounded-full px-3.5 min-h-[44px] text-[12px] font-semibold shrink-0 whitespace-nowrap transition-transform active:scale-95"
              style={readiness.chipStyle}
              aria-label={todayCheckIn ? `Readiness: ${readiness.chip}. Edit check-in` : 'Daily check-in'}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
              {readiness.chip}
              <ChevronRight className="w-3.5 h-3.5 -mr-1 opacity-70" />
            </button>
          </div>
          <h1 className="t-title">{readiness.headline}</h1>
        </div>

        {/* Hero — the single primary action on Home */}
        <div>
          <LoadedBarButton onClick={handleLogResult}>
            <Plus className="w-5 h-5" /> Log a result
          </LoadedBarButton>
          {todayLogs.length > 0 && (
            <button
              onClick={() => handleItemClick(todayLogs[0].itemId)}
              className="mt-1 flex w-full items-center justify-center gap-1.5 min-h-[44px] -mb-2 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              aria-label={`Today: ${todayLogs[0].itemName} ${todayLogs[0].result}. View`}
            >
              <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-success)' }} aria-hidden="true" />
              <span className="truncate">
                Today: <span className="font-semibold text-[var(--color-text)]">{todayLogs[0].itemName}</span>{' '}
                <span className="num">{todayLogs[0].result}</span>
              </span>
              {todayLogs.length > 1 && <span className="shrink-0 num">+{todayLogs.length - 1}</span>}
            </button>
          )}
        </div>
      </div>

      {/* Week streak strip */}
      <WeekStreak />

      {/* Next goal — the closest deadline */}
      {nextGoal && (
        <button
          onClick={handleGoals}
          className="card w-full text-left flex items-center gap-3"
          aria-label={`Next goal: ${nextGoal.itemName}, ${Math.round(nextGoal.progress)}%, ${nextGoal.daysRemaining >= 0 ? `${nextGoal.daysRemaining} days left` : 'overdue'}. View goals`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="t-caption">Next goal</div>
                <div className="font-display text-[16px] text-[var(--color-text)] truncate mt-0.5">{nextGoal.itemName}</div>
              </div>
              <div className="flex items-baseline gap-2 shrink-0">
                <Stat value={Math.round(nextGoal.progress)} unit="%" size="sm" />
                <span className="t-caption num" style={nextGoal.daysRemaining < 0 ? { color: 'var(--color-warning)' } : undefined}>
                  {nextGoal.daysRemaining >= 0 ? `${nextGoal.daysRemaining}d left` : 'Overdue'}
                </span>
              </div>
            </div>
            <div className="mt-2.5 h-[4px] rounded-full bg-[var(--color-border-strong)] overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full bg-[var(--color-text)]" style={{ width: `${Math.max(2, Math.min(100, nextGoal.progress))}%` }} />
            </div>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0 text-[var(--color-text-dim)]" aria-hidden="true" />
        </button>
      )}

      {/* Recent */}
      <section>
        <h2 className="t-section mb-3">Recent results</h2>
        {!recentLoaded ? (
          <SkeletonRows count={3} label="Loading recent results" />
        ) : recentLogsWithItems.length > 0 ? (
          <div className="space-y-2">
            {recentLogsWithItems.slice(0, 5).map((log) => {
              const Icon = GLYPH[log.category] ?? Dumbbell;
              return (
                <button
                  key={log.id}
                  onClick={() => handleItemClick(log.itemId)}
                  className="flex items-center gap-3 w-full rounded-lg px-4 py-3 text-left bg-[var(--color-surface)] border border-[var(--color-border)]"
                  aria-label={`View ${log.itemName}`}
                >
                  <PlateBadge category={log.category} size={40}>
                    <Icon size={16} />
                  </PlateBadge>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base text-[var(--color-text)] truncate">{log.itemName}</div>
                    <div className="text-xs mt-0.5" style={{ color: categoryColorVar(log.category) }}>{log.category}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <Stat text={log.result} size="sm" />
                    <div className="t-caption num mt-0.5">{log.date}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={ClipboardList} message="No results yet. Your latest logs will show up here." />
        )}
      </section>

      {/* Favorites — quick jumps, demoted below the record */}
      {favorites.length > 0 && (
        <section>
          <h2 className="t-section mb-3">Favorites</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {favorites.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium text-[var(--color-text)] whitespace-nowrap transition-transform active:scale-95"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                aria-label={`View ${item.name}`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Daily check-in — relocated into a bottom sheet off the readiness chip */}
      {showCheckIn && (
        <BottomSheet title="Daily check-in" onClose={() => setShowCheckIn(false)}>
          {/* Why today's readiness is what it is — kept off Home on purpose. */}
          <div className="mb-5 empty:hidden"><RecoveryAlert /></div>
          <QuickCheckIn hideDatePicker onSaved={() => setShowCheckIn(false)} />
        </BottomSheet>
      )}
    </div>
  );
};
