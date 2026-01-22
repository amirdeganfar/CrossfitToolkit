import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import type { CatalogItem } from '../../types/catalog';

interface ItemSelectorProps {
  items: CatalogItem[];
  value: CatalogItem | null;
  onChange: (item: CatalogItem | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const ItemSelector = ({
  items,
  value,
  onChange,
  placeholder = 'Search items...',
  disabled = false,
  className = '',
}: ItemSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter items based on search
  const filteredItems = search
    ? items.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.aliases?.some((alias) =>
            alias.toLowerCase().includes(search.toLowerCase())
          )
      )
    : items;

  // Group items by category
  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      const category = item.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, CatalogItem[]>
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (item: CatalogItem) => {
    onChange(item);
    setSearch('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected value or search input */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg cursor-pointer transition-colors ${
          isOpen ? 'border-[var(--color-primary)]' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--color-text-muted)]'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select an item"
      >
        <Search size={18} className="text-[var(--color-text-muted)] flex-shrink-0" />

        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={`flex-1 truncate ${
              value ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
            }`}
          >
            {value?.name || placeholder}
          </span>
        )}

        {value && !isOpen ? (
          <button
            onClick={handleClear}
            className="p-0.5 hover:bg-[var(--color-surface-elevated)] rounded"
            aria-label="Clear selection"
          >
            <X size={16} className="text-[var(--color-text-muted)]" />
          </button>
        ) : (
          <ChevronDown
            size={18}
            className={`text-[var(--color-text-muted)] transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg"
          role="listbox"
        >
          {filteredItems.length === 0 ? (
            <div className="px-3 py-4 text-center text-[var(--color-text-muted)] text-sm">
              No items found
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category}>
                <div className="px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] bg-[var(--color-bg)] sticky top-0">
                  {category}
                </div>
                {categoryItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full px-3 py-2 text-left hover:bg-[var(--color-surface-elevated)] transition-colors ${
                      value?.id === item.id
                        ? 'bg-[var(--color-surface-elevated)] text-[var(--color-primary)]'
                        : 'text-[var(--color-text)]'
                    }`}
                    role="option"
                    aria-selected={value?.id === item.id}
                  >
                    <div className="font-medium">{item.name}</div>
                    {item.subCategory && (
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {item.subCategory}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
