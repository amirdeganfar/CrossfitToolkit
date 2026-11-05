import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Check, AlertCircle, Loader2, HelpCircle, ChevronRight, Timer, Minus, Plus, Moon } from 'lucide-react';
import { useCatalogStore } from '../stores/catalogStore';
import { useClockStore } from '../stores/clockStore';
import { useInitialize } from '../hooks/useInitialize';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Skeleton } from '../components/Skeleton';
import { todayLocal } from '../utils/date';
import type { ThemePreference } from '../types/catalog';

// Reusable section header
const SectionHeader = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 pb-1 border-b border-[var(--color-border)] mb-0">
    <h2 className="t-section">{label}</h2>
  </div>
);

// Reusable stepper
const Stepper = ({
  value,
  label,
  onMinus,
  onPlus,
  disableMinus,
  disablePlus,
}: {
  value: string;
  label: string;
  onMinus: () => void;
  onPlus: () => void;
  disableMinus: boolean;
  disablePlus: boolean;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
    <span className="text-sm text-[var(--color-text)]">{label}</span>
    <div className="flex items-center gap-3">
      <button
        onClick={onMinus}
        disabled={disableMinus}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border border-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-input-border-hover)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="font-display text-xl font-semibold text-[var(--color-text)] num min-w-[48px] text-center">{value}</span>
      <button
        onClick={onPlus}
        disabled={disablePlus}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border border-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-input-border-hover)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

// Reusable tab toggle
const TabToggle = ({
  options,
  active,
  onChange,
}: {
  options: { value: string; label: string }[];
  active: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex border-b border-[var(--color-border)] -mb-px">
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`px-5 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
          active === opt.value
            ? 'border-[var(--color-text)] text-[var(--color-text)]'
            : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export const Settings = () => {
  const navigate = useNavigate();
  const { isInitialized, isLoading: isInitializing } = useInitialize();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settings = useCatalogStore((state) => state.settings);
  const updateSettings = useCatalogStore((state) => state.updateSettings);
  const exportData = useCatalogStore((state) => state.exportData);
  const importData = useCatalogStore((state) => state.importData);
  const clearAllData = useCatalogStore((state) => state.clearAllData);

  const countdownSeconds = useClockStore((state) => state.countdownSeconds);
  const setCountdownSeconds = useClockStore((state) => state.setCountdownSeconds);
  const soundEnabled = useClockStore((state) => state.soundEnabled);
  const toggleSound = useClockStore((state) => state.toggleSound);

  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const handleBack = () => navigate(-1);

  // Persist a settings change; surface failures instead of rejecting silently.
  const saveSettings = async (updates: Parameters<typeof updateSettings>[0]) => {
    setSettingsError(null);
    try {
      await updateSettings(updates);
    } catch (error) {
      console.error('[Settings] Update error:', error);
      setSettingsError('Failed to save setting. Please try again.');
    }
  };

  const handleWeightUnitChange = (unit: 'kg' | 'lb') => saveSettings({ weightUnit: unit });

  const handleDistanceUnitChange = (unit: 'm' | 'ft') => saveSettings({ distanceUnit: unit });

  const handleCountdownChange = (delta: number) => {
    setCountdownSeconds(countdownSeconds + delta);
  };

  const handleMinSleepChange = (delta: number) => {
    const current = settings.minSleepHours ?? 7;
    const newValue = Math.max(5, Math.min(9, current + delta));
    return saveSettings({ minSleepHours: newValue });
  };

  const handleExport = async () => {
    try {
      const json = await exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crossfit-toolkit-backup-${todayLocal()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus('success');
      setTimeout(() => setExportStatus('idle'), 3000);
    } catch (error) {
      console.error('[Settings] Export error:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 3000);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('loading');
    setImportError(null);

    try {
      const text = await file.text();
      await importData(text);
      setImportStatus('success');
      setTimeout(() => setImportStatus('idle'), 3000);
    } catch (error) {
      console.error('[Settings] Import error:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to import data');
      setImportStatus('error');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearData = async () => {
    setShowClearConfirm(false);
    setClearError(null);
    try {
      await clearAllData();
      // Settings (incl. hasSeenOnboarding) were reset, so start over at onboarding.
      navigate('/onboarding', { replace: true });
    } catch (error) {
      console.error('[Settings] Clear data error:', error);
      setClearError(error instanceof Error ? error.message : 'Failed to clear data');
    }
  };

  if (!isInitialized || isInitializing) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-8 w-36" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3"><Skeleton className="h-5 w-24" /><Skeleton className="h-12 w-full rounded-md" /></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-elevated)] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
        </button>
        <h1 className="t-title">Settings</h1>
      </div>

      {settingsError && (
        <div className="px-1 py-2 border-l-2 border-[var(--color-danger)]" role="alert">
          <p className="text-[13px] font-medium text-[var(--color-danger)]">{settingsError}</p>
        </div>
      )}

      {/* Appearance section */}
      <section className="space-y-3">
        <SectionHeader label="Appearance" />

        <div className="py-2 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--color-text)]">Theme</span>
          </div>
          <TabToggle
            options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
            active={settings.theme ?? 'system'}
            onChange={(v) => saveSettings({ theme: v as ThemePreference })}
          />
        </div>
      </section>

      {/* Units section */}
      <section className="space-y-3">
        <SectionHeader label="Units" />

        <div className="py-2 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--color-text)]">Weight</span>
          </div>
          <TabToggle
            options={[{ value: 'kg', label: 'KG' }, { value: 'lb', label: 'LB' }]}
            active={settings.weightUnit}
            onChange={(v) => handleWeightUnitChange(v as 'kg' | 'lb')}
          />
        </div>

        <div className="py-2 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--color-text)]">Distance</span>
          </div>
          <TabToggle
            options={[{ value: 'm', label: 'M' }, { value: 'ft', label: 'FT' }]}
            active={settings.distanceUnit}
            onChange={(v) => handleDistanceUnitChange(v as 'm' | 'ft')}
          />
        </div>
      </section>

      {/* Timer section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-[var(--color-border)]">
          <Timer className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <h2 className="t-section">Timer</h2>
        </div>

        <Stepper
          label="Countdown"
          value={`${countdownSeconds}s`}
          onMinus={() => handleCountdownChange(-1)}
          onPlus={() => handleCountdownChange(1)}
          disableMinus={countdownSeconds <= 3}
          disablePlus={countdownSeconds >= 30}
        />

        <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
          <div>
            <span className="text-sm text-[var(--color-text)]">Sound</span>
            <p className="text-xs text-[var(--color-text-muted)]">Beeps and alerts</p>
          </div>
          <button
            onClick={toggleSound}
            role="switch"
            aria-checked={soundEnabled}
            aria-label="Sound"
            className={`relative w-12 h-7 rounded-full transition-colors ${
              soundEnabled ? 'bg-[var(--color-success)]' : 'bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)]'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full transition-[left] ${
                soundEnabled ? 'left-6 bg-white' : 'left-1 bg-[var(--color-text-muted)]'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Recovery section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-[var(--color-border)]">
          <Moon className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <h2 className="t-section">Recovery</h2>
        </div>

        <Stepper
          label="Min Sleep Hours"
          value={`${settings.minSleepHours ?? 7}h`}
          onMinus={() => handleMinSleepChange(-1)}
          onPlus={() => handleMinSleepChange(1)}
          disableMinus={(settings.minSleepHours ?? 7) <= 5}
          disablePlus={(settings.minSleepHours ?? 7) >= 9}
        />
      </section>

      {/* Data section */}
      <section className="space-y-1">
        <SectionHeader label="Data" />

        <button
          onClick={handleExport}
          className="w-full py-3 flex items-center justify-between border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors text-left px-1"
        >
          <div className="flex items-center gap-3">
            <Download className="w-4 h-4 text-[var(--color-text-muted)]" />
            <div>
              <span className="text-[15px] font-semibold text-[var(--color-text)]">Export data</span>
              <p className="text-xs text-[var(--color-text-muted)]">Download all your data as JSON</p>
            </div>
          </div>
          {exportStatus === 'success' && <Check className="w-4 h-4 text-[var(--color-success)]" />}
          {exportStatus === 'error' && <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />}
        </button>

        <button
          onClick={handleImportClick}
          disabled={importStatus === 'loading'}
          className="w-full py-3 flex items-center justify-between border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors text-left disabled:opacity-50 px-1"
        >
          <div className="flex items-center gap-3">
            <Upload className="w-4 h-4 text-[var(--color-text-muted)]" />
            <div>
              <span className="text-[15px] font-semibold text-[var(--color-text)]">Import data</span>
              <p className="text-xs text-[var(--color-text-muted)]">Restore from a JSON backup</p>
            </div>
          </div>
          {importStatus === 'loading' && <Loader2 className="w-4 h-4 text-[var(--color-text-muted)] animate-spin" />}
          {importStatus === 'success' && <Check className="w-4 h-4 text-[var(--color-success)]" />}
          {importStatus === 'error' && <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportFile}
          className="hidden"
        />

        {importError && (
          <div className="px-1 py-2 border-l-2 border-[var(--color-danger)]">
            <p className="text-[13px] font-medium text-[var(--color-danger)]">{importError}</p>
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="space-y-1">
        <div className="flex items-center gap-2 pb-1 border-b border-[var(--color-danger)]/40">
          <h2 className="t-section text-[var(--color-danger)]">Danger zone</h2>
        </div>

        <button
          onClick={() => setShowClearConfirm(true)}
          className="w-full py-3 flex items-center gap-3 hover:bg-[var(--color-danger)]/5 transition-colors text-left px-1"
        >
          <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />
          <div>
            <span className="text-[15px] font-semibold text-[var(--color-danger)]">Clear all data</span>
            <p className="text-xs text-[var(--color-text-muted)]">Permanently delete all PRs, goals, check-ins, favorites, timer presets, and settings</p>
          </div>
        </button>

        {clearError && (
          <div className="px-1 py-2 border-l-2 border-[var(--color-danger)]">
            <p className="text-[13px] font-medium text-[var(--color-danger)]">{clearError}</p>
          </div>
        )}
      </section>

      {showClearConfirm && (
        <ConfirmDialog
          title="Clear all data?"
          message="This permanently deletes all PRs, goals, check-ins, favorites, custom items, timer presets, and settings (incl. countdown and sound). This cannot be undone. You may want to export a backup first."
          confirmLabel="Clear everything"
          onConfirm={handleClearData}
          onCancel={() => setShowClearConfirm(false)}
          isDestructive
        />
      )}

      {/* Help section */}
      <section className="space-y-1">
        <SectionHeader label="Help" />

        <button
          onClick={() => navigate('/onboarding')}
          className="w-full py-3 flex items-center justify-between border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors text-left px-1"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="w-4 h-4 text-[var(--color-text-muted)]" />
            <div>
              <span className="text-[15px] font-semibold text-[var(--color-text)]">View tutorial</span>
              <p className="text-xs text-[var(--color-text-muted)]">Learn how to use the app and install it</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
      </section>

      {/* About section */}
      <section className="space-y-1">
        <SectionHeader label="About" />
        <div className="py-3 space-y-2 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <span className="t-caption text-[13px]">Version</span>
            <span className="font-display text-sm text-[var(--color-text)] num">1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="t-caption text-[13px]">Storage</span>
            <span className="font-display text-sm text-[var(--color-text)]">IndexedDB</span>
          </div>
        </div>
        <p className="t-caption text-center pt-2">
          Built for CrossFit athletes
        </p>
      </section>
    </div>
  );
};
