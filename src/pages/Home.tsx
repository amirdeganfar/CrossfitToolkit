import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Loader2, Timer, Dumbbell, Activity, Repeat } from 'lucide-react';
import { useCatalogStore } from '../stores/catalogStore';
import { useGoalsStore, useSortedActiveGoals } from '../stores/goalsStore';
import { useCheckInStore } from '../stores/checkInStore';
import { useInitialize } from '../hooks/useInitialize';
import { QuickCheckIn, RecoveryAlert } from '../components/recovery';
import { WeekStreak } from '../components/WeekStreak';
import { LoadedBarButton } from '../components/LoadedBarButton';
import { Barbell } from '../components/Barbell';
import { PlateBadge } from '../components/PlateBadge';
import { categoryColorVar } from '../utils/categoryColors';
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
  const settings = useCatalogStore((state) => state.settings);

  const goalsIsInitialized = useGoalsStore((s) => s.isInitialized);
  const goalsInitialize = useGoalsStore((s) => s.initialize);
  const activeGoals = useSortedActiveGoals();

  const checkInIsInitialized = useCheckInStore((s) => s.isInitialized);
  const checkInInitialize = useCheckInStore((s) => s.initialize);
  const recoveryScore = useCheckInStore((s) => s.recoveryScore);

  const [recentLogsWithItems, setRecentLogsWithItems] = useState<RecentLogWithItem[]>([]);

  useEffect(() => {
    if (isInitialized && !goalsIsInitialized && catalogItems.length > 0) {
      goalsInitialize(catalogItems, settings.weightUnit);
    }
  }, [isInitialized, goalsIsInitialized, catalogItems, settings.weightUnit, goalsInitialize]);

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
            result: log.result,
            variant: log.variant,
            date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          } as RecentLogWithItem;
        })
      );
      if (!cancelled) setRecentLogsWithItems(logsWithItems);
    };
    void fetchItemNames();
    return () => { cancelled = true; };
  }, [recentLogs]);

  const handleItemClick = (itemId: string) => navigate(`/item/${itemId}`);
  const handleLogPR = () => navigate('/search');
  const handleTimer = () => navigate('/clock');
  const handleGoals = () => navigate('/goals');

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const heroDate = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const isRestRecommended = recoveryScore && (recoveryScore.level === 'warning' || recoveryScore.level === 'critical');
  const statusLabel = isRestRecommended ? 'Rest recommended' : 'Primed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="label-eyebrow">{heroDate}</div>
          <h1 className="font-display-black text-[30px] text-[var(--color-text)] mt-1 leading-[1.05]">Ready to train.</h1>
        </div>
        <span
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold self-center whitespace-nowrap"
          style={
            isRestRecommended
              ? { background: 'rgba(255,159,10,0.14)', color: 'var(--color-warning)' }
              : { background: 'rgba(52,199,89,0.14)', color: 'var(--color-success)' }
          }
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
          {statusLabel}
        </span>
      </div>

      {/* Week streak strip */}
      <WeekStreak />

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <LoadedBarButton variant="compact" onClick={handleLogPR}>
          <Plus className="w-5 h-5" /> Log a PR
        </LoadedBarButton>
        <button
          onClick={handleTimer}
          className="flex items-center justify-center gap-2 h-[54px] rounded-[14px] border border-[var(--color-border-strong)] text-[var(--color-text)] font-semibold text-[15px] hover:bg-[var(--color-surface-elevated)] active:scale-[0.98] transition-all"
          aria-label="Open timer"
        >
          <Timer className="w-5 h-5" /> Timer
        </button>
      </div>

      {/* Check-in */}
      <QuickCheckIn />
      <RecoveryAlert />

      {/* Favorites */}
      {favorites.length > 0 && (
        <section>
          <div className="label-eyebrow mb-3">Favorites</div>
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

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <span className="label-eyebrow">Active goals</span>
            <button onClick={handleGoals} className="flex items-center gap-1 text-[13px] font-semibold text-[var(--color-primary)]">
              All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2.5">
            {activeGoals.slice(0, 2).map((goal) => (
              <button
                key={goal.id}
                onClick={() => handleItemClick(goal.itemId)}
                className="w-full text-left rounded-2xl p-4 transition-transform active:scale-[0.98]"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-[16px] text-[var(--color-text)]">{goal.itemName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-display-black text-lg text-[var(--color-primary)]">{Math.round(goal.progress)}%</span>
                    <span className="text-xs text-[var(--color-text-muted)]">
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
        <div className="label-eyebrow mb-3">Recent</div>
        {recentLogsWithItems.length > 0 ? (
          <div>
            {recentLogsWithItems.slice(0, 5).map((log) => {
              const Icon = GLYPH[log.category] ?? Dumbbell;
              return (
                <button
                  key={log.id}
                  onClick={() => handleItemClick(log.itemId)}
                  className="flex items-center gap-[14px] w-full rounded-2xl mb-[10px] px-[14px] py-[13px] text-left transition-transform active:scale-[0.98]"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  aria-label={`View ${log.itemName}`}
                >
                  <PlateBadge category={log.category} size={40}>
                    <Icon size={16} />
                  </PlateBadge>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base text-[var(--color-text)] truncate">{log.itemName}</div>
                    <div className="text-xs mt-0.5" style={{ color: categoryColorVar(log.category) }}>{log.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-[17px] tabular-nums text-[var(--color-primary)]">{log.result}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">{log.date}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] py-4">No logs yet — start tracking</p>
        )}
      </section>
    </div>
  );
};
