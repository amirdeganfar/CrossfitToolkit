import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Loader2, Timer } from 'lucide-react';
import { useCatalogStore } from '../stores/catalogStore';
import { useGoalsStore, useSortedActiveGoals } from '../stores/goalsStore';
import { useCheckInStore } from '../stores/checkInStore';
import { useInitialize } from '../hooks/useInitialize';
import { GoalProgress } from '../components/goals';
import { QuickCheckIn, RecoveryAlert } from '../components/recovery';
import * as db from '../db';

interface RecentLogWithItem {
  id: string;
  itemId: string;
  itemName: string;
  result: string;
  variant: string | null;
  date: string;
}


export const Home = () => {
  const navigate = useNavigate();
  const { isInitialized, isLoading } = useInitialize();

  // Store state
  const catalogItems = useCatalogStore((state) => state.catalogItems);
  const favorites = useCatalogStore((state) => state.favorites);
  const recentLogs = useCatalogStore((state) => state.recentLogs);
  const settings = useCatalogStore((state) => state.settings);

  // Goals store - use selectors to avoid infinite loops
  const goalsIsInitialized = useGoalsStore((s) => s.isInitialized);
  const goalsInitialize = useGoalsStore((s) => s.initialize);
  const activeGoals = useSortedActiveGoals();

  // Check-in store
  const checkInIsInitialized = useCheckInStore((s) => s.isInitialized);
  const checkInInitialize = useCheckInStore((s) => s.initialize);
  const recoveryScore = useCheckInStore((s) => s.recoveryScore);

  // Local state
  const [recentLogsWithItems, setRecentLogsWithItems] = useState<RecentLogWithItem[]>([]);

  // Initialize goals store when catalog is ready
  useEffect(() => {
    if (isInitialized && !goalsIsInitialized && catalogItems.length > 0) {
      goalsInitialize(catalogItems, settings.weightUnit);
    }
  }, [isInitialized, goalsIsInitialized, catalogItems, settings.weightUnit, goalsInitialize]);

  // Initialize check-in store
  useEffect(() => {
    if (isInitialized && !checkInIsInitialized) {
      checkInInitialize();
    }
  }, [isInitialized, checkInIsInitialized, checkInInitialize]);

  // Fetch item names for recent logs
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
            result: log.result,
            variant: log.variant,
            date: new Date(log.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
          };
        })
      );

      if (!cancelled) setRecentLogsWithItems(logsWithItems);
    };

    void fetchItemNames();

    return () => {
      cancelled = true;
    };
  }, [recentLogs]);

  const handleItemClick = (itemId: string) => {
    navigate(`/item/${itemId}`);
  };

  const handleLogPR = () => {
    navigate('/search');
  };

  const handleTimer = () => {
    navigate('/clock');
  };

  const handleGoals = () => {
    navigate('/goals');
  };

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const heroDate = `${weekdays[now.getDay()]} · ${months[now.getMonth()]} ${now.getDate()}`;

  // Determine status from recovery score
  const isRestRecommended = recoveryScore && (recoveryScore.level === 'warning' || recoveryScore.level === 'critical');
  const statusLabel = isRestRecommended ? 'CAUTION · REST RECOMMENDED' : 'OPERATIONAL';

  return (
    <div className="space-y-6">
      {/* Status strip */}
      <div className="flex items-center gap-3 py-2 border-b border-[var(--color-border)] -mx-4 px-4">
        <div className={`w-1.5 h-4 ${isRestRecommended ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-primary)]'}`} />
        <span className={`font-display text-xs tracking-[0.2em] ${isRestRecommended ? 'text-[var(--color-warning)]' : 'text-[var(--color-text)]'}`}>
          {statusLabel}
        </span>
        <span className="ml-auto font-display text-xs tracking-widest text-[var(--color-text-muted)]">
          {heroDate}
        </span>
      </div>

      {/* Quick action row */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleLogPR}
          className="flex items-center justify-center gap-2 py-5 bg-[var(--color-primary)] text-[#0B130B] font-display tracking-[0.15em] text-sm rounded-sm active:scale-[0.98] transition-all"
          aria-label="Log a new PR"
        >
          <Plus className="w-5 h-5" /> LOG PR
        </button>
        <button
          onClick={handleTimer}
          className="flex items-center justify-center gap-2 py-5 border border-[var(--color-border-strong)] text-[var(--color-text)] font-display tracking-[0.15em] text-sm rounded-sm hover:bg-[var(--color-surface-elevated)] active:scale-[0.98] transition-all"
          aria-label="Open timer"
        >
          <Timer className="w-5 h-5" /> TIMER
        </button>
      </div>

      {/* Quick Check-in Widget */}
      <QuickCheckIn />

      {/* Recovery Alert */}
      <RecoveryAlert />

      {/* Favorites section */}
      {favorites.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[var(--color-border)]">
            <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">FAVORITES</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {favorites.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 border border-[var(--color-border-strong)] rounded-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                aria-label={`View ${item.name}`}
              >
                <span className="font-display text-xs tracking-[0.1em] text-[var(--color-text)] whitespace-nowrap">{item.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Active Goals Preview */}
      {activeGoals.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[var(--color-border)]">
            <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">ACTIVE MISSIONS</span>
            <button
              onClick={handleGoals}
              className="ml-auto flex items-center gap-1 font-display text-xs tracking-wider text-[var(--color-primary)]"
            >
              ALL <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {activeGoals.slice(0, 2).map((goal) => (
              <button
                key={goal.id}
                onClick={() => handleItemClick(goal.itemId)}
                className="w-full text-left border-l-2 border-[var(--color-primary)] pl-3 py-1 hover:bg-[var(--color-surface)] transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-display text-sm text-[var(--color-text)]">{goal.itemName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xl text-[var(--color-primary)]">{Math.round(goal.progress)}%</span>
                    <span className="font-display text-xs text-[var(--color-text-muted)]">
                      {goal.daysRemaining >= 0 ? `${goal.daysRemaining}D` : 'OVERDUE'}
                    </span>
                  </div>
                </div>
                <GoalProgress progress={goal.progress} size="sm" showLabel={false} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recent logs — data table */}
      <section>
        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[var(--color-border)]">
          <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">RECENT LOGS</span>
        </div>
        {recentLogsWithItems.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {recentLogsWithItems.slice(0, 5).map((log) => (
              <button
                key={log.id}
                onClick={() => handleItemClick(log.itemId)}
                className="w-full flex items-center justify-between py-2.5 hover:bg-[var(--color-surface)] transition-colors"
                aria-label={`View ${log.itemName}`}
              >
                <span className="font-display text-sm text-[var(--color-text)] tracking-wide truncate max-w-[45%] text-left">{log.itemName}</span>
                <span className="font-display text-sm text-[var(--color-primary)]">{log.result}</span>
                <span className="font-display text-xs text-[var(--color-text-muted)] tracking-wide">{log.date}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="font-display text-sm text-[var(--color-text-muted)] py-4 tracking-wider">
            NO LOGS YET — START TRACKING
          </p>
        )}
      </section>
    </div>
  );
};
