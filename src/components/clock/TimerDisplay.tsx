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

  const getBackgroundClass = (): string => {
    if (status === 'countdown') return 'bg-[#1A1500] border-[var(--color-warning)]/30';
    if (status === 'complete')  return 'bg-[#001A08] border-[var(--color-success)]/30';
    if (status === 'paused')    return 'bg-[var(--color-surface)] border-[var(--color-border-strong)]';
    if (phase === 'rest')       return 'bg-[#1A0800] border-[var(--color-primary)]/30';
    if (status === 'running')   return 'bg-[#001A08] border-[var(--color-success)]/30';
    return 'bg-[var(--color-surface)] border-[var(--color-border)]';
  };

  const getTextClass = (): string => {
    if (status === 'countdown') return 'text-[var(--color-warning)]';
    if (status === 'complete')  return 'text-[var(--color-success)]';
    if (phase === 'rest' && (status === 'rest' || status === 'paused')) return 'text-[var(--color-primary)]';
    if (status === 'running')   return 'text-[var(--color-success)]';
    return 'text-[var(--color-text)]';
  };

  const getDisplayTime = (): string => {
    if (status === 'countdown') return Math.ceil(timeRemaining).toString();
    return formatTime(timeRemaining);
  };

  const getStatusLabel = (): string => {
    switch (status) {
      case 'countdown': return 'GET READY';
      case 'running':   return phase === 'rest' ? 'REST' : 'WORK';
      case 'rest':      return 'REST';
      case 'paused':    return 'PAUSED';
      case 'complete':  return 'COMPLETE';
      default:          return getModeLabel();
    }
  };

  const getModeLabel = (): string => {
    switch (config.mode) {
      case 'amrap':   return 'AMRAP';
      case 'emom':    return 'EMOM';
      case 'forTime': return 'FOR TIME';
      case 'tabata':  return 'TABATA';
      case 'custom':  return 'CUSTOM';
      default:        return '';
    }
  };

  const showRounds = config.mode === 'emom' || config.mode === 'tabata' || config.mode === 'custom';
  const showSets = config.mode === 'custom' && config.sets > 1;

  return (
    <div
      className={`
        rounded-lg border flex flex-col items-center justify-center
        transition-colors duration-300 py-10 px-6
        ${getBackgroundClass()}
      `}
    >
      {/* Status label */}
      <div className="font-display text-sm tracking-[0.2em] text-[var(--color-text-muted)] mb-3">
        {getStatusLabel()}
      </div>

      {/* Main digits */}
      <div
        className={`
          timer-digits transition-colors duration-300
          ${getTextClass()}
          ${status === 'countdown' ? 'text-[9rem]' : 'text-[7rem] sm:text-[9rem]'}
          ${status === 'paused' ? 'animate-timer-pulse' : ''}
        `}
      >
        {getDisplayTime()}
      </div>

      {/* Round / Set info */}
      {showRounds && status !== 'idle' && status !== 'countdown' && (
        <div className="mt-5 flex items-center gap-6">
          {showSets && (
            <div className="text-center">
              <div className="font-display text-2xl text-[var(--color-text)]">
                {currentSet}<span className="text-[var(--color-text-muted)] text-lg">/{config.sets}</span>
              </div>
              <div className="text-[10px] tracking-widest text-[var(--color-text-muted)] mt-0.5">SETS</div>
            </div>
          )}
          <div className="text-center">
            <div className="font-display text-2xl text-[var(--color-text)]">
              {currentRound}<span className="text-[var(--color-text-muted)] text-lg">/{config.rounds}</span>
            </div>
            <div className="text-[10px] tracking-widest text-[var(--color-text-muted)] mt-0.5">ROUNDS</div>
          </div>
        </div>
      )}

      {/* Work / Rest phase pills — Tabata & Custom */}
      {(config.mode === 'tabata' || config.mode === 'custom') &&
        status !== 'idle' && status !== 'countdown' && status !== 'complete' && (
        <div className="mt-4 flex gap-2">
          <div className={`px-4 py-1 text-xs font-display tracking-widest rounded-sm border ${
            phase === 'work'
              ? 'bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]/40'
              : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]'
          }`}>WORK</div>
          <div className={`px-4 py-1 text-xs font-display tracking-widest rounded-sm border ${
            phase === 'rest'
              ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/40'
              : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]'
          }`}>REST</div>
        </div>
      )}

      {/* Idle config summary */}
      {status === 'idle' && (
        <div className="mt-4 text-xs tracking-widest text-[var(--color-text-muted)] uppercase">
          {config.mode === 'amrap'   && `${formatTime(config.totalTime)} total`}
          {config.mode === 'emom'    && `${config.rounds} rounds × ${formatTime(config.intervalTime)}`}
          {config.mode === 'forTime' && (config.totalTime > 0 ? `Cap: ${formatTime(config.totalTime)}` : 'No time cap')}
          {config.mode === 'tabata'  && `${config.rounds} rounds · ${config.workTime}s / ${config.restTime}s`}
          {config.mode === 'custom'  && `${config.sets > 1 ? `${config.sets} sets × ` : ''}${config.rounds} rounds`}
        </div>
      )}
    </div>
  );
};
