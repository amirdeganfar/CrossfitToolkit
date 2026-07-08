import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Settings, Home, Search, Timer } from 'lucide-react';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  const handleSearchClick = () => {
    navigate('/search');
  };

  const handleClockClick = () => {
    navigate('/clock');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 
            className="text-xl font-bold text-[var(--color-text)] tracking-tight cursor-pointer"
            onClick={handleHomeClick}
            role="button"
            tabIndex={0}
            aria-label="Go to home"
            onKeyDown={(e) => e.key === 'Enter' && handleHomeClick()}
          >
            CrossfitToolkit
          </h1>
          <button
            onClick={handleSettingsClick}
            className="p-2.5 rounded-xl hover:bg-[var(--color-surface-elevated)] transition-colors active:scale-95"
            aria-label="Open settings"
          >
            <Settings className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom navigation (mobile) */}
      <nav className="sticky bottom-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-2 pt-1 pb-safe sm:hidden">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <button
            onClick={handleHomeClick}
            className={`flex flex-col items-center gap-0.5 px-5 py-2.5 rounded-xl transition-colors ${
              isActive('/') ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]'
            }`}
            aria-label="Home"
            aria-current={isActive('/') ? 'page' : undefined}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button
            onClick={handleSearchClick}
            className={`flex flex-col items-center gap-0.5 px-5 py-2.5 rounded-xl transition-colors ${
              isActive('/search') ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]'
            }`}
            aria-label="Search"
            aria-current={isActive('/search') ? 'page' : undefined}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium">Search</span>
          </button>
          <button
            onClick={handleClockClick}
            className={`flex flex-col items-center gap-0.5 px-5 py-2.5 rounded-xl transition-colors ${
              isActive('/clock') ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]'
            }`}
            aria-label="Clock"
            aria-current={isActive('/clock') ? 'page' : undefined}
          >
            <Timer className="w-5 h-5" />
            <span className="text-[10px] font-medium">Clock</span>
          </button>
          <button
            onClick={handleSettingsClick}
            className={`flex flex-col items-center gap-0.5 px-5 py-2.5 rounded-xl transition-colors ${
              isActive('/settings') ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]'
            }`}
            aria-label="Settings"
            aria-current={isActive('/settings') ? 'page' : undefined}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
