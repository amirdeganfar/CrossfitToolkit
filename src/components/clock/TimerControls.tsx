import { Play, Pause, RotateCcw, Square } from 'lucide-react';
import { useClockStore } from '../../stores/clockStore';
import { initializeAudio } from '../../utils/audioUtils';

/**
 * Timer control buttons (Start, Pause, Resume, Reset)
 */
export const TimerControls = () => {
  const status = useClockStore((state) => state.status);
  const start = useClockStore((state) => state.start);
  const pause = useClockStore((state) => state.pause);
  const resume = useClockStore((state) => state.resume);
  const reset = useClockStore((state) => state.reset);

  const handleStart = () => {
    // Initialize audio on user interaction
    initializeAudio();
    start();
  };

  const handleResume = () => {
    initializeAudio();
    resume();
  };

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Start button (when idle) */}
      {status === 'idle' && (
        <button
          onClick={handleStart}
          className="
            flex items-center gap-2 px-8 py-4 
            bg-green-600 hover:bg-green-500 
            text-white font-semibold text-lg
            rounded-xl transition-colors
            shadow-lg shadow-green-600/20
          "
        >
          <Play className="w-6 h-6" fill="currentColor" />
          START
        </button>
      )}

      {/* Running controls */}
      {(status === 'running' || status === 'rest' || status === 'countdown') && (
        <>
          <button
            onClick={pause}
            disabled={status === 'countdown'}
            className="
              flex items-center gap-2 px-6 py-4
              bg-yellow-600 hover:bg-yellow-500 
              disabled:opacity-50 disabled:cursor-not-allowed
              text-white font-semibold text-lg
              rounded-xl transition-colors
            "
          >
            <Pause className="w-6 h-6" />
            PAUSE
          </button>
          <button
            onClick={reset}
            className="
              flex items-center gap-2 px-6 py-4
              bg-red-600 hover:bg-red-500 
              text-white font-semibold text-lg
              rounded-xl transition-colors
            "
          >
            <Square className="w-6 h-6" fill="currentColor" />
            STOP
          </button>
        </>
      )}

      {/* Paused controls */}
      {status === 'paused' && (
        <>
          <button
            onClick={handleResume}
            className="
              flex items-center gap-2 px-6 py-4
              bg-green-600 hover:bg-green-500 
              text-white font-semibold text-lg
              rounded-xl transition-colors
            "
          >
            <Play className="w-6 h-6" fill="currentColor" />
            RESUME
          </button>
          <button
            onClick={reset}
            className="
              flex items-center gap-2 px-6 py-4
              bg-[var(--color-surface-elevated)] hover:bg-[var(--color-border)]
              text-[var(--color-text)] font-semibold text-lg
              rounded-xl transition-colors
              border border-[var(--color-border)]
            "
          >
            <RotateCcw className="w-6 h-6" />
            RESET
          </button>
        </>
      )}

      {/* Complete controls */}
      {status === 'complete' && (
        <button
          onClick={reset}
          className="
            flex items-center gap-2 px-8 py-4
            bg-[var(--color-primary)] hover:opacity-90
            text-white font-semibold text-lg
            rounded-xl transition-colors
          "
        >
          <RotateCcw className="w-6 h-6" />
          RESET
        </button>
      )}
    </div>
  );
};
