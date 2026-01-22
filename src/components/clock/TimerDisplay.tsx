import { useClockStore, formatTime } from '../../stores/clockStore';

/**
 * Large timer display with color-coded states
 */
export const TimerDisplay = () => {
  const status = useClockStore((state) => state.status);
  const phase = useClockStore((state) => state.phase);
  const timeRemaining = useClockStore((state) => state.timeRemaining);
  const config = useClockStore((state) => state.config);
  const currentRound = useClockStore((state) => state.currentRound);
  const currentSet = useClockStore((state) => state.currentSet);

  // Determine background color based on state
  const getBackgroundClass = (): string => {
    if (status === 'countdown') {
      return 'bg-yellow-500/20';
    }
    if (status === 'complete') {
      return 'bg-green-500/20';
    }
    if (status === 'paused') {
      return 'bg-gray-500/20';
    }
    if (phase === 'rest') {
      return 'bg-red-500/20';
    }
    if (status === 'running') {
      return 'bg-green-500/20';
    }
    return 'bg-[var(--color-surface)]';
  };

  // Determine text color based on state
  const getTextClass = (): string => {
    if (status === 'countdown') {
      return 'text-yellow-400';
    }
    if (status === 'complete') {
      return 'text-green-400';
    }
    if (phase === 'rest' && (status === 'rest' || status === 'paused')) {
      return 'text-red-400';
    }
    if (status === 'running') {
      return 'text-green-400';
    }
    return 'text-[var(--color-text)]';
  };

  // Get the display time
  const getDisplayTime = (): string => {
    if (status === 'countdown') {
      return Math.ceil(timeRemaining).toString();
    }
    return formatTime(timeRemaining);
  };

  // Get the status label
  const getStatusLabel = (): string => {
    switch (status) {
      case 'countdown':
        return 'GET READY';
      case 'running':
        return phase === 'work' ? 'WORK' : 'WORK';
      case 'rest':
        return 'REST';
      case 'paused':
        return 'PAUSED';
      case 'complete':
        return 'COMPLETE';
      default:
        return getModeLabel();
    }
  };

  // Get the mode label
  const getModeLabel = (): string => {
    switch (config.mode) {
      case 'amrap':
        return 'AMRAP';
      case 'emom':
        return 'EMOM';
      case 'forTime':
        return 'FOR TIME';
      case 'tabata':
        return 'TABATA';
      case 'custom':
        return 'CUSTOM';
      default:
        return '';
    }
  };

  // Show rounds info
  const showRounds = config.mode === 'emom' || config.mode === 'tabata' || config.mode === 'custom';
  const showSets = config.mode === 'custom' && config.sets > 1;

  return (
    <div 
      className={`
        rounded-2xl p-8 flex flex-col items-center justify-center
        transition-colors duration-300
        ${getBackgroundClass()}
        border border-[var(--color-border)]
      `}
    >
      {/* Status Label */}
      <div className="text-sm font-semibold tracking-widest text-[var(--color-text-muted)] mb-2">
        {getStatusLabel()}
      </div>

      {/* Main Timer Display */}
      <div 
        className={`
          font-mono font-bold tracking-tight
          transition-colors duration-300
          ${getTextClass()}
          ${status === 'countdown' ? 'text-9xl' : 'text-7xl sm:text-8xl'}
        `}
      >
        {getDisplayTime()}
      </div>

      {/* Round/Set Info */}
      {showRounds && status !== 'idle' && status !== 'countdown' && (
        <div className="mt-4 flex items-center gap-4 text-[var(--color-text-muted)]">
          {showSets && (
            <div className="text-sm">
              <span className="font-semibold text-[var(--color-text)]">{currentSet}</span>
              <span className="mx-1">/</span>
              <span>{config.sets}</span>
              <span className="ml-1 text-xs">SETS</span>
            </div>
          )}
          <div className="text-sm">
            <span className="font-semibold text-[var(--color-text)]">{currentRound}</span>
            <span className="mx-1">/</span>
            <span>{config.rounds}</span>
            <span className="ml-1 text-xs">ROUNDS</span>
          </div>
        </div>
      )}

      {/* Phase indicator for Tabata/Custom */}
      {(config.mode === 'tabata' || config.mode === 'custom') && 
       status !== 'idle' && 
       status !== 'countdown' && 
       status !== 'complete' && (
        <div className="mt-3 flex gap-2">
          <div 
            className={`
              px-3 py-1 rounded-full text-xs font-semibold
              ${phase === 'work' 
                ? 'bg-green-500/30 text-green-400' 
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
              }
            `}
          >
            WORK
          </div>
          <div 
            className={`
              px-3 py-1 rounded-full text-xs font-semibold
              ${phase === 'rest' 
                ? 'bg-red-500/30 text-red-400' 
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
              }
            `}
          >
            REST
          </div>
        </div>
      )}

      {/* Mode label when idle */}
      {status === 'idle' && (
        <div className="mt-4 text-xs text-[var(--color-text-muted)]">
          {config.mode === 'amrap' && `${formatTime(config.totalTime)} total`}
          {config.mode === 'emom' && `${config.rounds} rounds × ${formatTime(config.intervalTime)}`}
          {config.mode === 'forTime' && (config.totalTime > 0 ? `Time cap: ${formatTime(config.totalTime)}` : 'No time cap')}
          {config.mode === 'tabata' && `${config.rounds} rounds: ${config.workTime}s work / ${config.restTime}s rest`}
          {config.mode === 'custom' && `${config.sets > 1 ? `${config.sets} sets × ` : ''}${config.rounds} rounds`}
        </div>
      )}
    </div>
  );
};
