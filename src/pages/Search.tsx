import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Dumbbell, Timer, Activity, Repeat } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { Skeleton, SkeletonRows } from '../components/Skeleton';
import { useCatalogStore } from '../stores/catalogStore';
import { useInitialize } from '../hooks/useInitialize';
import { PlateBadge } from '../components/PlateBadge';
import { categoryColorVar } from '../utils/categoryColors';
import { getScoreTypeDef } from '../config/scoreTypes';
import type { Category } from '../types/catalog';

const CATEGORIES: (Category | 'All')[] = ['All', 'Benchmark', 'Lift', 'Monostructural', 'Skill', 'Custom'];

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
        item.description?.toLowerCase().includes(query) ||
        item.aliases?.some((alias) => alias.toLowerCase().includes(query))
      );
    }

    // Copy before sorting — never mutate the store's array in place.
    return [...items].sort((a, b) => {
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
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-12 w-full rounded-md" />
        <div className="flex gap-2">
          {[56, 88, 48, 120].map((w) => <Skeleton key={w} className="h-8 rounded-full" style={{ width: w }} />)}
        </div>
        <SkeletonRows count={6} label="Loading catalog" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <h1 className="t-title">Log</h1>

      {/* Search input — dark field */}
      <div className="relative">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="Search benchmarks, lifts, skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="field w-full !rounded-md pl-10 pr-4 py-3 text-[15px]"
          aria-label="Search catalog"
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
              className={`flex-shrink-0 rounded-full px-4 min-h-[36px] text-[13px] font-semibold whitespace-nowrap border ${
                isActive
                  ? 'chip-selected'
                  : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-strong)] hover:text-[var(--color-text)]'
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
      <div className="t-caption num">
        {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
        {selectedCategory !== 'All' && ` · ${selectedCategory}`}
      </div>

      {/* Catalog list — plate cards */}
      {filteredItems.length > 0 ? (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const Icon = GLYPH[item.category] ?? Dumbbell;
            return (
              <div
                key={item.id}
                className="relative flex items-center gap-3 w-full rounded-lg px-4 py-3 transition-[scale] duration-100 active:scale-[0.97]"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                {/* full-card tap target for navigation (sibling to the favorite button, not a parent) */}
                <button
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  className="absolute inset-0 rounded-lg active:scale-100"
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
                    <span style={{ color: 'var(--color-text-muted)' }}> · {getScoreTypeDef(item.scoreType).name}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={SearchIcon}
          message={
            searchQuery
              ? `Nothing matches "${searchQuery}"${selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}. Try a shorter search.`
              : selectedCategory !== 'All'
                ? `No ${selectedCategory} items yet.`
                : 'The catalog is empty.'
          }
          action={searchQuery || selectedCategory !== 'All' ? { label: 'Clear filters', onClick: () => { setSearchQuery(''); setSelectedCategory('All'); } } : undefined}
        />
      )}
    </div>
  );
};
