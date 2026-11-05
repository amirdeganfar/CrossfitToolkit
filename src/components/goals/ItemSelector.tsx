import { useState, useRef, useEffect, useId } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import type { CatalogItem } from '../../types/catalog';

interface ItemSelectorProps {
  items: CatalogItem[];
  value: CatalogItem | null;
  onChange: (item: CatalogItem | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Show the X clear button when a value is selected. Default: true. */
  clearable?: boolean;
  /** id of an external label element. */
  labelledBy?: string;
  className?: string;
}

export const ItemSelector = ({
  items,
  value,
  onChange,
  placeholder = 'Search items...',
  disabled = false,
  clearable = true,
  labelledBy,
  className = '',
}: ItemSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-opt-${index}`;

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
  // Flat list in rendered (grouped) order — keyboard navigation indexes into this.
  const orderedItems = Object.values(groupedItems).flat();

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

  // Keep the active option scrolled into view
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    document.getElementById(`${listboxId}-opt-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex, listboxId]);

  const open = () => {
    if (disabled) return;
    setActiveIndex(-1);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setSearch('');
    triggerRef.current?.focus();
  };

  const handleSelect = (item: CatalogItem) => {
    onChange(item);
    close();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen) {
      // Only the trigger opens on key press — not e.g. Enter/Space on the Clear button.
      if (e.target !== triggerRef.current) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        open();
      }
      return;
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        // Don't let the enclosing modal close too.
        e.nativeEvent.stopImmediatePropagation();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, orderedItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && orderedItems[activeIndex]) handleSelect(orderedItems[activeIndex]);
        break;
      case 'Tab':
        // The focused search input unmounts on close; park focus on the trigger
        // first so the browser's Tab moves on from there instead of <body>.
        triggerRef.current?.focus();
        setIsOpen(false);
        setSearch('');
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {/* Selected value or search input */}
      <div
        ref={triggerRef}
        className={`flex items-center gap-2 px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-input-border)] rounded-sm cursor-pointer transition-colors ${
          isOpen ? 'border-[var(--color-primary)]' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--color-input-border-hover)]'}`}
        onClick={() => (isOpen ? close() : open())}
        tabIndex={disabled || isOpen ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-disabled={disabled || undefined}
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : 'Select an item'}
      >
        <Search size={18} className="text-[var(--color-text-muted)] flex-shrink-0" />

        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIndex(-1);
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none"
            onClick={(e) => e.stopPropagation()}
            aria-label="Search items"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
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

        {value && !isOpen && clearable && !disabled ? (
          <button
            type="button"
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
          id={listboxId}
          className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border-strong)] rounded-md shadow-xl"
          role="listbox"
        >
          {orderedItems.length === 0 ? (
            <div className="px-3 py-4 text-center text-[var(--color-text-muted)] text-sm">
              No items found
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} role="group" aria-label={category}>
                <div
                  className="px-3 py-1.5 t-caption font-semibold bg-[var(--color-bg)] sticky top-0"
                  aria-hidden="true"
                >
                  {category}
                </div>
                {categoryItems.map((item) => {
                  const index = orderedItems.indexOf(item);
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={item.id}
                      id={optionId(index)}
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`w-full px-3 py-2 text-left hover:bg-[var(--color-surface-elevated)] transition-colors ${
                        isActive ? 'bg-[var(--color-surface-elevated)]' : ''
                      } ${
                        value?.id === item.id
                          ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text)] font-semibold'
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
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
