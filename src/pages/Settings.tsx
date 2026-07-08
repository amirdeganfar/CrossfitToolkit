import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Check, AlertCircle, Loader2, HelpCircle, ChevronRight, Timer, Minus, Plus, Moon } from 'lucide-react';
import { useCatalogStore } from '../stores/catalogStore';
import { useClockStore } from '../stores/clockStore';
import { useInitialize } from '../hooks/useInitialize';

export const Settings = () => {
  const navigate = useNavigate();
  const { isInitialized, isLoading: isInitializing } = useInitialize();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settings = useCatalogStore((state) => state.settings);
  const updateSettings = useCatalogStore((state) => state.updateSettings);
  const exportData = useCatalogStore((state) => state.exportData);
  const importData = useCatalogStore((state) => state.importData);

  const countdownSeconds = useClockStore((state) => state.countdownSeconds);
  const setCountdownSeconds = useClockStore((state) => state.setCountdownSeconds);
  const soundEnabled = useClockStore((state) => state.soundEnabled);
  const toggleSound = useClockStore((state) => state.toggleSound);

  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState<string | null>(null);

  const handleBack = () => navigate(-1);

  const handleWeightUnitChange = async (unit: 'kg' | 'lb') => {
    await updateSettings({ weightUnit: unit });
  };

  const handleDistanceUnitChange = async (unit: 'm' | 'ft') => {
    await updateSettings({ distanceUnit: unit });
  };

  const handleCountdownChange = (delta: number) => {
    setCountdownSeconds(countdownSeconds + delta);
  };

  const handleMinSleepChange = async (delta: number) => {
    const current = settings.minSleepHours ?? 7;
    const newValue = Math.max(5, Math.min(9, current + delta));
    await updateSettings({ minSleepHours: newValue });
  };

  const handleExport = async () => {
    try {
      const json = await exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crossfit-toolkit-backup-${new Date().toISOString().split('T')[0]}.json`;
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
    if (window.confirm('Are you sure you want to clear ALL data? This cannot be undone. You may want to export a backup first.')) {
      if (window.confirm('This will delete all your PRs, favorites, and custom items. Are you absolutely sure?')) {
        try {
          await importData(JSON.stringify({
            version: 1,
            exportedAt: new Date().toISOString(),
            catalogItems: [],
            prLogs: [],
            settings: { weightUnit: 'kg', distanceUnit: 'm' },
          }));
          window.location.reload();
        } catch (error) {
          console.error('[Settings] Clear data error:', error);
        }
      }
    }
  };

  if (!isInitialized || isInitializing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  // Reusable section header
  const SectionHeader = ({ label }: { label: string }) => (
    <div className="flex items-center gap-2 pb-1 border-b border-[var(--color-border)] mb-0">
      <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">{label}</span>
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
          className="w-9 h-9 flex items-center justify-center bg-transparent border border-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all rounded-none"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="font-display text-xl text-[var(--color-primary)] min-w-[48px] text-center">{value}</span>
        <button
          onClick={onPlus}
          disabled={disablePlus}
          className="w-9 h-9 flex items-center justify-center bg-transparent border border-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all rounded-none"
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
          className={`px-5 py-2 font-display text-sm tracking-widest transition-colors border-b-2 -mb-px ${
            active === opt.value
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 -ml-1 hover:bg-[var(--color-surface-elevated)] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
        </button>
        <h1 className="font-display text-2xl text-[var(--color-text)] tracking-[0.1em]">SETTINGS</h1>
      </div>

      {/* Units section */}
      <section className="space-y-3">
        <SectionHeader label="UNITS" />

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
          <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">TIMER</span>
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
            className={`relative w-12 h-7 transition-colors ${
              soundEnabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)]'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 transition-transform ${
                soundEnabled ? 'left-6 bg-[#0B130B]' : 'left-1 bg-[var(--color-text-muted)]'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Recovery section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-[var(--color-border)]">
          <Moon className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">RECOVERY</span>
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
        <SectionHeader label="DATA" />

        <button
          onClick={handleExport}
          className="w-full py-3 flex items-center justify-between border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors text-left px-1"
        >
          <div className="flex items-center gap-3">
            <Download className="w-4 h-4 text-[var(--color-text-muted)]" />
            <div>
              <span className="font-display text-sm tracking-wider text-[var(--color-text)]">EXPORT DATA</span>
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
              <span className="font-display text-sm tracking-wider text-[var(--color-text)]">IMPORT DATA</span>
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
            <p className="text-xs text-[var(--color-danger)] font-display tracking-wider">{importError}</p>
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="space-y-1">
        <div className="flex items-center gap-2 pb-1 border-b border-[var(--color-danger)]/40">
          <span className="font-display text-xs tracking-[0.2em] text-[var(--color-danger)]">DANGER ZONE</span>
        </div>

        <button
          onClick={handleClearData}
          className="w-full py-3 flex items-center gap-3 hover:bg-[var(--color-danger)]/5 transition-colors text-left px-1"
        >
          <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />
          <div>
            <span className="font-display tracking-wider text-sm text-[var(--color-danger)]">CLEAR ALL DATA</span>
            <p className="text-xs text-[var(--color-text-muted)]">Permanently delete all PRs, favorites, and settings</p>
          </div>
        </button>
      </section>

      {/* Help section */}
      <section className="space-y-1">
        <SectionHeader label="HELP" />

        <button
          onClick={() => navigate('/onboarding')}
          className="w-full py-3 flex items-center justify-between border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors text-left px-1"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="w-4 h-4 text-[var(--color-text-muted)]" />
            <div>
              <span className="font-display text-sm tracking-wider text-[var(--color-text)]">VIEW TUTORIAL</span>
              <p className="text-xs text-[var(--color-text-muted)]">Learn how to use the app and install it</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
      </section>

      {/* About section */}
      <section className="space-y-1">
        <SectionHeader label="ABOUT" />
        <div className="py-3 space-y-2 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)] font-display tracking-widest">VERSION</span>
            <span className="font-display text-sm text-[var(--color-text)]">1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)] font-display tracking-widest">STORAGE</span>
            <span className="font-display text-sm text-[var(--color-text)]">INDEXEDDB</span>
          </div>
        </div>
        <p className="text-xs text-[var(--color-text-dim)] font-display tracking-widest text-center pt-2">
          BUILT FOR CROSSFIT ATHLETES
        </p>
      </section>
    </div>
  );
};
