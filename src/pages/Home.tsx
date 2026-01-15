import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Star, Clock, Plus } from 'lucide-react';

// Placeholder data - will be replaced with real data from IndexedDB
const MOCK_AUTOCOMPLETE = [
  { id: '1', name: 'Fran', category: 'Benchmark', scoreType: 'Time' },
  { id: '2', name: 'Back Squat', category: 'Lift', scoreType: 'Load' },
  { id: '3', name: 'Row 2k', category: 'Monostructural', scoreType: 'Time' },
  { id: '4', name: 'Pull-ups Max', category: 'Skill', scoreType: 'Reps' },
];

const MOCK_FAVORITES = [
  { id: '1', name: 'Fran' },
  { id: '2', name: 'Back Squat 1RM' },
  { id: '3', name: 'Grace' },
];

const MOCK_RECENT_LOGS = [
  { id: '1', itemName: 'Fran', result: '4:32', variant: 'Rx', date: 'Jan 13, 2026' },
  { id: '2', itemName: 'Clean 1RM', result: '100kg', variant: null, date: 'Jan 10, 2026' },
  { id: '3', itemName: 'Cindy', result: '18+5', variant: 'Scaled', date: 'Jan 8, 2026' },
];

export const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const filteredItems = searchQuery
    ? MOCK_AUTOCOMPLETE.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : MOCK_AUTOCOMPLETE;

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Benchmark':
        return 'text-amber-400';
      case 'Lift':
        return 'text-blue-400';
      case 'Monostructural':
        return 'text-green-400';
      case 'Skill':
        return 'text-purple-400';
      default:
        return 'text-[var(--color-text-muted)]';
    }
  };

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
        {showAutocomplete && (
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
        <div className="flex flex-wrap gap-2">
          {MOCK_FAVORITES.map((item) => (
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
      </section>

      {/* Recent logs section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Recent Logs
          </h2>
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          {MOCK_RECENT_LOGS.map((log, index) => (
            <button
              key={log.id}
              onClick={() => handleItemClick(log.id)}
              className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface-elevated)] transition-colors text-left ${
                index !== MOCK_RECENT_LOGS.length - 1 ? 'border-b border-[var(--color-border)]' : ''
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
