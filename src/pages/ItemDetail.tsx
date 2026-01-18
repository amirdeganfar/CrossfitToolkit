import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Plus, Trash2, Loader2, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { useCatalogStore, useCatalogItem } from '../stores/catalogStore';
import { useInitialize } from '../hooks/useInitialize';
import { LogResultModal } from '../components/LogResultModal';
import { PercentageCalculator } from '../components/PercentageCalculator';
import { isDualMetricItem, isDistanceOnlyItem } from '../utils/itemMetrics';
import * as db from '../db';
import type { PRLog, CatalogItem } from '../types/catalog';

// Group structure for accordion display
interface LogGroup {
  key: number | string;  // distance, time, reps, or variant
  label: string;         // formatted label (e.g., "200m", "2:00", "5RM", "Rx")
  type: 'distance' | 'calories' | 'reps' | 'variant';
  logs: PRLog[];         // sorted: PR first, then by date desc
  bestLog: PRLog;        // the PR for this group
}

// Group logs by distance or calories/time, with PR first in each group
const groupLogs = (
  logs: PRLog[],
  bestByDistance: Map<number, PRLog>,
  bestByCalories: Map<number, PRLog>,
  formatDistance: (meters: number) => string
): LogGroup[] => {
  const distanceGroups = new Map<number, PRLog[]>();
  const calorieGroups = new Map<number, PRLog[]>(); // keyed by time (resultValue)

  // Separate logs by type
  logs.forEach(log => {
    if (log.distance !== undefined) {
      const existing = distanceGroups.get(log.distance) || [];
      existing.push(log);
      distanceGroups.set(log.distance, existing);
    } else if (log.calories !== undefined) {
      const existing = calorieGroups.get(log.resultValue) || [];
      existing.push(log);
      calorieGroups.set(log.resultValue, existing);
    }
  });

  const result: LogGroup[] = [];

  // Process distance groups (sorted by distance ascending)
  Array.from(distanceGroups.keys())
    .sort((a, b) => a - b)
    .forEach(distance => {
      const groupLogs = distanceGroups.get(distance)!;
      const bestLog = bestByDistance.get(distance);
      if (!bestLog) return;

      // Sort: PR first, then by date descending
      const sorted = [...groupLogs].sort((a, b) => {
        if (a.id === bestLog.id) return -1;
        if (b.id === bestLog.id) return 1;
        return b.date - a.date;
      });

      result.push({
        key: distance,
        label: formatDistance(distance),
        type: 'distance',
        logs: sorted,
        bestLog,
      });
    });

  // Process calorie groups (sorted by time ascending)
  Array.from(calorieGroups.keys())
    .sort((a, b) => a - b)
    .forEach(timeSeconds => {
      const groupLogs = calorieGroups.get(timeSeconds)!;
      const bestLog = bestByCalories.get(timeSeconds);
      if (!bestLog) return;

      // Sort: PR first, then by date descending
      const sorted = [...groupLogs].sort((a, b) => {
        if (a.id === bestLog.id) return -1;
        if (b.id === bestLog.id) return 1;
        return b.date - a.date;
      });

      // Format time
      const mins = Math.floor(timeSeconds / 60);
      const secs = timeSeconds % 60;
      const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

      result.push({
        key: timeSeconds,
        label: timeStr,
        type: 'calories',
        logs: sorted,
        bestLog,
      });
    });

  return result;
};

// Group logs by reps (for Lift items), with best (highest weight) first in each group
const groupLogsByReps = (
  logs: PRLog[]
): LogGroup[] => {
  const repsGroups = new Map<number, PRLog[]>();

  // Group logs by reps
  logs.forEach(log => {
    const reps = log.reps ?? 1; // Default to 1RM if no reps specified
    const existing = repsGroups.get(reps) || [];
    existing.push(log);
    repsGroups.set(reps, existing);
  });

  const result: LogGroup[] = [];

  // Process reps groups (sorted by reps ascending: 1RM, 3RM, 5RM, etc.)
  Array.from(repsGroups.keys())
    .sort((a, b) => a - b)
    .forEach(reps => {
      const groupLogs = repsGroups.get(reps)!;
      
      // Find best log (highest resultValue = heaviest weight)
      const bestLog = groupLogs.reduce((best, curr) => 
        curr.resultValue > best.resultValue ? curr : best
      );

      // Sort: PR first, then by date descending
      const sorted = [...groupLogs].sort((a, b) => {
        if (a.id === bestLog.id) return -1;
        if (b.id === bestLog.id) return 1;
        return b.date - a.date;
      });

      result.push({
        key: reps,
        label: `${reps}RM`,
        type: 'reps',
        logs: sorted,
        bestLog,
      });
    });

  return result;
};

// Group logs by variant (for Benchmark/Skill items), with best first in each group
const groupLogsByVariant = (
  logs: PRLog[],
  isLowerBetter: boolean
): LogGroup[] => {
  const variantGroups = new Map<string, PRLog[]>();

  // Group logs by variant
  logs.forEach(log => {
    const variant = log.variant ?? 'Unspecified';
    const existing = variantGroups.get(variant) || [];
    existing.push(log);
    variantGroups.set(variant, existing);
  });

  const result: LogGroup[] = [];

  // Define variant order: Rx+ first, then Rx, then Scaled, then Unspecified
  const variantOrder = ['Rx+', 'Rx', 'Scaled', 'Unspecified'];
  const sortedVariants = Array.from(variantGroups.keys()).sort((a, b) => {
    const aIndex = variantOrder.indexOf(a);
    const bIndex = variantOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  sortedVariants.forEach(variant => {
    const groupLogs = variantGroups.get(variant)!;
    
    // Find best log based on scoreType
    const bestLog = groupLogs.reduce((best, curr) => {
      if (isLowerBetter) {
        return curr.resultValue < best.resultValue ? curr : best;
      } else {
        return curr.resultValue > best.resultValue ? curr : best;
      }
    });

    // Sort: PR first, then by date descending
    const sorted = [...groupLogs].sort((a, b) => {
      if (a.id === bestLog.id) return -1;
      if (b.id === bestLog.id) return 1;
      return b.date - a.date;
    });

    result.push({
      key: variant,
      label: variant,
      type: 'variant',
      logs: sorted,
      bestLog,
    });
  });

  return result;
};

export const ItemDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isInitialized, isLoading: isInitializing } = useInitialize();

  // Store state
  const item = useCatalogItem(id ?? '');
  const toggleFavorite = useCatalogStore((state) => state.toggleFavorite);
  const deletePRLog = useCatalogStore((state) => state.deletePRLog);
  const settings = useCatalogStore((state) => state.settings);

  // Local state
  const [logs, setLogs] = useState<PRLog[]>([]);
  const [bestLog, setBestLog] = useState<PRLog | null>(null);
  const [bestByDistance, setBestByDistance] = useState<Map<number, PRLog>>(new Map());
  const [bestByCalories, setBestByCalories] = useState<Map<number, PRLog>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Use utility functions for metric type detection
  const isDual = isDualMetricItem(item);
  const isDistanceOnly = isDistanceOnlyItem(item);

  // Shared function to fetch logs and best PRs for an item
  const fetchLogsAndBests = useCallback(async (
    itemId: string,
    currentItem: CatalogItem | null
  ) => {
    const itemLogs = await db.getPRLogsForItem(itemId);
    setLogs(itemLogs);
    
    if (isDualMetricItem(currentItem)) {
      // For dual-metric items, get best PRs for BOTH distance and calories
      const bestsByDist = await db.getBestPRsByDistance(itemId);
      const bestsByCal = await db.getBestPRsByCalories(itemId);
      setBestByDistance(bestsByDist);
      setBestByCalories(bestsByCal);
      const allBests = [
        ...Array.from(bestsByDist.values()),
        ...Array.from(bestsByCal.values()),
      ];
      if (allBests.length > 0) {
        const overallBest = allBests.reduce((best, curr) => 
          curr.resultValue < best.resultValue ? curr : best
        );
        setBestLog(overallBest);
      } else {
        setBestLog(null);
      }
    } else if (isDistanceOnlyItem(currentItem)) {
      // For distance-only items, get best PRs grouped by distance
      const bestsByDist = await db.getBestPRsByDistance(itemId);
      setBestByDistance(bestsByDist);
      setBestByCalories(new Map());
      if (bestsByDist.size > 0) {
        const allBests = Array.from(bestsByDist.values());
        const overallBest = allBests.reduce((best, curr) => 
          curr.resultValue < best.resultValue ? curr : best
        );
        setBestLog(overallBest);
      } else {
        setBestLog(null);
      }
    } else {
      setBestByDistance(new Map());
      setBestByCalories(new Map());
      const best = await db.getBestPR(itemId);
      setBestLog(best ?? null);
    }
  }, []);

  // Fetch logs for this item
  useEffect(() => {
    const fetchLogs = async () => {
      if (!id || !isInitialized || !item) return;
      
      setIsLoading(true);
      try {
        await fetchLogsAndBests(id, item);
      } catch (error) {
        console.error('[ItemDetail] Error fetching logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [id, isInitialized, item, fetchLogsAndBests]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleFavoriteClick = async () => {
    if (id) {
      await toggleFavorite(id);
    }
  };

  const refreshLogs = async () => {
    if (!id || !item) return;
    await fetchLogsAndBests(id, item);
  };

  const handleDeleteLog = async (logId: string) => {
    if (window.confirm('Delete this log?')) {
      await deletePRLog(logId);
      await refreshLogs();
    }
  };

  const handleModalSuccess = async () => {
    await refreshLogs();
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getResultWithUnit = (result: string): string => {
    if (!item) return result;
    
    // If result already contains compound format (e.g., "5 reps @ 100kg", "1RM @ 100kg", "200m in 0:30")
    // just return it as-is
    if (result.includes('@') || result.includes(' in ') || result.includes('RM')) {
      return result;
    }
    
    switch (item.scoreType) {
      case 'Load':
        return `${result} ${settings.weightUnit}`;
      case 'Distance':
        return `${result} ${settings.distanceUnit}`;
      case 'Reps':
        return `${result} reps`;
      case 'Calories':
        return `${result} cal`;
      default:
        return result;
    }
  };

  const isLowerBetter = item?.scoreType === 'Time';

  // Format distance in meters to human-readable format
  const formatDistance = (meters: number): string => {
    if (meters >= 1609.34) {
      // Convert to miles for distances >= 1 mile
      const miles = meters / 1609.34;
      return miles === 1 ? '1 mile' : `${miles.toFixed(1)} mi`;
    } else if (meters >= 1000) {
      // Convert to km for distances >= 1km
      const km = meters / 1000;
      return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)}km`;
    }
    return `${meters}m`;
  };

  // Sort distances for display (ascending)
  const sortedDistances = Array.from(bestByDistance.keys()).sort((a, b) => a - b);
  
  // Sort times for calorie-based PRs (ascending by time in seconds)
  const sortedCalorieTimes = Array.from(bestByCalories.keys()).sort((a, b) => a - b);

  // Determine grouping type and create grouped logs for accordion display
  const getGroupedLogs = (): LogGroup[] => {
    if (isDual || isDistanceOnly) {
      // Monostructural items: group by distance or calories/time
      return groupLogs(logs, bestByDistance, bestByCalories, formatDistance);
    } else if (item?.category === 'Lift' && item?.scoreType === 'Load') {
      // Lift items: group by reps (1RM, 3RM, 5RM, etc.)
      return groupLogsByReps(logs);
    } else if (logs.length > 0) {
      // All other items (Benchmark, Skill, Custom): group by variant
      return groupLogsByVariant(logs, isLowerBetter);
    }
    return [];
  };

  const groupedLogs = getGroupedLogs();

  // Toggle accordion group expansion
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Check if should use grouped display (use grouping when we have groups)
  const useGroupedHistory = groupedLogs.length > 0;

  if (!isInitialized || isInitializing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Not Found</h1>
        </div>
        <div className="flex items-center justify-center h-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
          <p className="text-[var(--color-text-muted)]">Item not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text)]">{item.name}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {item.category} · {item.scoreType}
            </p>
          </div>
        </div>
        <button
          onClick={handleFavoriteClick}
          className={`p-2 rounded-lg transition-colors ${
            item.isFavorite
              ? 'text-amber-400'
              : 'text-[var(--color-text-muted)] hover:text-amber-400'
          }`}
          aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={`w-6 h-6 ${item.isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Best PR Card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          {isLowerBetter ? (
            <TrendingDown className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingUp className="w-4 h-4 text-green-400" />
          )}
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Best
          </h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
          </div>
        ) : isDual && (sortedDistances.length > 0 || sortedCalorieTimes.length > 0) ? (
          // Show best PRs for both distance and calories for dual-metric items (Row, Bike)
          <div className="space-y-4">
            {/* Distance-based PRs */}
            {sortedDistances.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">By Distance</p>
                {sortedDistances.map((distanceMeters) => {
                  const pr = bestByDistance.get(distanceMeters);
                  if (!pr) return null;
                  return (
                    <div key={distanceMeters} className="flex items-baseline justify-between">
                      <span className="text-sm font-medium text-[var(--color-text-muted)]">
                        {formatDistance(distanceMeters)}
                      </span>
                      <div className="text-right">
                        <span className="text-xl font-bold text-[var(--color-primary)]">
                          {pr.result.includes(' in ') ? pr.result.split(' in ')[1] : pr.result}
                        </span>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {formatDate(pr.date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Calorie-based PRs - grouped by time, showing max calories */}
            {sortedCalorieTimes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">By Time</p>
                {sortedCalorieTimes.map((timeSeconds) => {
                  const pr = bestByCalories.get(timeSeconds);
                  if (!pr) return null;
                  // Format time from seconds to MM:SS
                  const mins = Math.floor(timeSeconds / 60);
                  const secs = timeSeconds % 60;
                  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
                  return (
                    <div key={timeSeconds} className="flex items-baseline justify-between">
                      <span className="text-sm font-medium text-[var(--color-text-muted)]">
                        {timeStr}
                      </span>
                      <div className="text-right">
                        <span className="text-xl font-bold text-[var(--color-primary)]">
                          {pr.calories} cal
                        </span>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {formatDate(pr.date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : isDistanceOnly && sortedDistances.length > 0 ? (
          // Show best PRs grouped by distance for distance-only items (Run)
          <div className="space-y-3">
            {sortedDistances.map((distanceMeters) => {
              const pr = bestByDistance.get(distanceMeters);
              if (!pr) return null;
              return (
                <div key={distanceMeters} className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-[var(--color-text-muted)]">
                    {formatDistance(distanceMeters)}
                  </span>
                  <div className="text-right">
                    <span className="text-xl font-bold text-[var(--color-primary)]">
                      {pr.result.includes(' in ') ? pr.result.split(' in ')[1] : pr.result}
                    </span>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatDate(pr.date)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : bestLog ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[var(--color-primary)]">
                {getResultWithUnit(bestLog.result)}
              </span>
              {bestLog.variant && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">
                  {bestLog.variant}
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {formatDate(bestLog.date)}
            </p>
          </div>
        ) : (
          <p className="text-[var(--color-text-muted)]">No results yet</p>
        )}
      </div>

      {/* Percentage Calculator - only for Lift category with Load scoreType */}
      {item.category === 'Lift' && item.scoreType === 'Load' && (
        <PercentageCalculator logs={logs} weightUnit={settings.weightUnit} />
      )}

      {/* History section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            History ({logs.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
            <Loader2 className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
          </div>
        ) : useGroupedHistory ? (
          /* Grouped accordion view for all items */
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            {groupedLogs.map((group, groupIndex) => {
              const groupKey = `${group.type}-${group.key}`;
              const isExpanded = expandedGroups.has(groupKey);
              
              // Format the PR value based on group type
              const getPrDisplayValue = () => {
                switch (group.type) {
                  case 'distance':
                    return group.bestLog.result.includes(' in ') 
                      ? group.bestLog.result.split(' in ')[1] 
                      : group.bestLog.result;
                  case 'calories':
                    return `${group.bestLog.calories} cal`;
                  case 'reps':
                    return `${group.bestLog.resultValue} ${settings.weightUnit}`;
                  case 'variant':
                    return getResultWithUnit(group.bestLog.result);
                }
              };

              return (
                <div key={groupKey} className={groupIndex !== groupedLogs.length - 1 ? 'border-b border-[var(--color-border)]' : ''}>
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface-elevated)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown 
                        className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                      />
                      <span className="font-semibold text-[var(--color-text)]">
                        {group.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-primary)]">
                        {getPrDisplayValue()}
                      </span>
                      <span className="px-1.5 py-0.5 text-xs rounded bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">
                        {group.logs.length}
                      </span>
                    </div>
                  </button>

                  {/* Accordion Content */}
                  <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
                    <div>
                      {group.logs.map((log, logIndex) => {
                        const isPR = log.id === group.bestLog.id;
                        
                        // Format display result based on group type
                        const getDisplayResult = () => {
                          switch (group.type) {
                            case 'distance':
                              return log.result.includes(' in ') 
                                ? log.result.split(' in ')[1] 
                                : log.result;
                            case 'calories':
                              return `${log.calories} cal`;
                            case 'reps':
                              return `${log.resultValue} ${settings.weightUnit}`;
                            case 'variant':
                              return getResultWithUnit(log.result);
                          }
                        };
                        const displayResult = getDisplayResult();

                        return (
                          <div
                            key={log.id}
                            className={`flex items-center justify-between px-4 py-2 pl-11 group bg-[var(--color-bg)] ${
                              logIndex !== group.logs.length - 1 ? 'border-b border-[var(--color-border)]/50' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm ${
                                  isPR ? 'font-semibold text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                                }`}>
                                  {displayResult}
                                </span>
                                {/* Show variant badge only when not grouped by variant */}
                                {group.type !== 'variant' && log.variant && (
                                  <span className="px-1.5 py-0.5 text-xs rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">
                                    {log.variant}
                                  </span>
                                )}
                                {isPR && (
                                  <span className="px-1.5 py-0.5 text-xs rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                                    PR
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--color-text-muted)]">
                                {formatDate(log.date)}
                                {log.notes && ` — ${log.notes}`}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLog(log.id);
                              }}
                              className="p-2 -m-2 rounded-lg text-[var(--color-border)] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                              aria-label="Delete log"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : logs.length > 0 ? (
          /* Flat list view for non-monostructural items */
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            {logs.map((log, index) => {
              const isPR = log.id === bestLog?.id;
              
              return (
                <div
                  key={log.id}
                  className={`flex items-center justify-between px-4 py-3 group ${
                    index !== logs.length - 1 ? 'border-b border-[var(--color-border)]' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        isPR ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                      }`}>
                        {getResultWithUnit(log.result)}
                      </span>
                      {log.variant && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">
                          {log.variant}
                        </span>
                      )}
                      {isPR && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                          PR
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatDate(log.date)}
                      {log.notes && ` — ${log.notes}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-2 -m-2 rounded-lg text-[var(--color-border)] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Delete log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 text-center">
            <p className="text-[var(--color-text-muted)]">
              No results logged yet. Add your first one!
            </p>
          </div>
        )}
      </section>

      {/* Log Result button */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] rounded-xl text-white font-semibold transition-colors"
        aria-label="Log a result"
      >
        <Plus className="w-5 h-5" />
        <span>Log Result</span>
      </button>

      {/* Log Result Modal */}
      {showModal && (
        <LogResultModal
          item={item}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};
