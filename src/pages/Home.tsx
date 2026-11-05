import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Timer, Dumbbell, Activity, Repeat, ClipboardList } from 'lucide-react';
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
import { Barbell } from '../components/Barbell';
import { PlateBadge } from '../components/PlateBadge';
import { categoryColorVar } from '../utils/categoryColors';
import { getLogScoreType } from '../config/scoreTypes';
import { formatWeight } from '../utils/units';
import * as db from '../db';
import type { Category, Variant } from '../types/catalog';

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
}

export const Home = () => {
  const navigate = useNavigate();
  const { isInitialized, isLoading } = useInitialize();

  const catalogItems = useCatalogStore((state) => state.catalogItems);
  const favorites = useCatalogStore((state) => state.favorites);
  const recentLogs = useCatalogStore((state) => state.recentLogs);
  const weightUnit = useCatalogStore((state) => state.settings.weightUnit);

  const goalsIsInitialized = useGoalsStore((s) => s.isInitialized);
  const goalsInitialize = useGoalsStore((s) => s.initialize);
  const activeGoals = useSortedActiveGoals();

  const checkInIsInitialized = useCheckInStore((s) => s.isInitialized);
  const checkInInitialize = useCheckInStore((s) => s.initialize);
  const recoveryScore = useCheckInStore((s) => s.recoveryScore);
  const todayCheckIn = useCheckInStore((s) => s.todayCheckIn);

  const [recentLogsWithItems, setRecentLogsWithItems] = useState<RecentLogWithItem[]>([]);
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
        if (!cancelled) setRecentLogsWithItems([]);
        return;
      }
      const logsWithItems = await Promise.all(
        recentLogs.map(async (log) => {
          const item = await db.getCatalogItemById(log.catalogItemId);
          return {
            id: log.id,
            itemId: log.catalogItemId,
            itemName: item?.name ?? 'Unknown',
            category: item?.category ?? 'Custom',
            // Load results are shown in the current unit (converted from the log's unit).
            result: item && getLogScoreType(log, item) === 'Load'
              ? `${log.result.includes('@ ') ? log.result.slice(0, log.result.lastIndexOf('@ ') + 2) : ''}${formatWeight(log.resultValue, log.unit, weightUnit)}`
              : log.result,
            variant: log.variant,
            date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          } as RecentLogWithItem;
        })
      );
      if (!cancelled) setRecentLogsWithItems(logsWithItems);
    };
    void fetchItemNames();
    return () => { cancelled = true; };
  }, [recentLogs, weightUnit]);

  const handleItemClick = (itemId: string) => navigate(`/item/${itemId}`);
  const handleLogResult = () => navigate('/search');
  const handleGoals = () => navigate('/progress');

  if (!isInitialized || isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-[54px] w-full rounded-full" />
        <Skeleton className="h-16 w-full" />
        <section className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <SkeletonRows count={3} label="Loading recent results" />
        </section>
      </div>
    );
  }

  const now = new Date();
  const heroDate = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Readiness chip: invite a check-in when today has none, otherwise reflect recovery state.
  const hasCheckIn = !!todayCheckIn;
  const isRestRecommended = recoveryScore && (recoveryScore.level === 'warning' || recoveryScore.level === 'critical');
  const chipLabel = !hasCheckIn ? 'Check in' : isRestRecommended ? 'Rest recommended' : 'Primed';
  const chipStyle = !hasCheckIn
    ? { background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border-strong)' }
    : isRestRecommended
      ? { background: 'rgba(255,159,10,0.14)', color: 'var(--color-warning)' }
      : { background: 'rgba(52,199,89,0.14)', color: 'var(--color-success)' };

  return (
    <div className="space-y-6">
      {/* Header — date, headline, tappable readiness chip */}
      <div className="flex items-start justify-between">
        <div>
          <div className="t-caption">{heroDate}</div>
          <h1 className="t-title mt-1">Ready to train.</h1>
        </div>
        <button
          onClick={() => setShowCheckIn(true)}
          className="flex items-center gap-1.5 rounded-full px-3.5 min-h-[44px] text-[12px] font-semibold self-center whitespace-nowrap transition-transform active:scale-95"
          style={chipStyle}
          aria-label={hasCheckIn ? `Readiness: ${chipLabel}. Edit check-in` : 'Daily check-in'}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
          {chipLabel}
          <ChevronRight className="w-3.5 h-3.5 -mr-1 opacity-70" />
        </button>
      </div>

      {/* Hero — the single primary action on Home */}
      <LoadedBarButton onClick={handleLogResult}>
        <Plus className="w-5 h-5" /> Log a result
      </LoadedBarButton>

      {/* Week streak strip */}
      <WeekStreak />

      {/* Recovery alert — self-hides unless a warning is active */}
      <RecoveryAlert />

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="t-section">Active goals</h2>
            <button onClick={handleGoals} className="flex items-center gap-1 min-h-[44px] -my-2 px-1 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              All goals <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {activeGoals.slice(0, 2).map((goal) => (
              <button
                key={goal.id}
                onClick={() => handleItemClick(goal.itemId)}
                className="card w-full text-left"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="font-display text-[16px] text-[var(--color-text)] truncate">{goal.itemName}</span>
                  <div className="flex items-baseline gap-2 shrink-0">
                    <Stat value={Math.round(goal.progress)} unit="%" size="md" />
                    <span className="t-caption num">
                      {goal.daysRemaining >= 0 ? `${goal.daysRemaining}d left` : 'Overdue'}
                    </span>
                  </div>
                </div>
                <Barbell current={goal.progress} goal={100} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recent */}
      <section>
        <h2 className="t-section mb-3">Recent results</h2>
        {recentLogsWithItems.length > 0 ? (
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
          <QuickCheckIn hideDatePicker onSaved={() => setShowCheckIn(false)} />
        </BottomSheet>
      )}
    </div>
  );
};
