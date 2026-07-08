import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Settings, Home, Search, Timer } from 'lucide-react';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSettingsClick = () => navigate('/settings');
  const handleHomeClick = () => navigate('/');
  const handleSearchClick = () => navigate('/search');
  const handleClockClick = () => navigate('/clock');

  const isActive = (path: string) => location.pathname === path;

  const navBtn = (active: boolean) =>
    `relative flex flex-col items-center gap-1 px-5 py-2 transition-colors border-t-2 ${
      active
        ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
        : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
    }`;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg)] border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1
            className="font-display text-lg tracking-[0.15em] text-[var(--color-text)] cursor-pointer"
            onClick={handleHomeClick}
            role="button"
            tabIndex={0}
            aria-label="Go to home"
            onKeyDown={(e) => e.key === 'Enter' && handleHomeClick()}
          >
            <span className="text-[var(--color-primary)]">CF</span>
            {' '}/ TOOLKIT
          </h1>
          <button
            onClick={handleSettingsClick}
            className="p-2 hover:bg-[var(--color-surface-elevated)] transition-colors active:scale-95"
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

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-40 bg-[var(--color-bg)] border-t border-[var(--color-border)] px-2 pb-safe sm:hidden">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <button
            onClick={handleHomeClick}
            className={navBtn(isActive('/'))}
            aria-label="Home"
            aria-current={isActive('/') ? 'page' : undefined}
          >
            <Home className="w-6 h-6" />
            <span className="font-display text-[9px] tracking-[0.15em]">HOME</span>
          </button>
          <button
            onClick={handleSearchClick}
            className={navBtn(isActive('/search'))}
            aria-label="Search"
            aria-current={isActive('/search') ? 'page' : undefined}
          >
            <Search className="w-6 h-6" />
            <span className="font-display text-[9px] tracking-[0.15em]">SEARCH</span>
          </button>
          <button
            onClick={handleClockClick}
            className={navBtn(isActive('/clock'))}
            aria-label="Clock"
            aria-current={isActive('/clock') ? 'page' : undefined}
          >
            <Timer className="w-6 h-6" />
            <span className="font-display text-[9px] tracking-[0.15em]">CLOCK</span>
          </button>
          <button
            onClick={handleSettingsClick}
            className={navBtn(isActive('/settings'))}
            aria-label="Settings"
            aria-current={isActive('/settings') ? 'page' : undefined}
          >
            <Settings className="w-6 h-6" />
            <span className="font-display text-[9px] tracking-[0.15em]">CONFIG</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
