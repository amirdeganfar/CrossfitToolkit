import { createPortal } from 'react-dom';
import { useId, useRef, useState } from 'react';
import { Save, FolderOpen, Trash2, X, Timer } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { useClockStore, formatTime, type TimerPreset } from '../../stores/clockStore';
import { useModalA11y } from '../../hooks/useModalA11y';
import { ConfirmDialog } from '../ConfirmDialog';

interface PresetManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal for saving and loading timer presets
 */
export const PresetManager = ({ isOpen, onClose }: PresetManagerProps) => {
  const presets = useClockStore((state) => state.presets);
  const config = useClockStore((state) => state.config);
  const status = useClockStore((state) => state.status);
  const savePreset = useClockStore((state) => state.savePreset);
  const loadPreset = useClockStore((state) => state.loadPreset);
  const deletePreset = useClockStore((state) => state.deletePreset);

  const [presetName, setPresetName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TimerPreset | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalA11y(dialogRef, onClose, isOpen);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!presetName.trim()) return;
    savePreset(presetName.trim());
    setPresetName('');
    setShowSaveForm(false);
  };

  const handleLoad = (preset: TimerPreset) => {
    if (status !== 'idle') return;
    loadPreset(preset);
    onClose();
  };

  const confirmDelete = () => {
    if (pendingDelete) deletePreset(pendingDelete.id);
    setPendingDelete(null);
  };

  const getModeLabel = (mode: string): string => {
    const labels: Record<string, string> = {
      amrap: 'AMRAP',
      emom: 'EMOM',
      forTime: 'For Time',
      tabata: 'Tabata',
      custom: 'Custom',
    };
    return labels[mode] || mode;
  };

  const getPresetDescription = (preset: TimerPreset): string => {
    const cfg = preset.config;
    switch (cfg.mode) {
      case 'amrap':
        return formatTime(cfg.totalTime);
      case 'emom':
        return `${cfg.rounds} × ${formatTime(cfg.intervalTime)}`;
      case 'forTime':
        return cfg.totalTime > 0 ? `Cap: ${formatTime(cfg.totalTime)}` : 'No cap';
      case 'tabata':
        return `${cfg.rounds}r: ${cfg.workTime}s/${cfg.restTime}s`;
      case 'custom':
        return `${cfg.sets > 1 ? `${cfg.sets}s × ` : ''}${cfg.rounds}r: ${cfg.workTime}s/${cfg.restTime}s`;
      default:
        return '';
    }
  };

  return createPortal(
    <div className="sheet-root" onClick={onClose}>
      {/* Backdrop */}
      <div className="sheet-backdrop" aria-hidden="true" />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
          <h2 id={titleId} className="t-section">Timer presets</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close presets"
            className="p-2 -mr-2 rounded-full hover:bg-[var(--color-surface-elevated)]"
          >
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Save new preset */}
          {status === 'idle' && (
            <div className="space-y-3">
              {!showSaveForm ? (
                <button
                  type="button"
                  onClick={() => setShowSaveForm(true)}
                  className="
                    w-full flex items-center justify-center gap-2 py-3 px-4
                    bg-[var(--color-primary)] hover:opacity-90
                    text-white font-semibold text-sm rounded-sm
                    transition-all active:scale-[0.97]
                  "
                >
                  <Save className="w-4 h-4" />
                  Save current setup
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Preset name..."
                    aria-label="Preset name"
                    className="
                      field flex-1 px-3 py-2.5
                    "
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  />
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!presetName.trim()}
                    className="
                      px-4 py-2.5 bg-[var(--color-success)] hover:opacity-90
                      disabled:opacity-50 disabled:cursor-not-allowed
                      text-white font-semibold text-sm rounded-sm
                      transition-all
                    "
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveForm(false);
                      setPresetName('');
                    }}
                    className="
                      px-4 py-2.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)]
                      text-[var(--color-text-muted)] font-semibold text-sm rounded-sm
                      hover:text-[var(--color-text)] transition-colors
                    "
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Current config preview */}
              <div className="p-3 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)]">
                <div className="t-caption mb-1">Current setup</div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)] text-[var(--color-text)] text-xs font-semibold rounded-xs">
                    {getModeLabel(config.mode)}
                  </span>
                  <span className="text-sm text-[var(--color-text)] num">
                    {getPresetDescription({ id: '', name: '', config, createdAt: 0 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Preset list */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[var(--color-text-muted)]" />
              <span className="label-eyebrow">Saved presets <span className="num">({presets.length})</span></span>
            </div>

            {presets.length === 0 ? (
              <EmptyState icon={Timer} message="No presets yet. Set up a timer, then save it here." />
            ) : (
              <div className="space-y-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="
                      flex items-center gap-3 p-3
                      bg-[var(--color-bg)] rounded-md
                      border border-[var(--color-border)]
                      group
                    "
                  >
                    <button
                      type="button"
                      onClick={() => handleLoad(preset)}
                      disabled={status !== 'idle'}
                      className="
                        flex-1 text-left
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      <div className="font-display text-base text-[var(--color-text)]">
                        {preset.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] text-[11px] font-semibold rounded-xs">
                          {getModeLabel(preset.config.mode)}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)] num">
                          {getPresetDescription(preset)}
                        </span>
                      </div>
                    </button>
                    {/* Always visible (muted) so it works on touch/keyboard */}
                    <button
                      type="button"
                      onClick={() => setPendingDelete(preset)}
                      aria-label={`Delete preset ${preset.name}`}
                      className="
                        p-2 rounded-sm
                        text-[var(--color-text-muted)] hover:text-[var(--color-danger)] focus-visible:text-[var(--color-danger)]
                        hover:bg-[var(--color-danger)]/10 focus-visible:bg-[var(--color-danger)]/10
                        transition-all
                      "
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {pendingDelete && (
        // Stop clicks inside the confirm from reaching the outer backdrop handler
        <div onClick={(e) => e.stopPropagation()}>
          <ConfirmDialog
            title="Delete preset?"
            message={`"${pendingDelete.name}" will be removed.`}
            confirmLabel="Delete"
            isDestructive
            onConfirm={confirmDelete}
            onCancel={() => setPendingDelete(null)}
          />
        </div>
      )}
    </div>,
    document.body,
  );
};
