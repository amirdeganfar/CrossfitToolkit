import { Play } from 'lucide-react';
import { useClockStore, formatTime, type TimerConfig } from '../../stores/clockStore';
import { initializeAudio } from '../../utils/audioUtils';

/** One-line plan for the configured workout. */
const summarize = (config: TimerConfig): string => {
  switch (config.mode) {
    case 'amrap':   return `${formatTime(config.totalTime)} total`;
    case 'emom':    return `${config.rounds} rounds of ${formatTime(config.intervalTime)}`;
    case 'forTime': return config.totalTime > 0 ? `Time cap ${formatTime(config.totalTime)}` : 'No time cap';
    case 'tabata':  return `${config.rounds} rounds, ${config.workTime}s work / ${config.restTime}s rest`;
    case 'custom':
      return `${config.sets > 1 ? `${config.sets} sets of ` : ''}${config.rounds} rounds, ${formatTime(config.workTime)} / ${formatTime(config.restTime)}`;
    default:        return '';
  }
};

/**
 * Idle preview: what the clock will show first, the plan in words, and Start.
 */
export const TimerDisplay = () => {
  const timeRemaining = useClockStore((state) => state.timeRemaining);
  const config = useClockStore((state) => state.config);
  const start = useClockStore((state) => state.start);

  const handleStart = () => { initializeAudio(); start(); };

  return (
    <div className="card flex flex-col items-center gap-5 pt-8 pb-4">
      <div className="text-center">
        <div className="timer-digits num text-[5.5rem] sm:text-[7rem] text-[var(--color-text)]">
          {formatTime(timeRemaining)}
        </div>
        <div className="t-caption text-[14px] mt-3 num">{summarize(config)}</div>
      </div>
      <button
        onClick={handleStart}
        className="tap w-full flex items-center justify-center gap-2 rounded-md py-4 text-[18px] font-bold bg-[var(--color-primary)] text-white"
      >
        <Play className="w-5 h-5" fill="currentColor" />
        Start
      </button>
    </div>
  );
};
