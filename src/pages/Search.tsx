import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Star, ChevronRight, Loader2, Dumbbell } from 'lucide-react';
import { useCatalogStore } from '../stores/catalogStore';
import { useInitialize } from '../hooks/useInitialize';
import type { CatalogItem, Category } from '../types/catalog';

const CATEGORIES: (Category | 'All')[] = ['All', 'Benchmark', 'Lift', 'Monostructural', 'Skill'];

export const Search = () => {
  const navigate = useNavigate();
  const { isInitialized, isLoading } = useInitialize();

  // Store state
  const catalogItems = useCatalogStore((state) => state.catalogItems);
  const toggleFavorite = useCatalogStore((state) => state.toggleFavorite);

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');

  // Filter items
  const filteredItems = useMemo(() => {
    let items = catalogItems;

    if (selectedCategory !== 'All') {
      items = items.filter((item) => item.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    return items.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [catalogItems, selectedCategory, searchQuery]);

  const handleItemClick = (itemId: string) => {
    navigate(`/item/${itemId}`);
  };

  const handleFavoriteClick = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    await toggleFavorite(itemId);
  };

  const getCategoryColor = (category: CatalogItem['category']) => {
    switch (category) {
      case 'Benchmark':    return 'text-[#D4FF00]';
      case 'Lift':         return 'text-[#60A5FA]';
      case 'Monostructural': return 'text-[#4ADE80]';
      case 'Skill':        return 'text-[#C084FC]';
      case 'Custom':       return 'text-[#FB923C]';
      default:             return 'text-[var(--color-text-muted)]';
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
    <div className="space-y-4">
      {/* Search input — underline style */}
      <div className="relative">
        <SearchIcon className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="Search benchmarks, lifts, skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-b border-[var(--color-border-strong)] pl-7 pr-4 py-2.5 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors font-display tracking-wider text-sm"
          aria-label="Search catalog"
          autoFocus
        />
      </div>

      {/* Category filters — underline tab style */}
      <div className="flex overflow-x-auto scrollbar-hide border-b border-[var(--color-border)] -mx-4 px-4">
        {CATEGORIES.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                flex-shrink-0 px-3 py-2 font-display text-xs tracking-widest whitespace-nowrap transition-colors border-b-2 -mb-px
                ${isActive
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }
              `}
              aria-label={`Filter by ${category}`}
              aria-pressed={isActive}
            >
              {category.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <div className="font-display text-xs text-[var(--color-text-muted)] tracking-widest">
        {filteredItems.length} {filteredItems.length === 1 ? 'ITEM' : 'ITEMS'}
        {selectedCategory !== 'All' && ` · ${selectedCategory.toUpperCase()}`}
        {searchQuery && ` · "${searchQuery.toUpperCase()}"`}
      </div>

      {/* Catalog list — data table */}
      {filteredItems.length > 0 ? (
        <div className="divide-y divide-[var(--color-border)]">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`cat-bar cat-bar-${item.category} w-full flex items-center justify-between pl-5 pr-3 py-3 hover:bg-[var(--color-surface)] transition-colors group`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Favorite star */}
                <button
                  onClick={(e) => handleFavoriteClick(e, item.id)}
                  className={`p-1.5 -m-1.5 transition-colors ${
                    item.isFavorite
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-border-strong)] hover:text-[var(--color-primary)]'
                  }`}
                  aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-current' : ''}`} />
                </button>

                {/* Item info */}
                <button
                  onClick={() => handleItemClick(item.id)}
                  className="flex-1 min-w-0 text-left"
                  aria-label={`View ${item.name}`}
                >
                  <div className="font-display text-sm text-[var(--color-text)] truncate tracking-wide">{item.name}</div>
                  <div className="flex items-center gap-1.5 text-xs mt-0.5">
                    <span className={getCategoryColor(item.category)}>{item.category.toUpperCase()}</span>
                    <span className="text-[var(--color-text-dim)]">·</span>
                    <span className="text-[var(--color-text-muted)]">{item.scoreType}</span>
                  </div>
                </button>
              </div>
              <button
                onClick={() => handleItemClick(item.id)}
                className="p-1"
                aria-hidden="true"
                tabIndex={-1}
              >
                <ChevronRight className="w-4 h-4 text-[var(--color-text-dim)] opacity-50 group-hover:opacity-100 group-hover:text-[var(--color-primary)] transition-all" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center border-t border-[var(--color-border)]">
          <Dumbbell className="w-10 h-10 mx-auto mb-3 text-[var(--color-border-strong)]" />
          <p className="font-display text-lg text-[var(--color-text)] mb-1 tracking-[0.2em]">NO RESULTS</p>
          <p className="text-xs text-[var(--color-text-muted)] font-display tracking-widest">
            {searchQuery
              ? `NO MATCH FOR "${searchQuery.toUpperCase()}"${selectedCategory !== 'All' ? ` IN ${selectedCategory.toUpperCase()}` : ''}`
              : selectedCategory !== 'All'
                ? `NO ${selectedCategory.toUpperCase()} ITEMS`
                : 'CATALOG EMPTY'}
          </p>
        </div>
      )}
    </div>
  );
};
