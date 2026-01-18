import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Plus, Trash2, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { useCatalogStore, useCatalogItem } from '../stores/catalogStore';
import { useInitialize } from '../hooks/useInitialize';
import { LogResultModal } from '../components/LogResultModal';
import { PercentageCalculator } from '../components/PercentageCalculator';
import * as db from '../db';
import type { PRLog } from '../types/catalog';

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
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Check if this is a Monostructural Time item (Run, Row)
  const isDistanceBasedItem = item?.category === 'Monostructural' && item?.scoreType === 'Time';

  // Fetch logs for this item
  useEffect(() => {
    const fetchLogs = async () => {
      if (!id || !isInitialized) return;
      
      setIsLoading(true);
      try {
        const itemLogs = await db.getPRLogsForItem(id);
        setLogs(itemLogs);
        
        // For distance-based items, get best PRs grouped by distance
        if (isDistanceBasedItem) {
          const bestsByDist = await db.getBestPRsByDistance(id);
          setBestByDistance(bestsByDist);
          // Set the overall best (lowest time across all distances) for general display
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
          const best = await db.getBestPR(id);
          setBestLog(best ?? null);
        }
      } catch (error) {
        console.error('[ItemDetail] Error fetching logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [id, isInitialized, isDistanceBasedItem]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleFavoriteClick = async () => {
    if (id) {
      await toggleFavorite(id);
    }
  };

  const refreshLogs = async () => {
    const itemLogs = await db.getPRLogsForItem(id!);
    setLogs(itemLogs);
    
    if (isDistanceBasedItem) {
      const bestsByDist = await db.getBestPRsByDistance(id!);
      setBestByDistance(bestsByDist);
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
      const best = await db.getBestPR(id!);
      setBestLog(best ?? null);
    }
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
        ) : isDistanceBasedItem && sortedDistances.length > 0 ? (
          // Show best PRs grouped by distance for Monostructural Time items
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
        ) : logs.length > 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            {logs.map((log, index) => {
              // Check if this log is a PR (either overall or for its specific distance)
              const isPR = isDistanceBasedItem && log.distance !== undefined
                ? bestByDistance.get(log.distance)?.id === log.id
                : log.id === bestLog?.id;
              
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
