import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Check, AlertCircle, Loader2, HelpCircle, ChevronRight, Timer, Minus, Plus } from 'lucide-react';
import { useCatalogStore } from '../stores/catalogStore';
import { useClockStore } from '../stores/clockStore';
import { useInitialize } from '../hooks/useInitialize';

export const Settings = () => {
  const navigate = useNavigate();
  const { isInitialized, isLoading: isInitializing } = useInitialize();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store state
  const settings = useCatalogStore((state) => state.settings);
  const updateSettings = useCatalogStore((state) => state.updateSettings);
  const exportData = useCatalogStore((state) => state.exportData);
  const importData = useCatalogStore((state) => state.importData);

  // Clock store state
  const countdownSeconds = useClockStore((state) => state.countdownSeconds);
  const setCountdownSeconds = useClockStore((state) => state.setCountdownSeconds);
  const soundEnabled = useClockStore((state) => state.soundEnabled);
  const toggleSound = useClockStore((state) => state.toggleSound);

  // Local state
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState<string | null>(null);

  const handleBack = () => {
    navigate(-1);
  };

  const handleWeightUnitChange = async (unit: 'kg' | 'lb') => {
    await updateSettings({ weightUnit: unit });
  };

  const handleDistanceUnitChange = async (unit: 'm' | 'ft') => {
    await updateSettings({ distanceUnit: unit });
  };

  const handleCountdownChange = (delta: number) => {
    setCountdownSeconds(countdownSeconds + delta);
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

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear ALL data? This cannot be undone. You may want to export a backup first.')) {
      if (window.confirm('This will delete all your PRs, favorites, and custom items. Are you absolutely sure?')) {
        try {
          // Import empty data to clear everything
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
        </button>
        <h1 className="text-xl font-bold text-[var(--color-text)]">Settings</h1>
      </div>

      {/* Units section */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Units
          </h2>
        </div>

        {/* Weight unit */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--color-border)]">
          <span className="text-[var(--color-text)]">Weight</span>
          <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
            <button
              onClick={() => handleWeightUnitChange('kg')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                settings.weightUnit === 'kg'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]'
              }`}
            >
              kg
            </button>
            <button
              onClick={() => handleWeightUnitChange('lb')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                settings.weightUnit === 'lb'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]'
              }`}
            >
              lb
            </button>
          </div>
        </div>

        {/* Distance unit */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-[var(--color-text)]">Distance</span>
          <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
            <button
              onClick={() => handleDistanceUnitChange('m')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                settings.distanceUnit === 'm'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]'
              }`}
            >
              m
            </button>
            <button
              onClick={() => handleDistanceUnitChange('ft')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                settings.distanceUnit === 'ft'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]'
              }`}
            >
              ft
            </button>
          </div>
        </div>
      </section>

      {/* Timer section */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
          <Timer className="w-4 h-4 text-[var(--color-text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Timer
          </h2>
        </div>

        {/* Countdown duration */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--color-border)]">
          <div>
            <span className="text-[var(--color-text)]">Countdown</span>
            <p className="text-xs text-[var(--color-text-muted)]">Seconds before timer starts</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCountdownChange(-1)}
              disabled={countdownSeconds <= 3}
              className="w-8 h-8 flex items-center justify-center bg-[var(--color-surface-elevated)] rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-mono text-lg font-semibold text-[var(--color-text)] min-w-[40px] text-center">
              {countdownSeconds}s
            </span>
            <button
              onClick={() => handleCountdownChange(1)}
              disabled={countdownSeconds >= 30}
              className="w-8 h-8 flex items-center justify-center bg-[var(--color-surface-elevated)] rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sound toggle */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-[var(--color-text)]">Sound</span>
            <p className="text-xs text-[var(--color-text-muted)]">Beeps and alerts</p>
          </div>
          <button
            onClick={toggleSound}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              soundEnabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-elevated)]'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                soundEnabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Data section */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Data
          </h2>
        </div>

        {/* Export */}
        <button
          onClick={handleExport}
          className="w-full px-4 py-3 flex items-center justify-between border-b border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-[var(--color-text-muted)]" />
            <div>
              <span className="text-[var(--color-text)]">Export Data</span>
              <p className="text-xs text-[var(--color-text-muted)]">
                Download all your data as JSON
              </p>
            </div>
          </div>
          {exportStatus === 'success' && (
            <Check className="w-5 h-5 text-green-400" />
          )}
          {exportStatus === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
        </button>

        {/* Import */}
        <button
          onClick={handleImportClick}
          disabled={importStatus === 'loading'}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--color-surface-elevated)] transition-colors text-left disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-[var(--color-text-muted)]" />
            <div>
              <span className="text-[var(--color-text)]">Import Data</span>
              <p className="text-xs text-[var(--color-text-muted)]">
                Restore from a JSON backup
              </p>
            </div>
          </div>
          {importStatus === 'loading' && (
            <Loader2 className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
          )}
          {importStatus === 'success' && (
            <Check className="w-5 h-5 text-green-400" />
          )}
          {importStatus === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportFile}
          className="hidden"
        />

        {/* Import error message */}
        {importError && (
          <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/30">
            <p className="text-sm text-red-400">{importError}</p>
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="bg-[var(--color-surface)] border border-red-500/30 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-red-500/30 bg-red-500/10">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wide">
            Danger Zone
          </h2>
        </div>

        <button
          onClick={handleClearData}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/10 transition-colors text-left"
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
          <div>
            <span className="text-red-400 font-medium">Clear All Data</span>
            <p className="text-xs text-[var(--color-text-muted)]">
              Permanently delete all PRs, favorites, and settings
            </p>
          </div>
        </button>
      </section>

      {/* Help section */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Help
          </h2>
        </div>

        <button
          onClick={() => navigate('/onboarding')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--color-surface-elevated)] transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-[var(--color-text-muted)]" />
            <div>
              <span className="text-[var(--color-text)]">View Tutorial</span>
              <p className="text-xs text-[var(--color-text-muted)]">
                Learn how to use the app and install it
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)]" />
        </button>
      </section>

      {/* About section */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            About
          </h2>
        </div>

        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">Version</span>
            <span className="text-[var(--color-text)]">1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">Storage</span>
            <span className="text-[var(--color-text)]">IndexedDB (local)</span>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            Built with ❤️ for CrossFit athletes
          </p>
        </div>
      </section>
    </div>
  );
};
