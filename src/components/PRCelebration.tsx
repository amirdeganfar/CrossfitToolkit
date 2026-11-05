import { useEffect, useState, type CSSProperties } from 'react';
import { Target } from 'lucide-react';
import { Stat } from './Stat';
import { PRBadge } from './PRBadge';

export interface Celebration {
  /** Unique per celebration so a repeat PR replays the animation. */
  id: number;
  isPR: boolean;
  /** Target of the goal just achieved, e.g. "120kg". */
  goalTarget?: string;
  itemName: string;
  /** Pool context shown over the value, e.g. "3RM", "5km", "Rx". */
  context?: string;
  /** New result, formatted in the user's units, e.g. "110kg", "3:48". */
  value: string;
  /** Change vs the previous best, e.g. "+10kg", "−0:12". */
  improvement?: string;
  /** Previous best, formatted, e.g. "100kg". */
  previous?: string;
}

interface PRCelebrationProps {
  celebration: Celebration | null;
  onDone: () => void;
}

const SHOW_MS = 3000;
const EXIT_MS = 180;
const SPARKS = 14;

/**
 * Brief, non-modal celebration after a new PR / achieved goal. Auto-dismisses;
 * tap anywhere or Escape dismisses early. Announced via a persistent polite
 * live region (the visual layer is aria-hidden so it isn't read twice).
 */
export function PRCelebration({ celebration, onDone }: PRCelebrationProps) {
  // Mounted always so the live region exists before its text changes.
  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {celebration ? announcement(celebration) : ''}
      </div>
      {celebration && <CelebrationLayer key={celebration.id} celebration={celebration} onDone={onDone} />}
    </>
  );
}

const announcement = (c: Celebration): string => {
  const head = c.isPR ? `New PR on ${c.itemName}` : `Goal achieved on ${c.itemName}`;
  const value = [c.context, c.value].filter(Boolean).join(' ');
  const diff = c.improvement && c.previous ? `, ${c.improvement} from ${c.previous}` : '';
  const goal = c.isPR && c.goalTarget ? `. Goal of ${c.goalTarget} achieved` : '';
  return `${head}: ${value}${diff}${goal}.`;
};

function CelebrationLayer({ celebration: c, onDone }: { celebration: Celebration; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setLeaving(true), SHOW_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLeaving(true);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(onDone, EXIT_MS);
    return () => window.clearTimeout(t);
  }, [leaving, onDone]);

  const goalOnly = !c.isPR;

  return (
    <div
      className={`pr-layer ${leaving ? 'pr-leaving' : ''}`}
      onClick={() => setLeaving(true)}
      aria-hidden="true"
      data-testid="pr-celebration"
    >
      <div className={`pr-card ${goalOnly ? 'pr-card-goal' : ''}`}>
        <div className="pr-burst">
          <span className="pr-ring" />
          <span className="pr-ring pr-ring-2" />
          {Array.from({ length: SPARKS }, (_, i) => (
            <span
              key={i}
              className={`pr-spark ${i % 3 === 0 ? 'pr-spark-light' : ''}`}
              style={{ '--a': `${(360 / SPARKS) * i}deg`, '--d': `${i % 2 ? 64 : 84}px` } as CSSProperties}
            />
          ))}
        </div>

        <div className="relative flex items-center justify-center gap-2">
          {goalOnly ? (
            <Target size={16} className="text-[var(--color-success)]" />
          ) : (
            <PRBadge className="text-[11px]" />
          )}
          <p className="font-display text-[20px] font-bold tracking-[-0.01em]">
            {goalOnly ? 'Goal achieved' : 'New PR'}
          </p>
        </div>
        <p className="relative mt-1 text-[15px] font-medium text-[var(--color-text-muted)] truncate">{c.itemName}</p>

        <div className="relative mt-5">
          {c.context && <p className="t-caption num mb-1">{c.context}</p>}
          <div className="pr-value">
            <Stat text={c.value} size="hero" tone="primary" />
          </div>
        </div>

        {c.improvement && (
          <p className="pr-delta relative mt-3 num">
            <span className="font-display text-[17px] font-bold text-[var(--color-success)]">{c.improvement}</span>
            {c.previous && <span className="ml-2 text-[13px] text-[var(--color-text-muted)]">from {c.previous}</span>}
          </p>
        )}

        {c.isPR && c.goalTarget && (
          <p className="pr-delta relative mt-4 pt-3 border-t border-[var(--color-border-strong)] flex items-center justify-center gap-1.5 text-[13px] font-semibold num">
            <Target size={13} className="text-[var(--color-success)]" />
            Goal of {c.goalTarget} achieved
          </p>
        )}
        {goalOnly && c.goalTarget && (
          <p className="pr-delta relative mt-3 text-[13px] text-[var(--color-text-muted)] num">Target {c.goalTarget}</p>
        )}

        <span className="pr-timer" style={{ animationDuration: `${SHOW_MS}ms` }} />
      </div>
    </div>
  );
}
