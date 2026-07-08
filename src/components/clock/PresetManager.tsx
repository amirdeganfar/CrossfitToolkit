import { useState } from 'react';
import { Save, FolderOpen, Trash2, X } from 'lucide-react';
import { useClockStore, formatTime, type TimerPreset } from '../../stores/clockStore';

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

  const handleDelete = (id: string) => {
    deletePreset(id);
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="
          relative w-full max-w-md max-h-[80vh] overflow-hidden
          bg-[var(--color-surface)] rounded-t-2xl sm:rounded-lg
          border-t border-[var(--color-border-strong)] sm:border
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-[var(--color-border-strong)] rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="font-display text-xl text-[var(--color-text)]">TIMER PRESETS</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-sm hover:bg-[var(--color-surface-elevated)] active:scale-95 transition-all"
          >
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Save new preset */}
          {status === 'idle' && (
            <div className="space-y-3">
              {!showSaveForm ? (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="
                    w-full flex items-center justify-center gap-2 py-3 px-4
                    bg-[var(--color-primary)] hover:opacity-90
                    text-white font-display tracking-widest text-sm rounded-sm
                    transition-all active:scale-[0.97]
                  "
                >
                  <Save className="w-4 h-4" />
                  SAVE CURRENT SETUP
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Preset name..."
                    className="
                      flex-1 px-3 py-2.5 rounded-sm
                      bg-[var(--color-bg)] border border-[var(--color-border-strong)]
                      text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                      focus:outline-none focus:border-[var(--color-primary)]
                    "
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  />
                  <button
                    onClick={handleSave}
                    disabled={!presetName.trim()}
                    className="
                      px-4 py-2.5 bg-[var(--color-success)] hover:opacity-90
                      disabled:opacity-50 disabled:cursor-not-allowed
                      text-white font-display tracking-widest text-sm rounded-sm
                      transition-all
                    "
                  >
                    SAVE
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveForm(false);
                      setPresetName('');
                    }}
                    className="
                      px-4 py-2.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)]
                      text-[var(--color-text-muted)] font-display tracking-widest text-sm rounded-sm
                      hover:text-[var(--color-text)] transition-colors
                    "
                  >
                    CANCEL
                  </button>
                </div>
              )}

              {/* Current config preview */}
              <div className="p-3 bg-[var(--color-bg)] rounded-sm border border-[var(--color-border)]">
                <div className="font-display text-[10px] tracking-widest text-[var(--color-text-muted)] mb-1">CURRENT SETUP</div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-display text-xs tracking-wider rounded-sm">
                    {getModeLabel(config.mode)}
                  </span>
                  <span className="text-sm text-[var(--color-text)]">
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
              <span className="font-display text-xs tracking-widest text-[var(--color-text-muted)]">SAVED PRESETS ({presets.length})</span>
            </div>

            {presets.length === 0 ? (
              <div className="p-6 text-center">
                <p className="font-display text-sm tracking-wider text-[var(--color-text-muted)]">NO PRESETS SAVED</p>
              </div>
            ) : (
              <div className="space-y-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="
                      flex items-center gap-3 p-3
                      bg-[var(--color-bg)] rounded-sm
                      border border-[var(--color-border)]
                      group
                    "
                  >
                    <button
                      onClick={() => handleLoad(preset)}
                      disabled={status !== 'idle'}
                      className="
                        flex-1 text-left
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      <div className="font-display text-base text-[var(--color-text)]">
                        {preset.name.toUpperCase()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] font-display text-[10px] tracking-wider rounded-sm">
                          {getModeLabel(preset.config.mode)}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {getPresetDescription(preset)}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDelete(preset.id)}
                      className="
                        p-2 rounded-sm
                        text-[var(--color-text-muted)] hover:text-[var(--color-danger)]
                        hover:bg-red-500/10
                        opacity-0 group-hover:opacity-100
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
    </div>
  );
};
