import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Plus, Trash2, TrendingUp, TrendingDown, ChevronDown, ChevronRight, Dumbbell, Target, SearchX, ClipboardList } from 'lucide-react';
import { Skeleton, SkeletonRows } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { Stat } from '../components/Stat';
import { haptics } from '../utils/haptics';
import { useCatalogStore, useCatalogItem } from '../stores/catalogStore';
import { useGoalsStore, useActiveGoalsForItem } from '../stores/goalsStore';
import { useInitialize } from '../hooks/useInitialize';
import { LogResultModal } from '../components/LogResultModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PercentageCalculator } from '../components/PercentageCalculator';
import { GoalProgress, GoalModal } from '../components/goals';
import { LoadedBarButton } from '../components/LoadedBarButton';
import { Barbell } from '../components/Barbell';
import { RxTag } from '../components/RxTag';
import { isDualMetricItem, isDistanceOnlyItem } from '../utils/itemMetrics';
import { categoryColorVar } from '../utils/categoryColors';
import {
  getScoreModes,
  getLogScoreType,
  getScoreTypeDef,
  isLowerBetter as scoreIsLowerBetter,
  formatSecondsToTime,
} from '../config/scoreTypes';
import { formatWeight, formatDistance as formatDistanceUnit, formatMeters, convertWeight, convertDistance } from '../utils/units';
import { PRCelebration, type Celebration } from '../components/PRCelebration';
import { PRBadge } from '../components/PRBadge';
import { ResultTrend, type TrendPool, type TrendKind } from '../components/ResultTrend';
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

// Best log of a pool, compared unit-independently (kg / meters / raw).
const pickBest = (logs: PRLog[], scoreType: ScoreType, lowerIsBetter: boolean): PRLog =>
  logs.reduce((best, curr) => {
    const c = db.getComparableValue(curr, scoreType);
    const b = db.getComparableValue(best, scoreType);
    return (lowerIsBetter ? c < b : c > b) ? curr : best;
  });

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
    const bestLog = pickBest(groupLogs, st, lowerIsBetter);
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
    // Compare in one unit — logs may have been saved in kg or lb.
    const bestLog = pickBest(groupLogs, 'Load', false);
    const sorted = [...groupLogs].sort((a, b) => {
      if (a.id === bestLog.id) return -1;
      if (b.id === bestLog.id) return 1;
      return b.date - a.date;
    });
    result.push({ key: reps, label: `${reps}RM`, type: 'reps', logs: sorted, bestLog });
  });
  return result;
};

const groupLogsByVariant = (logs: PRLog[], scoreType: ScoreType): LogGroup[] => {
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
    const bestLog = pickBest(groupLogs, scoreType, scoreIsLowerBetter(scoreType));
    const sorted = [...groupLogs].sort((a, b) => {
      if (a.id === bestLog.id) return -1;
      if (b.id === bestLog.id) return 1;
      return b.date - a.date;
    });
    result.push({ key: variant, label: variant, type: 'variant', logs: sorted, bestLog });
  });
  return result;
};

interface LogsAndBests {
  logs: PRLog[];
  bestLog: PRLog | null;
  bestByDistance: Map<number, PRLog>;
  bestByCalories: Map<number, PRLog>;
}

// Load an item's logs and per-pool bests. For dual-metric / distance items there
// is no single meaningful "best" across pools, so bestLog is null there.
const loadLogsAndBests = async (itemId: string, isDual: boolean, isDistanceOnly: boolean): Promise<LogsAndBests> => {
  const logs = await db.getPRLogsForItem(itemId);
  if (isDual) {
    const [bestByDistance, bestByCalories] = await Promise.all([
      db.getBestPRsByDistance(itemId),
      db.getBestPRsByCalories(itemId),
    ]);
    return { logs, bestLog: null, bestByDistance, bestByCalories };
  }
  if (isDistanceOnly) {
    const bestByDistance = await db.getBestPRsByDistance(itemId);
    return { logs, bestLog: null, bestByDistance, bestByCalories: new Map() };
  }
  const best = await db.getBestPR(itemId);
  return { logs, bestLog: best ?? null, bestByDistance: new Map(), bestByCalories: new Map() };
};

// Best log id per pool (global, distance, calories, score type, rep scheme,
// variant). Used to detect a new PR after a save by comparing before/after.
const bestIdsByPool = (data: LogsAndBests, item: CatalogItem, isDual: boolean, isDistanceOnly: boolean): Map<string, string> => {
  const ids = new Map<string, string>();
  if (data.bestLog) ids.set('best', data.bestLog.id);
  data.bestByDistance.forEach((l, k) => ids.set(`d:${k}`, l.id));
  data.bestByCalories.forEach((l, k) => ids.set(`c:${k}`, l.id));
  if (isDual || isDistanceOnly || data.logs.length === 0) return ids;
  if (getScoreModes(item).length > 1) {
    groupLogsByScoreType(data.logs, item).forEach((g) => ids.set(`st:${g.key}`, g.bestLog.id));
  } else if (item.category === 'Lift' && item.scoreType === 'Load') {
    groupLogsByReps(data.logs).forEach((g) => ids.set(`r:${g.key}`, g.bestLog.id));
  } else {
    groupLogsByVariant(data.logs, item.scoreType).forEach((g) => ids.set(`v:${g.key}`, g.bestLog.id));
  }
  return ids;
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
  const goalsCheckOnNewPR = useGoalsStore((s) => s.checkGoalsOnNewPR);
  // All active goals for this item — one per score pool / distance / rep scheme.
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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const clearCelebration = useCallback(() => setCelebration(null), []);

  // Goal display units come from stored settings; the catalog store reloads
  // goals itself when the unit changes.
  useEffect(() => {
    if (isInitialized && !goalsIsInitialized && catalogItems.length > 0) {
      goalsInitialize(catalogItems);
    }
  }, [isInitialized, goalsIsInitialized, catalogItems, goalsInitialize]);

  const isDual = isDualMetricItem(item);
  const isDistanceOnly = isDistanceOnlyItem(item);
  const hasItem = item != null;

  const applyLogsAndBests = (data: LogsAndBests) => {
    setLogs(data.logs);
    setBestLog(data.bestLog);
    setBestByDistance(data.bestByDistance);
    setBestByCalories(data.bestByCalories);
  };

  // Depend on the item id (not the item object, which changes on favorite toggle)
  // and ignore responses for a previous item.
  useEffect(() => {
    if (!id || !isInitialized || !hasItem) return;
    let cancelled = false;
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const data = await loadLogsAndBests(id, isDual, isDistanceOnly);
        if (cancelled) return;
        setLogs(data.logs);
        setBestLog(data.bestLog);
        setBestByDistance(data.bestByDistance);
        setBestByCalories(data.bestByCalories);
      } catch (error) {
        console.error('[ItemDetail] Error fetching logs:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchLogs();
    return () => {
      cancelled = true;
    };
  }, [id, isInitialized, hasItem, isDual, isDistanceOnly]);

  const handleBack = () => navigate(-1);

  const handleFavoriteClick = async () => {
    if (id) await toggleFavorite(id);
  };

  const refreshLogs = async () => {
    if (!id || !item) return;
    applyLogsAndBests(await loadLogsAndBests(id, isDual, isDistanceOnly));
  };

  const handleDeleteLog = (logId: string) => setDeleteLogId(logId);

  const confirmDeleteLog = async () => {
    if (!deleteLogId) return;
    setDeleteError(null);
    try {
      await deletePRLog(deleteLogId);
      await refreshLogs();
      if (goalsIsInitialized) {
        await goalsRefresh(catalogItems);
      }
    } catch (error) {
      console.error('[ItemDetail] Error deleting log:', error);
      setDeleteError('Failed to delete log. Please try again.');
    } finally {
      setDeleteLogId(null);
    }
  };

  const handleModalSuccess = async (savedLog: PRLog) => {
    if (!id || !item) return;
    const beforeLogs = logs;
    const before = bestIdsByPool({ logs, bestLog, bestByDistance, bestByCalories }, item, isDual, isDistanceOnly);
    try {
      const data = await loadLogsAndBests(id, isDual, isDistanceOnly);
      applyLogsAndBests(data);
      // New PR = a pool that already had a best now has a different one.
      // Prefer a specific pool (rep scheme, variant…) over the item-wide 'best'.
      const after = bestIdsByPool(data, item, isDual, isDistanceOnly);
      const changed = [...before].filter(([pool, logId]) => after.has(pool) && after.get(pool) !== logId);
      const [prPool, prevId] = changed.find(([pool]) => pool !== 'best') ?? changed[0] ?? [];
      if (prPool) haptics.pr();

      const achieved = await goalsCheckOnNewPR(savedLog, item);
      if (achieved.length > 0) haptics.goal();
      else if (goalsIsInitialized) await goalsRefresh(catalogItems);

      const newLog = prPool ? data.logs.find((l) => l.id === after.get(prPool)) : undefined;
      const prevLog = prevId ? beforeLogs.find((l) => l.id === prevId) : undefined;
      if (prPool && newLog) {
        setCelebration(buildCelebration(prPool, newLog, prevLog, achieved[0]?.targetResult));
      } else if (achieved.length > 0) {
        setCelebration({
          id: Date.now(),
          isPR: false,
          goalTarget: achieved[0].targetResult,
          itemName: item.name,
          value: formatLogResult(savedLog, getLogScoreType(savedLog, item)),
        });
      }
    } catch (error) {
      console.error('[ItemDetail] Error refreshing after save:', error);
    }
  };

  // Score type a best-pool key compares by (see bestIdsByPool).
  const poolScoreType = (pool: string): ScoreType => {
    if (pool.startsWith('st:')) return pool.slice(3, pool.indexOf(':', 3)) as ScoreType;
    if (pool.startsWith('r:')) return 'Load';
    if (pool.startsWith('d:')) return 'Time';
    if (pool.startsWith('c:')) return 'Calories';
    return item?.scoreType ?? 'Time';
  };

  // A log's value as shown for its pool (matches the history/PB rows).
  const poolValue = (pool: string, log: PRLog): string => {
    if (pool.startsWith('d:')) return log.result.includes(' in ') ? log.result.split(' in ')[1] : log.result;
    if (pool.startsWith('c:')) return `${log.calories} cal`;
    if (pool.startsWith('r:')) return formatWeight(log.resultValue, log.unit, settings.weightUnit);
    if (pool.startsWith('st:')) return getScoreTypeResult(log, poolScoreType(pool));
    return formatLogResult(log);
  };

  const poolContext = (pool: string, log: PRLog): string | undefined => {
    const key = pool.slice(pool.indexOf(':') + 1);
    if (pool.startsWith('r:')) return `${key}RM`;
    if (pool.startsWith('d:')) return formatDistance(Number(key));
    if (pool.startsWith('c:')) return `In ${formatSecondsToTime(Number(key))}`;
    if (pool.startsWith('st:')) return scoreTypeGroupLabel(poolScoreType(pool), log);
    if (pool.startsWith('v:') && key !== 'Unspecified') return key;
    return undefined;
  };

  // "+10 kg", "−0:12", "+2 reps" — undefined where a difference isn't meaningful.
  const improvementText = (pool: string, next: PRLog, prev: PRLog): string | undefined => {
    const r1 = (n: number) => Math.round(n * 10) / 10;
    if (pool.startsWith('c:')) return `+${r1((next.calories ?? 0) - (prev.calories ?? 0))} cal`;
    switch (poolScoreType(pool)) {
      case 'Load': {
        const wu = settings.weightUnit;
        return `+${r1(convertWeight(next.resultValue, next.unit, wu) - convertWeight(prev.resultValue, prev.unit, wu))}${wu}`;
      }
      case 'Distance': {
        const du = settings.distanceUnit;
        return `+${Math.round(convertDistance(next.resultValue, next.distanceUnit, du) - convertDistance(prev.resultValue, prev.distanceUnit, du))}${du}`;
      }
      case 'Time':
      case 'TimeForReps':
        return `−${formatSecondsToTime(prev.resultValue - next.resultValue)}`;
      case 'Reps':
      case 'RepsInTime':
        return `+${r1(next.resultValue - prev.resultValue)} reps`;
      case 'Calories':
        return `+${r1(next.resultValue - prev.resultValue)} cal`;
      default:
        return undefined; // Rounds+Reps: a "+N" in raw reps reads ambiguously
    }
  };

  const buildCelebration = (pool: string, next: PRLog, prev: PRLog | undefined, goalTarget?: string): Celebration => ({
    id: Date.now(),
    isPR: true,
    goalTarget,
    itemName: item?.name ?? '',
    context: poolContext(pool, next),
    value: poolValue(pool, next),
    improvement: prev ? improvementText(pool, next, prev) : undefined,
    previous: prev ? poolValue(pool, prev) : undefined,
  });

  const handleSaveGoal = async (input: CreateGoalInput | { id: string; updates: UpdateGoalInput }) => {
    if ('id' in input) {
      await goalsUpdateGoal(input.id, input.updates, catalogItems);
    } else {
      await goalsAddGoal(input, catalogItems);
    }
  };

  const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Display a log's result in the current settings units. Load/Distance values are
  // converted from the unit stored on the log, so a suffix is printed exactly once.
  const formatLogResult = (log: PRLog, scoreType: ScoreType | undefined = item?.scoreType): string => {
    const { result } = log;
    if (!item || !scoreType) return result;
    if (scoreType === 'Load') {
      // Keep any "1RM @ " / "5 reps @ " prefix, re-render the weight.
      const at = result.lastIndexOf('@ ');
      const prefix = at >= 0 ? result.slice(0, at + 2) : '';
      return `${prefix}${formatWeight(log.resultValue, log.unit, settings.weightUnit)}`;
    }
    if (result.includes('@') || result.includes(' in ') || result.includes('RM')) return result;
    // Other results are already suffixed at save time — only append when missing
    // (avoids "22 reps reps" / "50 cal cal").
    switch (scoreType) {
      case 'Distance': return formatDistanceUnit(log.resultValue, log.distanceUnit, settings.distanceUnit);
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
    return formatLogResult(log, scoreType);
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

  // Pool distances are stored in meters; show them in the user's unit.
  const formatDistance = (meters: number): string => formatMeters(meters, settings.distanceUnit);

  const isLift = item?.category === 'Lift' && item?.scoreType === 'Load';

  // Short label for the pool a goal targets ("5km", "3RM", "Reps in 2:00", "Rx").
  const goalPoolLabel = (goal: GoalWithProgress): string => {
    const parts: string[] = [];
    if (goal.distance !== undefined) parts.push(formatDistance(goal.distance));
    if (goal.scoreTypeId && (useScoreTypeGrouping || isDual)) {
      if (goal.scoreTypeId === 'RepsInTime' && goal.timeCap) parts.push(`Reps in ${formatSecondsToTime(goal.timeCap)}`);
      else if (goal.scoreTypeId === 'TimeForReps' && goal.targetReps) parts.push(`Time for ${goal.targetReps} reps`);
      else parts.push(getScoreTypeDef(goal.scoreTypeId).name);
    }
    if (isLift) parts.push(`${goal.reps ?? 1}RM`);
    if (goal.variant) parts.push(goal.variant);
    return parts.join(' · ');
  };

  const sortedDistances = Array.from(bestByDistance.keys()).sort((a, b) => a - b);
  const sortedCalorieTimes = Array.from(bestByCalories.keys()).sort((a, b) => a - b);

  const getGroupedLogs = (): LogGroup[] => {
    if (isDual || isDistanceOnly) {
      return groupLogs(logs, bestByDistance, bestByCalories, formatDistance);
    } else if (isLift) {
      return groupLogsByReps(logs);
    } else if (logs.length > 0 && item) {
      return groupLogsByVariant(logs, item.scoreType);
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

  // Trend chart pools — one per history group, values in display units.
  const wu = settings.weightUnit;
  const du = settings.distanceUnit;
  const trendValue = (log: PRLog, scoreType: ScoreType): number => {
    if (scoreType === 'Load') return convertWeight(db.getComparableValue(log, 'Load'), 'kg', wu);
    if (scoreType === 'Distance') return convertDistance(db.getComparableValue(log, 'Distance'), 'm', du);
    if (scoreType === 'Rounds+Reps') return log.resultValue / 100;
    return log.resultValue;
  };
  const goalTrendValue = (goal: GoalWithProgress | undefined, scoreType: ScoreType): number | undefined => {
    if (!goal) return undefined;
    if (scoreType === 'Load') return convertWeight(goal.targetValue, goal.unit, wu);
    if (scoreType === 'Distance') return convertDistance(goal.targetValue, goal.distanceUnit, du);
    if (scoreType === 'Rounds+Reps') return goal.targetValue / 100;
    return goal.targetValue;
  };
  const trendKind = (scoreType: ScoreType): TrendKind => {
    switch (scoreType) {
      case 'Load': return 'weight';
      case 'Distance': return 'distance';
      case 'Time':
      case 'TimeForReps': return 'time';
      case 'Rounds+Reps': return 'rr';
      case 'Calories': return 'cal';
      default: return 'reps';
    }
  };
  const makePool = (key: string, label: string, scoreType: ScoreType, poolLogs: PRLog[], goal?: GoalWithProgress): TrendPool => ({
    key,
    label,
    kind: trendKind(scoreType),
    lowerIsBetter: scoreIsLowerBetter(scoreType),
    points: poolLogs.map((l) => ({ id: l.id, date: l.date, value: trendValue(l, scoreType) })),
    goal: goalTrendValue(goal, scoreType),
  });
  const trendPools: TrendPool[] = useScoreTypeGrouping
    ? scoreTypeGroups.map((g) => makePool(`st:${g.key}`, g.label, g.scoreType, g.logs, goalForGroup(g)))
    : groupedLogs.map((g) => {
        const key = `${g.type}:${g.key}`;
        switch (g.type) {
          case 'reps':
            return makePool(key, g.label, 'Load', g.logs, activeGoals.find((goal) => (goal.reps ?? 1) === g.key));
          case 'distance':
            return makePool(key, g.label, 'Time', g.logs, activeGoals.find((goal) => goal.distance === g.key));
          case 'calories':
            return {
              ...makePool(key, `Cal in ${g.label}`, 'Calories', g.logs),
              points: g.logs.map((l) => ({ id: l.id, date: l.date, value: l.calories ?? 0 })),
            };
          case 'variant': {
            const goal = activeGoals.find((gl) => gl.variant === g.key)
              ?? (groupedLogs.length === 1 ? activeGoals.find((gl) => !gl.variant) : undefined);
            return makePool(key, g.label, item?.scoreType ?? 'Time', g.logs, goal);
          }
        }
      });
  // Default to the pool holding the hero PB, else the busiest pool (ResultTrend's fallback).
  const trendDefaultKey = bestLog
    ? trendPools.find((p) => p.points.some((pt) => pt.id === bestLog.id))?.key
    : undefined;

  const getCategoryColor = (category: CatalogItem['category']) => categoryColorVar(category);

  // One goal's progress. Direction comes from the goal's own score type.
  const renderGoal = (goal: GoalWithProgress, label?: string) => (
    <div key={goal.id}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)] num">
          <Target size={12} className="text-[var(--color-text-muted)]" />
          <span>{label ? `${label} goal` : 'Goal'}: {goal.targetResult}</span>
        </div>
        <button onClick={() => openGoalModal(goal, goal.scoreTypeId ?? null)} className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          Edit
        </button>
      </div>
      {goal.currentValue != null ? (
        <Barbell
          current={goal.currentValue}
          goal={goal.targetValue}
          lowerIsBetter={scoreIsLowerBetter(goal.scoreTypeId ?? item?.scoreType ?? 'Time')}
        />
      ) : (
        <GoalProgress progress={goal.progress} size="sm" />
      )}
      <p className="t-caption num mt-1">
        {goal.daysRemaining >= 0 ? `${goal.daysRemaining}d left` : 'Overdue'}
      </p>
    </div>
  );

  // All active goals for the item (single-pool, dual-metric and distance layouts).
  // Pool labels are shown whenever they disambiguate.
  const activeGoalBlock = activeGoals.length > 0 ? (
    <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-3">
      {activeGoals.map((g) => renderGoal(g, activeGoals.length > 1 || g.distance !== undefined ? goalPoolLabel(g) : undefined))}
    </div>
  ) : null;

  // Multi-pool items (lift rep schemes, distances, variants) can hold several goals.
  const canAddGoal = activeGoals.length === 0 || isDual || isDistanceOnly || isLift;

  // Multi-mode: goals whose pool has no logs yet, and the first mode still without a goal.
  const orphanGoals = useScoreTypeGrouping
    ? activeGoals.filter((g) => !scoreTypeGroups.some((group) => goalForGroup(group)?.id === g.id))
    : [];
  const modeWithoutGoal = scoreModes.find(
    (mode) => !activeGoals.some((g) => (g.scoreTypeId ?? item?.scoreType) === mode)
  );

  const backBtn = 'w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-elevated)]';

  const pbSkeleton = (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-14 w-40" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
  const historySkeleton = <SkeletonRows count={3} withBadge={false} label="Loading history" />;

  // Hero PB: "1RM @ 100kg" → small "1RM" caption over a big "100kg".
  const heroFull = bestLog ? formatLogResult(bestLog) : '';
  const heroAt = heroFull.lastIndexOf('@ ');
  const heroPrefix = heroAt >= 0 ? heroFull.slice(0, heroAt).trim() : '';
  const heroValue = heroAt >= 0 ? heroFull.slice(heroAt + 2) : heroFull;

  if (!isInitialized || isInitializing) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-44" />
          </div>
        </div>
        {pbSkeleton}
        {historySkeleton}
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <button onClick={handleBack} className={backBtn} aria-label="Go back">
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
          <h1 className="t-title">Not found</h1>
        </div>
        <EmptyState
          icon={SearchX}
          message="This item isn't in your catalog anymore."
          action={{ label: 'Browse the catalog', onClick: () => navigate('/search') }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={handleBack} className={backBtn} aria-label="Go back">
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
          <div className="min-w-0">
            <p
              className="text-[12px] font-semibold mb-0.5"
              style={{ color: getCategoryColor(item.category) }}
            >
              {item.category} <span className="text-[var(--color-text-muted)]">· {scoreModes.length > 1 ? 'Multi-score' : getScoreTypeDef(item.scoreType).name}</span>
            </p>
            <h1 className="t-title">{item.name}</h1>
          </div>
        </div>
        <button
          onClick={handleFavoriteClick}
          className={`${backBtn} shrink-0 ${
            item.isFavorite ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
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
                  <span className="text-[15px] font-semibold text-[var(--color-text)] num">{item.description}</span>
                </div>
              )}
              <ul className={`space-y-1 ${item.description ? 'pl-5' : 'pl-0'}`}>
                {item.movements.map((movement, idx) => (
                  <li key={idx} className="text-xs text-[var(--color-text-muted)] flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-[var(--color-text-dim)] shrink-0 mt-0.5" />
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
                  <span className="text-[15px] font-semibold text-[var(--color-text)] num">{format}</span>
                </div>
                <ul className="space-y-1 pl-5">
                  {movements.map((movement, idx) => (
                    <li key={idx} className="text-xs text-[var(--color-text-muted)] flex items-start gap-2">
                      <ChevronRight className="w-3 h-3 text-[var(--color-text-dim)] shrink-0 mt-0.5" />
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

      {/* Personal best — hero stat card */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isLowerBetter ? (
              <TrendingDown className="w-3.5 h-3.5 text-[var(--color-success)]" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 text-[var(--color-success)]" />
            )}
            <h2 className="t-section">Personal best</h2>
          </div>
          {canAddGoal && !useScoreTypeGrouping && logs.length > 0 && (
            <button
              onClick={() => openGoalModal(null, null)}
              className="flex items-center gap-1 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <Target size={11} />
              Set goal
            </button>
          )}
        </div>

        {isLoading ? (
          pbSkeleton
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
                        <span className="text-[13px] font-medium text-[var(--color-text-muted)] num">{group.label}</span>
                      </div>
                      <div className="text-right">
                        <Stat text={getScoreTypeResult(group.bestLog, group.scoreType)} size="lg" tone="primary" />
                        <p className="t-caption num mt-1">{formatDate(group.bestLog.date)}</p>
                      </div>
                    </div>
                    {groupGoal ? (
                      <div className="pl-5">{renderGoal(groupGoal)}</div>
                    ) : (
                      <button
                        onClick={() => openGoalModal(null, group.scoreType)}
                        className="pl-5 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      >
                        <Target size={11} />
                        Set goal
                      </button>
                    )}
                  </div>
                );
              })}
              {orphanGoals.length > 0 && (
                <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
                  {orphanGoals.map((g) => renderGoal(g, goalPoolLabel(g)))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="t-body text-[var(--color-text-muted)]">No results yet</p>
              {modeWithoutGoal && (
                <button onClick={() => openGoalModal(null, modeWithoutGoal)} className="mt-2 flex items-center gap-1.5 min-h-[36px] text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                  <Target size={13} />
                  Set a goal
                </button>
              )}
              {orphanGoals.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-3">
                  {orphanGoals.map((g) => renderGoal(g, goalPoolLabel(g)))}
                </div>
              )}
            </div>
          )
        ) : isDual && (sortedDistances.length > 0 || sortedCalorieTimes.length > 0) ? (
          <div className="space-y-3">
            {sortedDistances.length > 0 && (
              <div className="space-y-2">
                <p className="t-caption">By distance</p>
                {sortedDistances.map((distanceMeters) => {
                  const pr = bestByDistance.get(distanceMeters);
                  if (!pr) return null;
                  return (
                    <div key={distanceMeters} className="flex items-baseline justify-between">
                      <span className="text-[13px] font-medium text-[var(--color-text-muted)] num">{formatDistance(distanceMeters)}</span>
                      <div className="text-right">
                        <Stat text={pr.result.includes(' in ') ? pr.result.split(' in ')[1] : pr.result} size="lg" tone="primary" />
                        <p className="t-caption num mt-1">{formatDate(pr.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {sortedCalorieTimes.length > 0 && (
              <div className="space-y-2">
                <p className="t-caption">By time</p>
                {sortedCalorieTimes.map((timeSeconds) => {
                  const pr = bestByCalories.get(timeSeconds);
                  if (!pr) return null;
                  const mins = Math.floor(timeSeconds / 60);
                  const secs = timeSeconds % 60;
                  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
                  return (
                    <div key={timeSeconds} className="flex items-baseline justify-between">
                      <span className="text-[13px] font-medium text-[var(--color-text-muted)] num">{timeStr}</span>
                      <div className="text-right">
                        <Stat value={pr.calories} unit="cal" size="lg" tone="primary" />
                        <p className="t-caption num mt-1">{formatDate(pr.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeGoalBlock}
          </div>
        ) : isDistanceOnly && sortedDistances.length > 0 ? (
          <div className="space-y-3">
            {sortedDistances.map((distanceMeters) => {
              const pr = bestByDistance.get(distanceMeters);
              if (!pr) return null;
              return (
                <div key={distanceMeters} className="flex items-baseline justify-between">
                  <span className="text-[13px] font-medium text-[var(--color-text-muted)] num">{formatDistance(distanceMeters)}</span>
                  <div className="text-right">
                    <Stat text={pr.result.includes(' in ') ? pr.result.split(' in ')[1] : pr.result} size="lg" tone="primary" />
                    <p className="t-caption num mt-1">{formatDate(pr.date)}</p>
                  </div>
                </div>
              );
            })}
            {activeGoalBlock}
          </div>
        ) : bestLog ? (
          <div>
            {heroPrefix && <p className="t-caption num mb-1">{heroPrefix}</p>}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Stat text={heroValue} size="hero" tone="primary" />
              <RxTag variant={bestLog.variant} />
            </div>
            <p className="t-caption num mt-1">
              {formatDate(bestLog.date)}
            </p>
            {activeGoalBlock}
          </div>
        ) : (
          <div>
            <p className="t-body text-[var(--color-text-muted)]">No results yet</p>
            {canAddGoal && (
              <button onClick={() => openGoalModal(null, null)} className="mt-2 flex items-center gap-1.5 min-h-[36px] text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <Target size={13} />
                Set a goal
              </button>
            )}
            {activeGoalBlock}
          </div>
        )}
      </div>

      {/* Results trend (hidden until a pool has 2+ results) */}
      {!isLoading && (
        <ResultTrend
          itemName={item.name}
          pools={trendPools}
          defaultKey={trendDefaultKey}
          weightUnit={settings.weightUnit}
          distanceUnit={settings.distanceUnit}
        />
      )}

      {/* Percentage Calculator */}
      {item.category === 'Lift' && item.scoreType === 'Load' && (
        <PercentageCalculator logs={logs} weightUnit={settings.weightUnit} />
      )}

      {/* History section */}
      <section>
        {deleteError && (
          <div className="mb-2 px-1 py-2 border-l-2 border-[var(--color-danger)]">
            <p className="text-[13px] font-medium text-[var(--color-danger)]">{deleteError}</p>
          </div>
        )}
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-[var(--color-border)]">
          <h2 className="t-section">History</h2>
          <span className="t-caption num">{logs.length} {logs.length === 1 ? 'log' : 'logs'}</span>
        </div>

        {isLoading ? (
          historySkeleton
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
                      className="w-[calc(100%+1rem)] flex items-center justify-between py-3 px-2 -mx-2 rounded-md hover:bg-[var(--color-surface)] transition-colors"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-3">
                        <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        <span className="text-[15px] font-semibold text-[var(--color-text)] num">{group.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base font-semibold text-[var(--color-text)] num">{getScoreTypeResult(group.bestLog, group.scoreType)}</span>
                        <span className="text-xs font-semibold text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] rounded-full px-2 py-0.5 num">{group.logs.length}</span>
                      </div>
                    </button>

                    <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
                      <div>
                        {group.logs.map((log, logIndex) => {
                          const isPR = log.id === group.bestLog.id;
                          return (
                            <div
                              key={log.id}
                              className={`flex items-center justify-between py-2.5 pl-8 pr-1 group ${
                                logIndex !== group.logs.length - 1 ? 'border-b border-[var(--color-border)]/50' : ''
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`font-display text-[15px] font-semibold num ${isPR ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text)]'}`}>
                                    {getScoreTypeResult(log, group.scoreType)}
                                  </span>
                                  <RxTag variant={log.variant} />
                                  {isPR && <PRBadge />}
                                </div>
                                <p className="t-caption num">
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
            <EmptyState icon={ClipboardList} message="No results logged yet. Tap Log a result to add your first." />
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
                  case 'reps':     return formatWeight(group.bestLog.resultValue, group.bestLog.unit, settings.weightUnit);
                  case 'variant':  return formatLogResult(group.bestLog);
                }
              };

              return (
                <div key={groupKey}>
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-[calc(100%+1rem)] flex items-center justify-between py-3 px-2 -mx-2 rounded-md hover:bg-[var(--color-surface)] transition-colors"
                      aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      <span className="text-[15px] font-semibold text-[var(--color-text)] num">{group.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-semibold text-[var(--color-text)] num">{getPrDisplayValue()}</span>
                      <span className="text-xs font-semibold text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] rounded-full px-2 py-0.5 num">{group.logs.length}</span>
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
                            case 'reps':     return formatWeight(log.resultValue, log.unit, settings.weightUnit);
                            case 'variant':  return formatLogResult(log);
                          }
                        };

                        return (
                          <div
                            key={log.id}
                            className={`flex items-center justify-between py-2.5 pl-8 pr-1 group ${
                              logIndex !== group.logs.length - 1 ? 'border-b border-[var(--color-border)]/50' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-display text-[15px] font-semibold num ${isPR ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text)]'}`}>
                                  {getDisplayResult()}
                                </span>
                                {group.type !== 'variant' && <RxTag variant={log.variant} />}
                                {isPR && <PRBadge />}
                              </div>
                              <p className="t-caption num">
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
                      <span className={`font-display text-[15px] font-semibold num ${isPR ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text)]'}`}>
                        {formatLogResult(log)}
                      </span>
                      <RxTag variant={log.variant} />
                      {isPR && <PRBadge />}
                    </div>
                    <p className="t-caption num">
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
            <EmptyState icon={ClipboardList} message="No results logged yet. Tap Log a result to add your first." />
        )}
      </section>

      {/* Sticky Log Result CTA */}
      <div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] bg-[var(--color-bg)] border-t border-[var(--color-border)] p-4 -mx-4">
        <LoadedBarButton onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5" /> Log a result
        </LoadedBarButton>
      </div>

      {/* Log Result Modal */}
      {showModal && (
        <LogResultModal item={item} onClose={() => setShowModal(false)} onSuccess={handleModalSuccess} />
      )}

      <PRCelebration celebration={celebration} onDone={clearCelebration} />

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
