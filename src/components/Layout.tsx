import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Settings, Home, Search } from 'lucide-react';

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
            className="p-2 rounded-lg hover:bg-[var(--color-surface-elevated)] transition-colors"
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
      <nav className="sticky bottom-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-4 py-2 sm:hidden">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <button
            onClick={handleHomeClick}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              isActive('/') ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
            }`}
            aria-label="Home"
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={handleSearchClick}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              isActive('/search') ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
            }`}
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
            <span className="text-xs">Search</span>
          </button>
          <button
            onClick={handleSettingsClick}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              isActive('/settings') ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
            }`}
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
