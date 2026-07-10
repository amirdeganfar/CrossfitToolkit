import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Settings, Home, Search, Timer, Target } from 'lucide-react';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSettingsClick = () => navigate('/settings');
  const handleHomeClick = () => navigate('/');
  const handleSearchClick = () => navigate('/search');
  const handleClockClick = () => navigate('/clock');
  const handleGoalsClick = () => navigate('/goals');

  const isActive = (path: string) => location.pathname === path;

  const navBtn = (active: boolean) =>
    `flex flex-col items-center gap-1 px-4 py-2 transition-colors active:scale-95 ${
      active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)]'
    }`;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Header — clean Blackout wordmark */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/90 backdrop-blur border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1
            className="font-display-black text-[19px] text-[var(--color-text)] cursor-pointer tracking-[-0.02em]"
            onClick={handleHomeClick}
            role="button"
            tabIndex={0}
            aria-label="Go to home"
            onKeyDown={(e) => e.key === 'Enter' && handleHomeClick()}
          >
            <span className="text-[var(--color-primary)]">CF</span> Toolkit
          </h1>
          <button
            onClick={handleSettingsClick}
            className="w-9 h-9 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center transition-transform active:scale-95"
            aria-label="Open settings"
          >
            <Settings className="w-[18px] h-[18px] text-[var(--color-text)]" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="mat-texture flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom navigation — Blackout tab bar (yellow active) */}
      <nav className="sticky bottom-0 z-40 bg-[var(--color-bg)]/95 backdrop-blur border-t border-[var(--color-border-strong)] px-2 pb-safe sm:hidden">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <button onClick={handleHomeClick} className={navBtn(isActive('/'))} aria-label="Home" aria-current={isActive('/') ? 'page' : undefined}>
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-semibold">Home</span>
          </button>
          <button onClick={handleSearchClick} className={navBtn(isActive('/search'))} aria-label="Search" aria-current={isActive('/search') ? 'page' : undefined}>
            <Search className="w-6 h-6" />
            <span className="text-[10px] font-semibold">Search</span>
          </button>
          <button onClick={handleClockClick} className={navBtn(isActive('/clock'))} aria-label="Timer" aria-current={isActive('/clock') ? 'page' : undefined}>
            <Timer className="w-6 h-6" />
            <span className="text-[10px] font-semibold">Timer</span>
          </button>
          <button onClick={handleGoalsClick} className={navBtn(isActive('/goals'))} aria-label="Goals" aria-current={isActive('/goals') ? 'page' : undefined}>
            <Target className="w-6 h-6" />
            <span className="text-[10px] font-semibold">Goals</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
