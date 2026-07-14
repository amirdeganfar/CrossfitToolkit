import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Plus, Trash2, Loader2, TrendingUp, TrendingDown, ChevronDown, ChevronRight, Dumbbell, Target } from 'lucide-react';
import { useCatalogStore, useCatalogItem } from '../stores/catalogStore';
import { useGoalsStore, useActiveGoalForItem, useActiveGoalsForItem } from '../stores/goalsStore';
import { useInitialize } from '../hooks/useInitialize';
import { LogResultModal } from '../components/LogResultModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PercentageCalculator } from '../components/PercentageCalculator';
import { GoalProgress, GoalModal } from '../components/goals';
import { LoadedBarButton } from '../components/LoadedBarButton';
import { Barbell } from '../components/Barbell';
import { RxTag } from '../components/RxTag';
import { isDualMetricItem, isDistanceOnlyItem } from '../utils/itemMetrics';
import { categoryColorHex } from '../utils/categoryColors';
import {
  getScoreModes,
  getLogScoreType,
  getScoreTypeDef,
  isLowerBetter as scoreIsLowerBetter,
  formatSecondsToTime,
} from '../config/scoreTypes';
import * as db from '../db';
import type { PRLog, CatalogItem, ScoreType } from '../types/catalog';
import type { CreateGoalInput, UpdateGoalInput, GoalWithProgress } from '../types/goal';

// Group structure for accordion display
interface LogGroup {
  key: number | string;
  label: string;
  type: 'distance' | 'calories' | 'reps' | 'variant';
  logs: PRLog[];
  bestLog: PRLog;
}

// Group structure for multi-mode items (Option A): one section per score type + constraint
interface ScoreTypeGroup {
  key: string;           // `${scoreType}:${constraint ?? ''}`
  scoreType: ScoreType;
  label: string;         // "Reps in 2:00", "Time for 10", "Reps"
  logs: PRLog[];         // sorted, best first
  bestLog: PRLog;
  lowerIsBetter: boolean;
}

// Human label for a score-type group, folding the captured constraint into the header.
const scoreTypeGroupLabel = (scoreType: ScoreType, sample: PRLog): string => {
  if (scoreType === 'RepsInTime') {
    return sample.timeCap ? `Reps in ${formatSecondsToTime(sample.timeCap)}` : getScoreTypeDef(scoreType).name;
  }
  if (scoreType === 'TimeForReps') {
    return sample.targetReps ? `Time for ${sample.targetReps} reps` : getScoreTypeDef(scoreType).name;
  }
  return getScoreTypeDef(scoreType).name;
};

// Group logs into per-score-type pools, keyed by (scoreType, constraint).
// Best/PR is computed independently per pool using that type's better-direction.
const groupLogsByScoreType = (logs: PRLog[], item: CatalogItem): ScoreTypeGroup[] => {
  const groups = new Map<string, PRLog[]>();
  logs.forEach((log) => {
    const st = getLogScoreType(log, item);
    const constraint = st === 'RepsInTime' ? log.timeCap : st === 'TimeForReps' ? log.targetReps : undefined;
    const key = `${st}:${constraint ?? ''}`;
    const existing = groups.get(key) || [];
    existing.push(log);
    groups.set(key, existing);
  });

  const modeOrder = getScoreModes(item);
  const result: ScoreTypeGroup[] = [];
  groups.forEach((groupLogs, key) => {
    const st = key.slice(0, key.indexOf(':')) as ScoreType;
    const lowerIsBetter = scoreIsLowerBetter(st);
    const bestLog = groupLogs.reduce((best, curr) => {
      if (lowerIsBetter) return curr.resultValue < best.resultValue ? curr : best;
      return curr.resultValue > best.resultValue ? curr : best;
    });
    const sorted = [...groupLogs].sort((a, b) => {
      if (a.id === bestLog.id) return -1;
      if (b.id === bestLog.id) return 1;
      return b.date - a.date;
    });
    result.push({ key, scoreType: st, label: scoreTypeGroupLabel(st, bestLog), logs: sorted, bestLog, lowerIsBetter });
  });

  // Order by the item's declared mode order, then by constraint key.
  result.sort((a, b) => {
    const ai = modeOrder.indexOf(a.scoreType);
    const bi = modeOrder.indexOf(b.scoreType);
    if (ai !== bi) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.key.localeCompare(b.key);
  });
  return result;
};

const groupLogs = (
  logs: PRLog[],
  bestByDistance: Map<number, PRLog>,
  bestByCalories: Map<number, PRLog>,
  formatDistance: (meters: number) => string
): LogGroup[] => {
  const distanceGroups = new Map<number, PRLog[]>();
  const calorieGroups = new Map<number, PRLog[]>();

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

  Array.from(distanceGroups.keys()).sort((a, b) => a - b).forEach(distance => {
    const groupLogs = distanceGroups.get(distance)!;
    const bestLog = bestByDistance.get(distance);
    if (!bestLog) return;
    const sorted = [...groupLogs].sort((a, b) => {
      if (a.id === bestLog.id) return -1;
      if (b.id === bestLog.id) return 1;
      return b.date - a.date;
    });
    result.push({ key: distance, label: formatDistance(distance), type: 'distance', logs: sorted, bestLog });
  });

  Array.from(calorieGroups.keys()).sort((a, b) => a - b).forEach(timeSeconds => {
    const groupLogs = calorieGroups.get(timeSeconds)!;
    const bestLog = bestByCalories.get(timeSeconds);
    if (!bestLog) return;
    const sorted = [...groupLogs].sort((a, b) => {
      if (a.id === bestLog.id) return -1;
      if (b.id === bestLog.id) return 1;
      return b.date - a.date;
    });
    const mins = Math.floor(timeSeconds / 60);
    const secs = timeSeconds % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    result.push({ key: timeSeconds, label: timeStr, type: 'calories', logs: sorted, bestLog });
  });

  return result;
};

const groupLogsByReps = (logs: PRLog[]): LogGroup[] => {
  const repsGroups = new Map<number, PRLog[]>();
  logs.forEach(log => {
    const reps = log.reps ?? 1;
    const existing = repsGroups.get(reps) || [];
    existing.push(log);
    repsGroups.set(reps, existing);
  });

  const result: LogGroup[] = [];
  Array.from(repsGroups.keys()).sort((a, b) => a - b).forEach(reps => {
    const groupLogs = repsGroups.get(reps)!;
    const bestLog = groupLogs.reduce((best, curr) => curr.resultValue > best.resultValue ? curr : best);
    const sorted = [...groupLogs].sort((a, b) => {
      if (a.id === bestLog.id) return -1;
      if (b.id === bestLog.id) return 1;
      return b.date - a.date;
    });
    result.push({ key: reps, label: `${reps}RM`, type: 'reps', logs: sorted, bestLog });
  });
  return result;
};

const groupLogsByVariant = (logs: PRLog[], isLowerBetter: boolean): LogGroup[] => {
  const variantGroups = new Map<string, PRLog[]>();
  logs.forEach(log => {
    const variant = log.variant ?? 'Unspecified';
    const existing = variantGroups.get(variant) || [];
    existing.push(log);
    variantGroups.set(variant, existing);
  });

  const result: LogGroup[] = [];
  const variantOrder = ['Rx+', 'Rx', 'Scaled', 'Unspecified'];
  const sortedVariants = Array.from(variantGroups.keys()).sort((a, b) => {
    const aIndex = variantOrder.indexOf(a);
    const bIndex = variantOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  sortedVariants.forEach(variant => {
    const groupLogs = variantGroups.get(variant)!;
    const bestLog = groupLogs.reduce((best, curr) => {
      if (isLowerBetter) return curr.resultValue < best.resultValue ? curr : best;
      return curr.resultValue > best.resultValue ? curr : best;
    });
    const sorted = [...groupLogs].sort((a, b) => {
      if (a.id === bestLog.id) return -1;
      if (b.id === bestLog.id) return 1;
      return b.date - a.date;
    });
    result.push({ key: variant, label: variant, type: 'variant', logs: sorted, bestLog });
  });
  return result;
};

export const ItemDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isInitialized, isLoading: isInitializing } = useInitialize();

  const item = useCatalogItem(id ?? '');
  const catalogItems = useCatalogStore((state) => state.catalogItems);
  const toggleFavorite = useCatalogStore((state) => state.toggleFavorite);
  const deletePRLog = useCatalogStore((state) => state.deletePRLog);
  const settings = useCatalogStore((state) => state.settings);

  const goalsIsInitialized = useGoalsStore((s) => s.isInitialized);
  const goalsInitialize = useGoalsStore((s) => s.initialize);
  const goalsRefresh = useGoalsStore((s) => s.refreshGoals);
  const goalsAddGoal = useGoalsStore((s) => s.addGoal);
  const goalsUpdateGoal = useGoalsStore((s) => s.updateGoal);
  const activeGoal = useActiveGoalForItem(id ?? '');
  // All active goals for this item — one per score pool for multi-mode items.
  const activeGoals = useActiveGoalsForItem(id ?? '');

  const [logs, setLogs] = useState<PRLog[]>([]);
  const [bestLog, setBestLog] = useState<PRLog | null>(null);
  const [bestByDistance, setBestByDistance] = useState<Map<number, PRLog>>(new Map());
  const [bestByCalories, setBestByCalories] = useState<Map<number, PRLog>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  // Goal modal context: which existing goal to edit and which score pool to
  // pre-scope it to (multi-mode items). Null → create for the item's primary pool.
  const [goalModalEditGoal, setGoalModalEditGoal] = useState<GoalWithProgress | null>(null);
  const [goalModalScoreType, setGoalModalScoreType] = useState<ScoreType | null>(null);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isInitialized && !goalsIsInitialized && catalogItems.length > 0) {
      goalsInitialize(catalogItems, settings.weightUnit);
    }
  }, [isInitialized, goalsIsInitialized, catalogItems, settings.weightUnit, goalsInitialize]);

  const isDual = isDualMetricItem(item);
  const isDistanceOnly = isDistanceOnlyItem(item);

  const fetchLogsAndBests = useCallback(async (itemId: string, currentItem: CatalogItem | null) => {
    const itemLogs = await db.getPRLogsForItem(itemId);
    setLogs(itemLogs);

    if (isDualMetricItem(currentItem)) {
      const bestsByDist = await db.getBestPRsByDistance(itemId);
      const bestsByCal = await db.getBestPRsByCalories(itemId);
      setBestByDistance(bestsByDist);
      setBestByCalories(bestsByCal);
      const allBests = [...Array.from(bestsByDist.values()), ...Array.from(bestsByCal.values())];
      if (allBests.length > 0) {
        setBestLog(allBests.reduce((best, curr) => curr.resultValue < best.resultValue ? curr : best));
      } else {
        setBestLog(null);
      }
    } else if (isDistanceOnlyItem(currentItem)) {
      const bestsByDist = await db.getBestPRsByDistance(itemId);
      setBestByDistance(bestsByDist);
      setBestByCalories(new Map());
      if (bestsByDist.size > 0) {
        const allBests = Array.from(bestsByDist.values());
        setBestLog(allBests.reduce((best, curr) => curr.resultValue < best.resultValue ? curr : best));
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

  const handleBack = () => navigate(-1);

  const handleFavoriteClick = async () => {
    if (id) await toggleFavorite(id);
  };

  const refreshLogs = async () => {
    if (!id || !item) return;
    await fetchLogsAndBests(id, item);
  };

  const handleDeleteLog = (logId: string) => setDeleteLogId(logId);

  const confirmDeleteLog = async () => {
    if (deleteLogId) {
      await deletePRLog(deleteLogId);
      await refreshLogs();
      setDeleteLogId(null);
    }
  };

  const handleModalSuccess = async () => {
    await refreshLogs();
    if (goalsIsInitialized) {
      await goalsRefresh(catalogItems, settings.weightUnit);
    }
  };

  const handleSaveGoal = async (input: CreateGoalInput | { id: string; updates: UpdateGoalInput }) => {
    if ('id' in input) {
      await goalsUpdateGoal(input.id, input.updates, catalogItems, settings.weightUnit);
    } else {
      await goalsAddGoal(input, catalogItems, settings.weightUnit);
    }
  };

  const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getResultWithUnit = (result: string, scoreType: ScoreType | undefined = item?.scoreType): string => {
    if (!item || !scoreType) return result;
    if (result.includes('@') || result.includes(' in ') || result.includes('RM')) return result;
    // The stored result is already unit-suffixed at save time (via the registry's
    // format). Only append the unit when it isn't already present — avoids
    // "22 reps reps" / "50 cal cal".
    switch (scoreType) {
      case 'Load':     return result.includes(settings.weightUnit) ? result : `${result} ${settings.weightUnit}`;
      case 'Distance': return result.includes(settings.distanceUnit) ? result : `${result} ${settings.distanceUnit}`;
      case 'Reps':     return result.includes('reps') ? result : `${result} reps`;
      case 'Calories': return result.includes('cal') ? result : `${result} cal`;
      case 'RepsInTime': return result.includes('reps') ? result : `${result} reps`;
      default:         return result;
    }
  };

  // Meaningful display value for a log within a score-type group (Option A).
  const getScoreTypeResult = (log: PRLog, scoreType: ScoreType): string => {
    if (scoreType === 'RepsInTime') {
      return log.result.includes(' in ') ? log.result.split(' in ')[0] : `${log.resultValue} reps`;
    }
    if (scoreType === 'TimeForReps') {
      return log.result.includes(' in ') ? log.result.split(' in ')[1] : log.result;
    }
    return getResultWithUnit(log.result, scoreType);
  };

  const isLowerBetter = item ? scoreIsLowerBetter(item.scoreType) : false;

  // Multi-mode items (Option A): group history/PR by score type instead of variant.
  const scoreModes = getScoreModes(item);
  const useScoreTypeGrouping = scoreModes.length > 1 && !isDual && !isDistanceOnly;
  const scoreTypeGroups = useScoreTypeGrouping && item ? groupLogsByScoreType(logs, item) : [];

  // Resolve the active goal bound to a specific score pool (multi-mode items).
  // Legacy goals with no scoreTypeId backfill to the item's primary score type.
  const goalForGroup = (group: ScoreTypeGroup): GoalWithProgress | undefined =>
    activeGoals.find((g) => {
      const gst = g.scoreTypeId ?? item?.scoreType;
      if (gst !== group.scoreType) return false;
      if (group.scoreType === 'RepsInTime' && group.bestLog.timeCap !== undefined && g.timeCap !== group.bestLog.timeCap) return false;
      if (group.scoreType === 'TimeForReps' && group.bestLog.targetReps !== undefined && g.targetReps !== group.bestLog.targetReps) return false;
      return true;
    });

  // Open the goal modal, optionally pre-scoped to a score pool (multi-mode).
  const openGoalModal = (editGoal: GoalWithProgress | null, scoreType: ScoreType | null) => {
    setGoalModalEditGoal(editGoal);
    setGoalModalScoreType(scoreType);
    setShowGoalModal(true);
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1609.34) {
      const miles = meters / 1609.34;
      return miles === 1 ? '1 mile' : `${miles.toFixed(1)} mi`;
    } else if (meters >= 1000) {
      const km = meters / 1000;
      return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)}km`;
    }
    return `${meters}m`;
  };

  const sortedDistances = Array.from(bestByDistance.keys()).sort((a, b) => a - b);
  const sortedCalorieTimes = Array.from(bestByCalories.keys()).sort((a, b) => a - b);

  const getGroupedLogs = (): LogGroup[] => {
    if (isDual || isDistanceOnly) {
      return groupLogs(logs, bestByDistance, bestByCalories, formatDistance);
    } else if (item?.category === 'Lift' && item?.scoreType === 'Load') {
      return groupLogsByReps(logs);
    } else if (logs.length > 0) {
      return groupLogsByVariant(logs, isLowerBetter);
    }
    return [];
  };

  const groupedLogs = getGroupedLogs();

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const useGroupedHistory = groupedLogs.length > 0;

  const getCategoryColor = (category: CatalogItem['category']) => categoryColorHex(category);

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
          <button onClick={handleBack} className="p-2 -ml-1 hover:bg-[var(--color-surface-elevated)] transition-colors" aria-label="Go back">
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
          <h1 className="font-display text-2xl text-[var(--color-text)]">NOT FOUND</h1>
        </div>
        <div className="flex items-center justify-center h-48 border border-[var(--color-border)]">
          <p className="font-display text-sm tracking-widest text-[var(--color-text-muted)]">ITEM NOT FOUND</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 -ml-1 hover:bg-[var(--color-surface-elevated)] transition-colors" aria-label="Go back">
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
          <div>
            <p
              className="font-display text-[10px] tracking-[0.2em] mb-0.5"
              style={{ color: getCategoryColor(item.category) }}
            >
              {item.category.toUpperCase()} · {scoreModes.length > 1 ? 'MULTI' : getScoreTypeDef(item.scoreType).name.toUpperCase()}
            </p>
            <h1 className="font-display text-3xl text-[var(--color-text)] leading-tight">{item.name}</h1>
          </div>
        </div>
        <button
          onClick={handleFavoriteClick}
          className={`p-2 transition-colors ${
            item.isFavorite ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
          }`}
          aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={`w-6 h-6 ${item.isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Description */}
      {(item.description || item.movements) && (() => {
        if (item.movements && item.movements.length > 0) {
          return (
            <div className="border-l-2 border-[var(--color-border-strong)] pl-3 py-1">
              {item.description && (
                <div className="flex items-center gap-2 mb-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                  <span className="font-display text-sm text-[var(--color-text)] tracking-wider">{item.description}</span>
                </div>
              )}
              <ul className={`space-y-1 ${item.description ? 'pl-5' : 'pl-0'}`}>
                {item.movements.map((movement, idx) => (
                  <li key={idx} className="text-xs text-[var(--color-text-muted)] flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-[var(--color-primary)] shrink-0 mt-0.5" />
                    <span>{movement}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (item.description) {
          const colonIndex = item.description.indexOf(':');
          const hasFormat = colonIndex > 0 && colonIndex < 30;
          if (hasFormat) {
            const format = item.description.slice(0, colonIndex).trim();
            const movementsPart = item.description.slice(colonIndex + 1).trim();
            const movements = movementsPart.split(/,\s*(?![^()]*\))/).map(m => m.trim()).filter(Boolean);
            return (
              <div className="border-l-2 border-[var(--color-border-strong)] pl-3 py-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                  <span className="font-display text-sm text-[var(--color-text)] tracking-wider">{format}</span>
                </div>
                <ul className="space-y-1 pl-5">
                  {movements.map((movement, idx) => (
                    <li key={idx} className="text-xs text-[var(--color-text-muted)] flex items-start gap-2">
                      <ChevronRight className="w-3 h-3 text-[var(--color-primary)] shrink-0 mt-0.5" />
                      <span>{movement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          return (
            <div className="border-l-2 border-[var(--color-border-strong)] pl-3 py-1 flex items-start gap-2">
              <Dumbbell className="w-3.5 h-3.5 text-[var(--color-text-muted)] mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--color-text-muted)]">{item.description}</p>
            </div>
          );
        }
        return null;
      })()}

      {/* Best PR — no card, just floating number with rule */}
      <div className="py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {isLowerBetter ? (
              <TrendingDown className="w-3.5 h-3.5 text-[var(--color-success)]" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 text-[var(--color-success)]" />
            )}
            <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">PERSONAL BEST</span>
          </div>
          {!activeGoal && !useScoreTypeGrouping && bestLog && (
            <button
              onClick={() => openGoalModal(null, null)}
              className="flex items-center gap-1 font-display text-xs tracking-widest text-[var(--color-primary)] hover:underline"
            >
              <Target size={11} />
              SET GOAL
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
          </div>
        ) : useScoreTypeGrouping ? (
          scoreTypeGroups.length > 0 ? (
            <div className="space-y-4">
              {scoreTypeGroups.map((group) => {
                const groupGoal = goalForGroup(group);
                return (
                  <div key={group.key} className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-center gap-1.5">
                        {group.lowerIsBetter ? (
                          <TrendingDown className="w-3 h-3 text-[var(--color-success)]" />
                        ) : (
                          <TrendingUp className="w-3 h-3 text-[var(--color-success)]" />
                        )}
                        <span className="font-display text-xs tracking-wider text-[var(--color-text-muted)]">{group.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-2xl text-[var(--color-primary)]">
                          {getScoreTypeResult(group.bestLog, group.scoreType)}
                        </span>
                        <p className="font-display text-xs text-[var(--color-text-muted)]">{formatDate(group.bestLog.date)}</p>
                      </div>
                    </div>
                    {groupGoal ? (
                      <div className="pl-5">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 font-display text-xs tracking-widest text-[var(--color-text-muted)]">
                            <Target size={11} className="text-[var(--color-primary)]" />
                            <span>GOAL: {groupGoal.targetResult}</span>
                          </div>
                          <button onClick={() => openGoalModal(groupGoal, group.scoreType)} className="font-display text-xs tracking-widest text-[var(--color-primary)] hover:underline">
                            EDIT
                          </button>
                        </div>
                        {groupGoal.currentValue != null ? (
                          <Barbell current={groupGoal.currentValue} goal={groupGoal.targetValue} lowerIsBetter={group.lowerIsBetter} />
                        ) : (
                          <GoalProgress progress={groupGoal.progress} size="sm" />
                        )}
                        <p className="font-display text-xs text-[var(--color-text-muted)] tracking-widest mt-1">
                          {groupGoal.daysRemaining >= 0 ? `${groupGoal.daysRemaining} DAYS REMAINING` : 'OVERDUE'}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => openGoalModal(null, group.scoreType)}
                        className="pl-5 flex items-center gap-1.5 font-display text-xs tracking-widest text-[var(--color-primary)] hover:underline"
                      >
                        <Target size={11} />
                        SET GOAL
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <p className="font-display text-sm tracking-widest text-[var(--color-text-muted)]">NO RESULTS YET</p>
              <button onClick={() => openGoalModal(null, null)} className="mt-2 flex items-center gap-1.5 font-display text-sm tracking-wider text-[var(--color-primary)] hover:underline">
                <Target size={13} />
                SET A GOAL
              </button>
            </div>
          )
        ) : isDual && (sortedDistances.length > 0 || sortedCalorieTimes.length > 0) ? (
          <div className="space-y-3">
            {sortedDistances.length > 0 && (
              <div className="space-y-2">
                <p className="font-display text-[10px] tracking-widest text-[var(--color-text-muted)]">BY DISTANCE</p>
                {sortedDistances.map((distanceMeters) => {
                  const pr = bestByDistance.get(distanceMeters);
                  if (!pr) return null;
                  return (
                    <div key={distanceMeters} className="flex items-baseline justify-between">
                      <span className="font-display text-xs tracking-wider text-[var(--color-text-muted)]">{formatDistance(distanceMeters)}</span>
                      <div className="text-right">
                        <span className="font-display text-2xl text-[var(--color-primary)]">
                          {pr.result.includes(' in ') ? pr.result.split(' in ')[1] : pr.result}
                        </span>
                        <p className="font-display text-xs text-[var(--color-text-muted)]">{formatDate(pr.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {sortedCalorieTimes.length > 0 && (
              <div className="space-y-2">
                <p className="font-display text-[10px] tracking-widest text-[var(--color-text-muted)]">BY TIME</p>
                {sortedCalorieTimes.map((timeSeconds) => {
                  const pr = bestByCalories.get(timeSeconds);
                  if (!pr) return null;
                  const mins = Math.floor(timeSeconds / 60);
                  const secs = timeSeconds % 60;
                  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
                  return (
                    <div key={timeSeconds} className="flex items-baseline justify-between">
                      <span className="font-display text-xs tracking-wider text-[var(--color-text-muted)]">{timeStr}</span>
                      <div className="text-right">
                        <span className="font-display text-2xl text-[var(--color-primary)]">{pr.calories} cal</span>
                        <p className="font-display text-xs text-[var(--color-text-muted)]">{formatDate(pr.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : isDistanceOnly && sortedDistances.length > 0 ? (
          <div className="space-y-3">
            {sortedDistances.map((distanceMeters) => {
              const pr = bestByDistance.get(distanceMeters);
              if (!pr) return null;
              return (
                <div key={distanceMeters} className="flex items-baseline justify-between">
                  <span className="font-display text-xs tracking-wider text-[var(--color-text-muted)]">{formatDistance(distanceMeters)}</span>
                  <div className="text-right">
                    <span className="font-display text-2xl text-[var(--color-primary)]">
                      {pr.result.includes(' in ') ? pr.result.split(' in ')[1] : pr.result}
                    </span>
                    <p className="font-display text-xs text-[var(--color-text-muted)]">{formatDate(pr.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : bestLog ? (
          <div>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-6xl text-[var(--color-primary)]">
                {getResultWithUnit(bestLog.result)}
              </span>
              <RxTag variant={bestLog.variant} />
            </div>
            <p className="font-display text-xs text-[var(--color-text-muted)] tracking-widest mt-1">
              {formatDate(bestLog.date)}
            </p>
            {activeGoal && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-display text-xs tracking-widest text-[var(--color-text-muted)]">
                    <Target size={11} className="text-[var(--color-primary)]" />
                    <span>GOAL: {activeGoal.targetResult}</span>
                  </div>
                  <button onClick={() => openGoalModal(activeGoal ?? null, null)} className="font-display text-xs tracking-widest text-[var(--color-primary)] hover:underline">
                    EDIT
                  </button>
                </div>
                {activeGoal.currentValue != null ? (
                  <Barbell current={activeGoal.currentValue} goal={activeGoal.targetValue} lowerIsBetter={isLowerBetter} />
                ) : (
                  <GoalProgress progress={activeGoal.progress} size="sm" />
                )}
                <p className="font-display text-xs text-[var(--color-text-muted)] tracking-widest mt-1">
                  {activeGoal.daysRemaining >= 0 ? `${activeGoal.daysRemaining} DAYS REMAINING` : 'OVERDUE'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="font-display text-sm tracking-widest text-[var(--color-text-muted)]">NO RESULTS YET</p>
            {!activeGoal && (
              <button onClick={() => openGoalModal(null, null)} className="mt-2 flex items-center gap-1.5 font-display text-sm tracking-wider text-[var(--color-primary)] hover:underline">
                <Target size={13} />
                SET A GOAL
              </button>
            )}
          </div>
        )}
      </div>

      {/* Percentage Calculator */}
      {item.category === 'Lift' && item.scoreType === 'Load' && (
        <PercentageCalculator logs={logs} weightUnit={settings.weightUnit} />
      )}

      {/* History section */}
      <section>
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-[var(--color-border)]">
          <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">HISTORY</span>
          <span className="font-display text-xs text-[var(--color-text-muted)]">{logs.length} LOGS</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32 border border-[var(--color-border)]">
            <Loader2 className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
          </div>
        ) : useScoreTypeGrouping ? (
          scoreTypeGroups.length > 0 ? (
            <div className="divide-y divide-[var(--color-border)]">
              {scoreTypeGroups.map((group) => {
                const groupKey = `st-${group.key}`;
                const isExpanded = expandedGroups.has(groupKey);

                return (
                  <div key={groupKey}>
                    <button
                      onClick={() => toggleGroup(groupKey)}
                      className="w-full flex items-center justify-between py-3 hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        <span className="font-display text-sm text-[var(--color-text)] tracking-wider">{group.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base text-[var(--color-primary)]">{getScoreTypeResult(group.bestLog, group.scoreType)}</span>
                        <span className="font-display text-xs text-[var(--color-text-muted)] border border-[var(--color-border)] px-1.5 py-0.5">{group.logs.length}</span>
                      </div>
                    </button>

                    <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
                      <div>
                        {group.logs.map((log, logIndex) => {
                          const isPR = log.id === group.bestLog.id;
                          return (
                            <div
                              key={log.id}
                              className={`flex items-center justify-between py-2 pl-10 pr-3 group bg-[var(--color-bg)] ${
                                logIndex !== group.logs.length - 1 ? 'border-b border-[var(--color-border)]/50' : ''
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`font-display text-sm ${isPR ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                                    {getScoreTypeResult(log, group.scoreType)}
                                  </span>
                                  <RxTag variant={log.variant} />
                                  {isPR && (
                                    <span className="font-display text-[10px] tracking-widest bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-1.5 py-0.5">
                                      PR
                                    </span>
                                  )}
                                </div>
                                <p className="font-display text-xs text-[var(--color-text-muted)] tracking-widest">
                                  {formatDate(log.date)}{log.notes && ` — ${log.notes}`}
                                </p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteLog(log.id); }}
                                className="p-2 -m-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors opacity-60 group-hover:opacity-100"
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
          ) : (
            <div className="py-8 border-t border-[var(--color-border)]">
              <p className="font-display text-sm tracking-widest text-[var(--color-text-muted)]">
                NO RESULTS LOGGED YET
              </p>
            </div>
          )
        ) : useGroupedHistory ? (
          <div className="divide-y divide-[var(--color-border)]">
            {groupedLogs.map((group) => {
              const groupKey = `${group.type}-${group.key}`;
              const isExpanded = expandedGroups.has(groupKey);

              const getPrDisplayValue = () => {
                switch (group.type) {
                  case 'distance': return group.bestLog.result.includes(' in ') ? group.bestLog.result.split(' in ')[1] : group.bestLog.result;
                  case 'calories': return `${group.bestLog.calories} cal`;
                  case 'reps':     return `${group.bestLog.resultValue} ${settings.weightUnit}`;
                  case 'variant':  return getResultWithUnit(group.bestLog.result);
                }
              };

              return (
                <div key={groupKey}>
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center justify-between py-3 hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      <span className="font-display text-sm text-[var(--color-text)] tracking-wider">{group.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base text-[var(--color-primary)]">{getPrDisplayValue()}</span>
                      <span className="font-display text-xs text-[var(--color-text-muted)] border border-[var(--color-border)] px-1.5 py-0.5">{group.logs.length}</span>
                    </div>
                  </button>

                  <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
                    <div>
                      {group.logs.map((log, logIndex) => {
                        const isPR = log.id === group.bestLog.id;
                        const getDisplayResult = () => {
                          switch (group.type) {
                            case 'distance': return log.result.includes(' in ') ? log.result.split(' in ')[1] : log.result;
                            case 'calories': return `${log.calories} cal`;
                            case 'reps':     return `${log.resultValue} ${settings.weightUnit}`;
                            case 'variant':  return getResultWithUnit(log.result);
                          }
                        };

                        return (
                          <div
                            key={log.id}
                            className={`flex items-center justify-between py-2 pl-10 pr-3 group bg-[var(--color-bg)] ${
                              logIndex !== group.logs.length - 1 ? 'border-b border-[var(--color-border)]/50' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-display text-sm ${isPR ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                                  {getDisplayResult()}
                                </span>
                                {group.type !== 'variant' && <RxTag variant={log.variant} />}
                                {isPR && (
                                  <span className="font-display text-[10px] tracking-widest bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-1.5 py-0.5">
                                    PR
                                  </span>
                                )}
                              </div>
                              <p className="font-display text-xs text-[var(--color-text-muted)] tracking-widest">
                                {formatDate(log.date)}{log.notes && ` — ${log.notes}`}
                              </p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteLog(log.id); }}
                              className="p-2 -m-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors opacity-60 group-hover:opacity-100"
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
          <div className="divide-y divide-[var(--color-border)]">
            {logs.map((log) => {
              const isPR = log.id === bestLog?.id;
              return (
                <div key={log.id} className="flex items-center justify-between py-3 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-display text-sm ${isPR ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                        {getResultWithUnit(log.result)}
                      </span>
                      <RxTag variant={log.variant} />
                      {isPR && (
                        <span className="font-display text-[10px] tracking-widest bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-1.5 py-0.5">
                          PR
                        </span>
                      )}
                    </div>
                    <p className="font-display text-xs text-[var(--color-text-muted)] tracking-widest">
                      {formatDate(log.date)}{log.notes && ` — ${log.notes}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-2 -m-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors opacity-60 group-hover:opacity-100"
                    aria-label="Delete log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 border-t border-[var(--color-border)]">
            <p className="font-display text-sm tracking-widest text-[var(--color-text-muted)]">
              NO RESULTS LOGGED YET
            </p>
          </div>
        )}
      </section>

      {/* Sticky Log Result CTA */}
      <div className="sticky bottom-0 bg-[var(--color-bg)] border-t border-[var(--color-border)] p-4 pb-safe -mx-4">
        <LoadedBarButton onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5" /> Log a result
        </LoadedBarButton>
      </div>

      {/* Log Result Modal */}
      {showModal && (
        <LogResultModal item={item} onClose={() => setShowModal(false)} onSuccess={handleModalSuccess} />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteLogId && (
        <ConfirmDialog
          title="Delete Log"
          message="Are you sure you want to delete this log? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          isDestructive
          onConfirm={confirmDeleteLog}
          onCancel={() => setDeleteLogId(null)}
        />
      )}

      {/* Goal Modal */}
      {showGoalModal && item && (
        <GoalModal
          items={catalogItems}
          editGoal={goalModalEditGoal}
          preselectedItem={item}
          preselectedScoreType={goalModalScoreType}
          weightUnit={settings.weightUnit}
          onSave={handleSaveGoal}
          onClose={() => setShowGoalModal(false)}
        />
      )}
    </div>
  );
};
