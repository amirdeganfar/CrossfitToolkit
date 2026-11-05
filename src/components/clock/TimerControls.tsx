import { Play, Pause, RotateCcw, Square } from 'lucide-react';
import { useClockStore } from '../../stores/clockStore';
import { initializeAudio } from '../../utils/audioUtils';

/**
 * Timer control buttons — primary-accent/dark style
 */
export const TimerControls = () => {
  const status = useClockStore((state) => state.status);
  const start = useClockStore((state) => state.start);
  const pause = useClockStore((state) => state.pause);
  const resume = useClockStore((state) => state.resume);
  const reset = useClockStore((state) => state.reset);

  const handleStart = () => { initializeAudio(); start(); };
  const handleResume = () => { initializeAudio(); resume(); };

  const baseBtn = 'flex items-center justify-center gap-2 rounded-md text-[17px] font-bold transition-all active:scale-[0.97]';

  return (
    <div className="flex gap-3">
      {/* Idle → START */}
      {status === 'idle' && (
        <button
          onClick={handleStart}
          className={`${baseBtn} flex-1 py-4 bg-[var(--color-primary)] text-[var(--color-text)] hover:opacity-90`}
        >
          <Play className="w-5 h-5" fill="currentColor" />
          Start
        </button>
      )}

      {/* Running → PAUSE + STOP */}
      {(status === 'running' || status === 'rest' || status === 'countdown') && (
        <>
          <button
            onClick={pause}
            disabled={status === 'countdown'}
            className={`${baseBtn} flex-1 py-4 bg-[var(--color-warning)] text-[var(--color-bg)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Pause className="w-5 h-5" />
            Pause
          </button>
          <button
            onClick={reset}
            className={`${baseBtn} px-6 py-4 bg-[var(--color-surface-elevated)] hover:bg-[var(--color-border-strong)] text-[var(--color-text)] border border-[var(--color-border-strong)]`}
          >
            <Square className="w-5 h-5" fill="currentColor" />
            Stop
          </button>
        </>
      )}

      {/* Paused → RESUME + RESET */}
      {status === 'paused' && (
        <>
          <button
            onClick={handleResume}
            className={`${baseBtn} flex-1 py-4 bg-[var(--color-primary)] text-[var(--color-text)] hover:opacity-90`}
          >
            <Play className="w-5 h-5" fill="currentColor" />
            Resume
          </button>
          <button
            onClick={reset}
            className={`${baseBtn} px-6 py-4 bg-[var(--color-surface-elevated)] hover:bg-[var(--color-border-strong)] text-[var(--color-text)] border border-[var(--color-border-strong)]`}
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>
        </>
      )}

      {/* Complete → RESET */}
      {status === 'complete' && (
        <button
          onClick={reset}
          className={`${baseBtn} flex-1 py-4 bg-[var(--color-primary)] text-[var(--color-text)] hover:opacity-90`}
        >
          <RotateCcw className="w-5 h-5" />
          New round
        </button>
      )}
    </div>
  );
};
