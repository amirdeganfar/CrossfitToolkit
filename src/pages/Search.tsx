import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Loader2, Dumbbell, Timer, Activity, Repeat } from 'lucide-react';
import { useCatalogStore } from '../stores/catalogStore';
import { useInitialize } from '../hooks/useInitialize';
import { PlateBadge } from '../components/PlateBadge';
import { categoryColorVar } from '../utils/categoryColors';
import type { Category } from '../types/catalog';

const CATEGORIES: (Category | 'All')[] = ['All', 'Benchmark', 'Lift', 'Monostructural', 'Skill'];

const GLYPH: Record<Category, typeof Dumbbell> = {
  Lift: Dumbbell,
  Benchmark: Timer,
  Monostructural: Activity,
  Skill: Repeat,
  Custom: Dumbbell,
};

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

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <h1 className="font-display-black text-[30px] text-[var(--color-text)]">Catalog</h1>

      {/* Search input — dark field */}
      <div className="relative">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="Search benchmarks, lifts, skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] pl-10 pr-4 py-3 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          aria-label="Search catalog"
          autoFocus
        />
      </div>

      {/* Category filters — pill chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {CATEGORIES.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-transform active:scale-95 border ${
                isActive
                  ? 'bg-[var(--color-primary)] text-[var(--color-bg)] border-transparent'
                  : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-strong)]'
              }`}
              aria-label={`Filter by ${category}`}
              aria-pressed={isActive}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <div className="label-eyebrow">
        {filteredItems.length} {filteredItems.length === 1 ? 'Item' : 'Items'}
        {selectedCategory !== 'All' && ` · ${selectedCategory}`}
      </div>

      {/* Catalog list — plate cards */}
      {filteredItems.length > 0 ? (
        <div>
          {filteredItems.map((item) => {
            const Icon = GLYPH[item.category] ?? Dumbbell;
            return (
              <div
                key={item.id}
                className="relative flex items-center gap-[14px] w-full rounded-2xl mb-[10px] px-[14px] py-[13px] transition-transform active:scale-[0.98]"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                {/* full-card tap target for navigation (sibling to the favorite button, not a parent) */}
                <button
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  className="absolute inset-0 rounded-2xl"
                  aria-label={`View ${item.name}`}
                />
                <div className="relative z-10">
                  <PlateBadge
                    category={item.category}
                    favorite={item.isFavorite}
                    onToggleFavorite={() => toggleFavorite(item.id)}
                  >
                    <Icon size={18} />
                  </PlateBadge>
                </div>
                <div className="relative z-10 flex-1 min-w-0 pointer-events-none">
                  <div className="font-display text-base text-[var(--color-text)] truncate">{item.name}</div>
                  <div className="text-xs mt-0.5">
                    <span style={{ color: categoryColorVar(item.category) }}>{item.category}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}> · {item.scoreType}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <Dumbbell className="w-10 h-10 mx-auto mb-3 text-[var(--color-border-strong)]" />
          <p className="font-display text-lg text-[var(--color-text)] mb-1">No results</p>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            {searchQuery
              ? `No match for "${searchQuery}"${selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}`
              : selectedCategory !== 'All'
                ? `No ${selectedCategory} items`
                : 'Catalog empty'}
          </p>
        </div>
      )}
    </div>
  );
};
