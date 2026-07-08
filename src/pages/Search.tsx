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

    // Filter by category
    if (selectedCategory !== 'All') {
      items = items.filter((item) => item.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    // Sort: favorites first, then alphabetically
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

  const getCategoryBgColor = (category: Category | 'All', isSelected: boolean) => {
    if (!isSelected) return 'bg-[var(--color-surface)] text-[var(--color-text-muted)]';
    switch (category) {
      case 'All':         return 'bg-[var(--color-primary)] text-white';
      case 'Benchmark':  return 'bg-amber-500/15 text-amber-400';
      case 'Lift':       return 'bg-blue-500/15 text-blue-400';
      case 'Monostructural': return 'bg-green-500/15 text-green-400';
      case 'Skill':      return 'bg-purple-500/15 text-purple-400';
      default:           return 'bg-[var(--color-primary)] text-white';
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
      {/* Search input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="Search benchmarks, lifts, skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border-strong)] pl-10 pr-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors rounded-sm"
          aria-label="Search catalog"
          autoFocus
        />
      </div>

      {/* Category filters — sharp chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 font-display text-xs tracking-widest whitespace-nowrap transition-colors active:scale-95 border ${getCategoryBgColor(
              category,
              selectedCategory === category
            )} ${selectedCategory === category ? 'border-current' : 'border-[var(--color-border-strong)]'}`}
            aria-label={`Filter by ${category}`}
            aria-pressed={selectedCategory === category}
          >
            {category.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="text-xs text-[var(--color-text-muted)] tracking-widest uppercase">
        {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
        {selectedCategory !== 'All' && ` · ${selectedCategory}`}
        {searchQuery && ` · "${searchQuery}"`}
      </div>

      {/* Catalog list */}
      {filteredItems.length > 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              className={`cat-bar cat-bar-${item.category} w-full flex items-center justify-between pl-5 pr-4 py-3.5 hover:bg-[var(--color-surface-elevated)] transition-colors group ${
                index !== filteredItems.length - 1 ? 'border-b border-[var(--color-border)]' : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Favorite star */}
                <button
                  onClick={(e) => handleFavoriteClick(e, item.id)}
                  className={`p-1.5 -m-1.5 transition-colors ${
                    item.isFavorite
                      ? 'text-[var(--color-warning)]'
                      : 'text-[var(--color-border-strong)] hover:text-[var(--color-warning)]'
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
                  <div className="font-medium text-[var(--color-text)] truncate">{item.name}</div>
                  <div className="flex items-center gap-1.5 text-xs mt-0.5">
                    <span className={getCategoryColor(item.category)}>{item.category}</span>
                    <span className="text-[var(--color-text-dim)]">·</span>
                    <span className="text-[var(--color-text-muted)]">{item.scoreType}</span>
                  </div>
                </button>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0 ml-2 opacity-30 group-hover:opacity-80 transition-opacity" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-10 text-center">
          <Dumbbell className="w-10 h-10 mx-auto mb-3 text-[var(--color-border-strong)]" />
          <p className="font-display text-lg text-[var(--color-text)] mb-1">NO RESULTS</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {searchQuery
              ? `No results for "${searchQuery}"${selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}`
              : selectedCategory !== 'All'
                ? `No ${selectedCategory} items in the catalog`
                : 'The catalog is empty'}
          </p>
        </div>
      )}
    </div>
  );
};
