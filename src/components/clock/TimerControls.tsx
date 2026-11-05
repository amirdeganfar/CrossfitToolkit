import { useState } from 'react';
import { Play, Pause, RotateCcw, Square, X, Check } from 'lucide-react';
import { useClockStore } from '../../stores/clockStore';
import { initializeAudio } from '../../utils/audioUtils';
import { ConfirmDialog } from '../ConfirmDialog';

interface TimerControlsProps {
  /** Phase tint (CSS color) — used as the primary button's text color on white. */
  toneColor: string;
}

const baseBtn =
  'tap flex items-center justify-center gap-2.5 rounded-lg font-bold min-h-[64px] landscape:min-h-[52px] select-none';
// White fill + phase-colored text: same contrast as white-on-tint (>= 5.19:1).
const primaryBtn = `${baseBtn} flex-1 bg-white text-[22px] shadow-[0_6px_24px_rgba(0,0,0,0.25)]`;
// Translucent dark well: white text >= 7.44:1 on every tint.
const secondaryBtn = `${baseBtn} px-5 bg-black/25 text-white text-[17px] border border-white/25`;

/**
 * Big, thumb-reachable controls for the immersive timer stage.
 * Stopping a running/paused workout asks first — a mid-burpee mis-tap
 * shouldn't wipe the clock.
 */
export const TimerControls = ({ toneColor }: TimerControlsProps) => {
  const status = useClockStore((state) => state.status);
  const start = useClockStore((state) => state.start);
  const pause = useClockStore((state) => state.pause);
  const resume = useClockStore((state) => state.resume);
  const reset = useClockStore((state) => state.reset);
  const [confirmStop, setConfirmStop] = useState(false);

  const handleResume = () => { initializeAudio(); resume(); };
  const handleRestart = () => { initializeAudio(); reset(); start(); };
  const handleConfirmStop = () => { setConfirmStop(false); reset(); };

  return (
    <div className="flex gap-3">
      {/* Countdown → cancel only (nothing to lose yet, so no confirm) */}
      {status === 'countdown' && (
        <button onClick={reset} className={`${secondaryBtn} flex-1`}>
          <X className="w-6 h-6" />
          Cancel
        </button>
      )}

      {/* Running → STOP + PAUSE */}
      {(status === 'running' || status === 'rest') && (
        <>
          <button onClick={() => setConfirmStop(true)} className={secondaryBtn} aria-label="Stop workout">
            <Square className="w-5 h-5" fill="currentColor" />
            Stop
          </button>
          <button onClick={pause} className={primaryBtn} style={{ color: toneColor }}>
            <Pause className="w-7 h-7" fill="currentColor" />
            Pause
          </button>
        </>
      )}

      {/* Paused → END + RESUME */}
      {status === 'paused' && (
        <>
          <button onClick={() => setConfirmStop(true)} className={secondaryBtn} aria-label="End workout">
            <Square className="w-5 h-5" fill="currentColor" />
            End
          </button>
          <button onClick={handleResume} className={primaryBtn} style={{ color: toneColor }}>
            <Play className="w-7 h-7" fill="currentColor" />
            Resume
          </button>
        </>
      )}

      {/* Complete → RESTART + DONE (back to setup) */}
      {status === 'complete' && (
        <>
          <button onClick={handleRestart} className={secondaryBtn}>
            <RotateCcw className="w-5 h-5" />
            Restart
          </button>
          <button onClick={reset} className={primaryBtn} style={{ color: toneColor }}>
            <Check className="w-7 h-7" strokeWidth={3} />
            Done
          </button>
        </>
      )}

      {confirmStop && (
        <ConfirmDialog
          title="End this workout?"
          message="The clock resets and you go back to setup."
          confirmLabel="End workout"
          cancelLabel="Keep going"
          isDestructive
          onConfirm={handleConfirmStop}
          onCancel={() => setConfirmStop(false)}
        />
      )}
    </div>
  );
};
