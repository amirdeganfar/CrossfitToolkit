import { useEffect } from 'react';
import type { ThemePreference } from '../types/catalog';

/** localStorage mirror of the Dexie `theme` setting, read by the pre-paint script in index.html. */
export const THEME_STORAGE_KEY = 'cf-theme';

/** Browser chrome color per theme — matches --color-bg in index.css. */
const THEME_COLOR: Record<ResolvedTheme, string> = { dark: '#0A0A0B', light: '#F4F3F0' };

type ResolvedTheme = 'dark' | 'light';

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

const resolveTheme = (pref: ThemePreference): ResolvedTheme =>
  pref === 'system' ? (darkQuery().matches ? 'dark' : 'light') : pref;

const applyTheme = (pref: ThemePreference) => {
  const theme = resolveTheme(pref);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Storage blocked (private mode etc.) — only costs a flash on next load.
  }
};

/**
 * Keep <html data-theme> in sync with the setting, following the OS while on 'system'.
 * `undefined` = settings not loaded yet: leave the pre-paint script's choice alone.
 */
export const useApplyTheme = (pref: ThemePreference | undefined) => {
  useEffect(() => {
    if (!pref) return;
    applyTheme(pref);
    if (pref !== 'system') return;
    const mq = darkQuery();
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);
};
