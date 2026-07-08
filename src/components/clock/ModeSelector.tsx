import { useClockStore, type TimerMode } from '../../stores/clockStore';

interface ModeSelectorProps {
  onModeChange?: (mode: TimerMode) => void;
}

/**
 * Timer mode selection — sharp segmented control
 */
export const ModeSelector = ({ onModeChange }: ModeSelectorProps) => {
  const currentMode = useClockStore((state) => state.config.mode);
  const status = useClockStore((state) => state.status);
  const setMode = useClockStore((state) => state.setMode);

  const modes: { id: TimerMode; label: string; description: string }[] = [
    { id: 'amrap',   label: 'AMRAP',    description: 'As Many Rounds As Possible' },
    { id: 'emom',    label: 'EMOM',     description: 'Every Minute On the Minute' },
    { id: 'forTime', label: 'FOR TIME', description: 'Stopwatch with optional cap' },
    { id: 'tabata',  label: 'TABATA',   description: '20s work / 10s rest' },
    { id: 'custom',  label: 'CUSTOM',   description: 'Custom intervals' },
  ];

  const handleModeSelect = (mode: TimerMode) => {
    if (status !== 'idle') return;
    setMode(mode);
    onModeChange?.(mode);
  };

  return (
    <div className="flex overflow-x-auto gap-1 scrollbar-hide">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => handleModeSelect(mode.id)}
          disabled={status !== 'idle'}
          title={mode.description}
          className={`
            flex-shrink-0 px-4 py-2 font-display text-sm tracking-widest
            transition-colors duration-150
            ${status !== 'idle' ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
            ${currentMode === mode.id
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
            }
          `}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
};
