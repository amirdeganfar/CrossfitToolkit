import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, ChevronDown, Star, Clock, Plus, Loader2, Target } from 'lucide-react';
import { useCatalogStore } from '../stores/catalogStore';
import { useGoalsStore, useSortedActiveGoals } from '../stores/goalsStore';
import { useCheckInStore } from '../stores/checkInStore';
import { useInitialize } from '../hooks/useInitialize';
import { GoalProgress } from '../components/goals';
import { QuickCheckIn, RecoveryAlert } from '../components/recovery';
import type { CatalogItem } from '../types/catalog';
import * as db from '../db';

interface RecentLogWithItem {
  id: string;
  itemId: string;
  itemName: string;
  result: string;
  variant: string | null;
  date: string;
}

interface LogGroup {
  itemId: string;
  itemName: string;
  logs: RecentLogWithItem[];
}

// Group logs by itemId
const groupLogsByItem = (logs: RecentLogWithItem[]): LogGroup[] => {
  const groupMap = new Map<string, LogGroup>();
  
  logs.forEach(log => {
    const existing = groupMap.get(log.itemId);
    if (existing) {
      existing.logs.push(log);
    } else {
      groupMap.set(log.itemId, {
        itemId: log.itemId,
        itemName: log.itemName,
        logs: [log],
      });
    }
  });
  
  return Array.from(groupMap.values());
};

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
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [recentLogsWithItems, setRecentLogsWithItems] = useState<RecentLogWithItem[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  // Group recent logs by item
  const groupedLogs = useMemo(() => groupLogsByItem(recentLogsWithItems), [recentLogsWithItems]);

  // Toggle accordion group expansion
  const toggleGroup = (itemId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Filter items for autocomplete
  const filteredItems = useMemo(() => {
    if (!searchQuery) {
      return catalogItems.slice(0, 6); // Show first 6 when empty
    }
    const query = searchQuery.toLowerCase();
    return catalogItems
      .filter((item) => item.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [catalogItems, searchQuery]);

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
              year: 'numeric',
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

  const handleSearchFocus = () => {
    setShowAutocomplete(true);
  };

  const handleSearchBlur = () => {
    // Delay to allow click on autocomplete items
    setTimeout(() => setShowAutocomplete(false), 200);
  };

  const handleItemClick = (itemId: string) => {
    navigate(`/item/${itemId}`);
  };

  const handleSeeAllResults = () => {
    navigate('/search');
  };

  const handleLogPR = () => {
    navigate('/search');
  };

  const handleGoals = () => {
    navigate('/goals');
  };

  const getCategoryColor = (category: CatalogItem['category']) => {
    switch (category) {
      case 'Benchmark':
        return 'text-amber-400';
      case 'Lift':
        return 'text-blue-400';
      case 'Monostructural':
        return 'text-green-400';
      case 'Skill':
        return 'text-purple-400';
      case 'Custom':
        return 'text-pink-400';
      default:
        return 'text-[var(--color-text-muted)]';
    }
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

  return (
    <div className="space-y-6">
      {/* Hero strip */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[var(--color-text-muted)] text-xs font-display tracking-widest uppercase">{heroDate}</p>
          <h1 className="font-display text-3xl text-[var(--color-text)] leading-tight">READY TO<br/>LIFT?</h1>
        </div>
        <button
          onClick={handleLogPR}
          className="flex flex-col items-center justify-center w-16 h-16 rounded-sm bg-[var(--color-primary)] text-white active:scale-95 transition-all"
          aria-label="Log a new PR"
        >
          <Plus className="w-6 h-6" />
          <span className="font-display text-[9px] tracking-widest mt-0.5">LOG PR</span>
        </button>
      </div>

      {/* Quick Check-in Widget */}
      <QuickCheckIn />

      {/* Recovery Alert */}
      <RecoveryAlert />

      {/* Search bar with autocomplete */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search PR item or benchmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm pl-9 pr-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            aria-label="Search PR item or benchmark"
          />
        </div>

        {/* Autocomplete dropdown */}
        {showAutocomplete && filteredItems.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border-strong)] rounded-lg overflow-hidden z-10">
            <div className="max-h-64 overflow-y-auto">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`cat-bar cat-bar-${item.category} w-full flex items-center justify-between pl-5 pr-4 py-3 hover:bg-[var(--color-surface-elevated)] transition-colors text-left border-b border-[var(--color-border)] last:border-0`}
                  aria-label={`View ${item.name}`}
                >
                  <span className="font-medium text-[var(--color-text)]">{item.name}</span>
                  <span className={`text-xs ${getCategoryColor(item.category)}`}>{item.category}</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleSeeAllResults}
              className="w-full flex items-center justify-between px-4 py-3 border-t border-[var(--color-border-strong)] hover:bg-[var(--color-surface-elevated)] transition-colors text-[var(--color-primary)]"
              aria-label="See all search results"
            >
              <span className="font-display text-sm tracking-widest">SEE ALL</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Favorites section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-[var(--color-warning)] fill-current" />
          <h2 className="font-display text-sm tracking-widest text-[var(--color-text-muted)]">
            FAVORITES
          </h2>
        </div>
        {favorites.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {favorites.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`cat-bar cat-bar-${item.category} flex-shrink-0 pl-4 pr-4 py-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-left hover:border-[var(--color-border-strong)] active:scale-95 transition-all min-w-[120px]`}
                aria-label={`View ${item.name}`}
              >
                <div className="font-display text-sm text-[var(--color-text)] truncate max-w-[110px]">{item.name}</div>
                <div className={`text-[10px] mt-0.5 ${getCategoryColor(item.category)}`}>{item.category}</div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            No favorites yet. Tap ⭐ on any item to add it here.
          </p>
        )}
      </section>

      {/* Active Goals Preview */}
      {activeGoals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--color-primary)]" />
              <h2 className="font-display text-sm tracking-widest text-[var(--color-text-muted)]">ACTIVE GOALS</h2>
            </div>
            <button
              onClick={handleGoals}
              className="flex items-center gap-1 text-xs text-[var(--color-primary)] font-display tracking-wider"
            >
              ALL <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {activeGoals.slice(0, 2).map((goal) => (
              <button
                key={goal.id}
                onClick={() => handleItemClick(goal.itemId)}
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3.5 text-left hover:border-[var(--color-border-strong)] transition-colors"
                style={{ borderLeft: '3px solid var(--color-primary)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[var(--color-text)]">{goal.itemName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg text-[var(--color-primary)]">{Math.round(goal.progress)}%</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] tracking-wide">
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

      {/* Recent logs section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
          <h2 className="font-display text-sm tracking-widest text-[var(--color-text-muted)]">
            RECENT LOGS
          </h2>
        </div>
        {groupedLogs.length > 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
            {groupedLogs.map((group, groupIndex) => {
              const isExpanded = expandedGroups.has(group.itemId);
              const latestLog = group.logs[0];

              return (
                <div key={group.itemId} className={groupIndex !== groupedLogs.length - 1 ? 'border-b border-[var(--color-border)]' : ''}>
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleGroup(group.itemId)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--color-surface-elevated)] transition-colors"
                    aria-label={`Toggle ${group.itemName} logs`}
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown
                        className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                      <span className="font-medium text-[var(--color-text)]">{group.itemName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base text-[var(--color-primary)]">{latestLog.result}</span>
                      {latestLog.variant && (
                        <span className="px-2 py-0.5 text-[10px] font-display tracking-wider bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">
                          {latestLog.variant}
                        </span>
                      )}
                      <span className="w-5 h-5 flex items-center justify-center text-[10px] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] rounded-sm">
                        {group.logs.length}
                      </span>
                    </div>
                  </button>

                  {/* Accordion Content */}
                  <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
                    <div>
                      {group.logs.map((log, logIndex) => (
                        <button
                          key={log.id}
                          onClick={() => handleItemClick(log.itemId)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 pl-11 hover:bg-[var(--color-surface-elevated)] transition-colors text-left bg-[var(--color-bg)] ${
                            logIndex !== group.logs.length - 1 ? 'border-b border-[var(--color-border)]' : ''
                          }`}
                          aria-label={`View ${log.itemName} log`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[var(--color-text)]">{log.result}</span>
                              {log.variant && (
                                <span className="px-1.5 py-0.5 text-[10px] font-display tracking-wider bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">
                                  {log.variant}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[var(--color-text-muted)]">{log.date}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0 ml-2 opacity-50" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">No logs yet. Start tracking your PRs!</p>
          </div>
        )}
      </section>

    </div>
  );
};
