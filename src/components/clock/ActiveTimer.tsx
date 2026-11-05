import type { CSSProperties } from 'react';
import { Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { useClockStore, useProgress, formatTime, type TimerConfig } from '../../stores/clockStore';
import { TimerControls } from './TimerControls';

type Tone = 'ready' | 'work' | 'rest' | 'paused' | 'done';

const TONE_LABEL: Record<Tone, string> = {
  ready: 'Get ready',
  work: 'Work',
  rest: 'Rest',
  paused: 'Paused',
  done: 'Done',
};

const MODE_LABEL: Record<TimerConfig['mode'], string> = {
  amrap: 'AMRAP',
  emom: 'EMOM',
  forTime: 'For time',
  tabata: 'Tabata',
  custom: 'Custom',
};

/** Approximate rendered width of the digits in em, so the font can be sized to fill the width. */
const digitsWidthEm = (text: string): number =>
  [...text].reduce((w, ch) => w + (ch === ':' ? 0.28 : 0.54), 0);

interface ActiveTimerProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

/**
 * Immersive full-screen timer: the whole screen is tinted by phase, digits
 * fill the width, controls sit at the bottom for a thumb.
 */
export const ActiveTimer = ({ isFullscreen, onToggleFullscreen }: ActiveTimerProps) => {
  const status = useClockStore((state) => state.status);
  const phase = useClockStore((state) => state.phase);
  const timeRemaining = useClockStore((state) => state.timeRemaining);
  const config = useClockStore((state) => state.config);
  const currentRound = useClockStore((state) => state.currentRound);
  const currentSet = useClockStore((state) => state.currentSet);
  const soundEnabled = useClockStore((state) => state.soundEnabled);
  const toggleSound = useClockStore((state) => state.toggleSound);
  const rawProgress = useProgress();

  // Underlying phase ignores pause, so pausing doesn't trigger a flash.
  const basePhase: Tone =
    status === 'countdown' ? 'ready' : status === 'complete' ? 'done' : phase === 'rest' ? 'rest' : 'work';
  const tone: Tone = status === 'paused' ? 'paused' : basePhase;
  const toneColor = `var(--color-phase-${tone})`;

  const hasRounds = config.mode === 'emom' || config.mode === 'tabata' || config.mode === 'custom';
  const hasSets = config.mode === 'custom' && config.sets > 1;

  const seconds = Math.ceil(timeRemaining);
  const displayTime = status === 'countdown' ? seconds.toString() : formatTime(timeRemaining);
  const countsDown = config.mode !== 'forTime';
  const isTicking = status === 'running' || status === 'rest' || status === 'countdown';
  const isFinalSeconds = isTicking && countsDown && seconds > 0 && seconds <= 3;

  const progress = Number.isFinite(rawProgress) ? Math.min(100, Math.max(0, rawProgress)) : 0;
  const showProgress =
    status !== 'countdown' && status !== 'complete' && !(config.mode === 'forTime' && config.totalTime <= 0);

  const subline = hasRounds
    ? null
    : config.mode === 'amrap'
      ? `AMRAP ${formatTime(config.totalTime)}`
      : config.totalTime > 0 ? `Cap ${formatTime(config.totalTime)}` : 'No time cap';

  // Screen-reader announcement: changes only on phase/round/status, never per second.
  const announcement = [
    TONE_LABEL[tone],
    hasRounds && status !== 'countdown' ? `round ${currentRound} of ${config.rounds}` : null,
    hasSets && status !== 'countdown' ? `set ${currentSet} of ${config.sets}` : null,
  ].filter(Boolean).join(', ');

  const iconBtn =
    'tap w-11 h-11 flex items-center justify-center rounded-full bg-black/20 border border-white/20 text-white';

  return (
    <section
      className="timer-stage"
      style={{ '--stage-bg': toneColor } as CSSProperties}
      aria-label="Workout timer"
    >
      {/* Phase-change wash: keyed on phase + round so it replays on each change */}
      <div key={`${basePhase}-${currentSet}-${currentRound}`} className="timer-flash" aria-hidden="true" />

      {/* Interval progress */}
      <div
        className={`h-1.5 w-full bg-white/25 shrink-0 ${showProgress ? '' : 'invisible'}`}
        role="progressbar"
        aria-label="Interval progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-hidden={!showProgress}
      >
        <div className="h-full bg-white transition-[width] duration-300 ease-linear" style={{ width: `${progress}%` }} />
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col px-5 pt-4 pb-4 landscape:pt-2 landscape:pb-3 max-w-5xl w-full mx-auto">
        {/* Top: phase + utilities */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="timer-phase-label" aria-hidden="true">{TONE_LABEL[tone]}</div>
            <div className="mt-1.5 text-[15px] font-semibold">
              {status === 'paused' ? `${TONE_LABEL[basePhase]} paused` : MODE_LABEL[config.mode]}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={toggleSound}
              className={iconBtn}
              aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
              aria-pressed={soundEnabled}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={onToggleFullscreen}
              className={iconBtn}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Centre: digits + round counter */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center">
          <div
            key={isFinalSeconds ? `beat-${seconds}` : 'steady'}
            className={`timer-stage-digits num ${isFinalSeconds ? 'timer-beat' : ''} ${status === 'paused' ? 'animate-timer-pulse' : ''}`}
            style={{ fontSize: `min(calc(90vw / ${digitsWidthEm(displayTime).toFixed(2)}), 46dvh)` }}
          >
            {displayTime}
          </div>

          {status !== 'countdown' && (hasRounds || subline) && (
            <div className="timer-round num mt-[2vh] flex flex-wrap items-baseline justify-center gap-x-6">
              {hasRounds && <span>Round {currentRound} / {config.rounds}</span>}
              {hasSets && <span>Set {currentSet} / {config.sets}</span>}
              {subline && <span>{subline}</span>}
            </div>
          )}
        </div>

        {/* Bottom: controls */}
        <div className="pt-3">
          <TimerControls toneColor={toneColor} />
        </div>
      </div>

      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    </section>
  );
};
