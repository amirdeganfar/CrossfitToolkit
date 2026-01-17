import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Star, Clock, Plus, Loader2 } from 'lucide-react';
import { useCatalogStore } from '../stores/catalogStore';
import { useInitialize } from '../hooks/useInitialize';
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

export const Home = () => {
  const navigate = useNavigate();
  const { isInitialized, isLoading } = useInitialize();
  
  // Store state
  const catalogItems = useCatalogStore((state) => state.catalogItems);
  const favorites = useCatalogStore((state) => state.favorites);
  const recentLogs = useCatalogStore((state) => state.recentLogs);
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [recentLogsWithItems, setRecentLogsWithItems] = useState<RecentLogWithItem[]>([]);

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
    const fetchItemNames = async () => {
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
      setRecentLogsWithItems(logsWithItems);
    };

    if (recentLogs.length > 0) {
      fetchItemNames();
    } else {
      setRecentLogsWithItems([]);
    }
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

  return (
    <div className="space-y-6">
      {/* Search bar with autocomplete */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search PR item or benchmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            aria-label="Search PR item or benchmark"
          />
        </div>

        {/* Autocomplete dropdown */}
        {showAutocomplete && filteredItems.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-lg z-10">
            <div className="max-h-64 overflow-y-auto">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface-elevated)] transition-colors text-left"
                  aria-label={`View ${item.name}`}
                >
                  <span className="font-medium text-[var(--color-text)]">{item.name}</span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={getCategoryColor(item.category)}>{item.category}</span>
                    <span className="text-[var(--color-text-muted)]">{item.scoreType}</span>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={handleSeeAllResults}
              className="w-full flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] transition-colors text-[var(--color-primary)]"
              aria-label="See all search results"
            >
              <span>See all results</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Favorites section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Favorites
          </h2>
        </div>
        {favorites.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {favorites.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] hover:border-[var(--color-primary)] transition-colors"
                aria-label={`View ${item.name}`}
              >
                {item.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            No favorites yet. Tap ⭐ on any item to add it here.
          </p>
        )}
      </section>

      {/* Recent logs section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Recent Logs
          </h2>
        </div>
        {recentLogsWithItems.length > 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            {recentLogsWithItems.map((log, index) => (
              <button
                key={log.id}
                onClick={() => handleItemClick(log.itemId)}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface-elevated)] transition-colors text-left ${
                  index !== recentLogsWithItems.length - 1 ? 'border-b border-[var(--color-border)]' : ''
                }`}
                aria-label={`View ${log.itemName} log`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--color-text)] truncate">
                      {log.itemName}
                    </span>
                    <span className="text-[var(--color-text-muted)]">—</span>
                    <span className="text-[var(--color-primary)] font-semibold">{log.result}</span>
                    {log.variant && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">
                        {log.variant}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)]">{log.date}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0 ml-2" />
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 text-center">
            <p className="text-[var(--color-text-muted)]">
              No logs yet. Start tracking your PRs!
            </p>
          </div>
        )}
      </section>

      {/* Log PR button */}
      <button
        onClick={handleLogPR}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] rounded-xl text-white font-semibold transition-colors"
        aria-label="Log a new PR"
      >
        <Plus className="w-5 h-5" />
        <span>Log PR</span>
      </button>
    </div>
  );
};
