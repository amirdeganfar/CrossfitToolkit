import { useClockStore, type TimerMode } from '../../stores/clockStore';

interface ModeSelectorProps {
  onModeChange?: (mode: TimerMode) => void;
}

/**
 * Timer mode selection tabs
 */
export const ModeSelector = ({ onModeChange }: ModeSelectorProps) => {
  const currentMode = useClockStore((state) => state.config.mode);
  const status = useClockStore((state) => state.status);
  const setMode = useClockStore((state) => state.setMode);

  const modes: { id: TimerMode; label: string; description: string }[] = [
    { id: 'amrap', label: 'AMRAP', description: 'As Many Rounds As Possible' },
    { id: 'emom', label: 'EMOM', description: 'Every Minute On the Minute' },
    { id: 'forTime', label: 'For Time', description: 'Stopwatch with optional cap' },
    { id: 'tabata', label: 'Tabata', description: '20s work / 10s rest' },
    { id: 'custom', label: 'Custom', description: 'Custom intervals' },
  ];

  const handleModeSelect = (mode: TimerMode) => {
    if (status !== 'idle') return;
    setMode(mode);
    onModeChange?.(mode);
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => handleModeSelect(mode.id)}
          disabled={status !== 'idle'}
          className={`
            px-4 py-2 rounded-lg font-semibold text-sm
            transition-all duration-200
            ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
            ${currentMode === mode.id
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] border border-[var(--color-border)]'
            }
          `}
          title={mode.description}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
};
