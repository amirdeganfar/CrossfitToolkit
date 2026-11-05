import { useState, useRef, useEffect } from 'react';
import { useClockStore, formatTime } from '../../stores/clockStore';
import { Minus, Plus, Check, X } from 'lucide-react';

type TimeField = 'totalTime' | 'intervalTime' | 'workTime' | 'restTime';
type CountField = 'rounds' | 'sets';

const editInputClass = `
  w-12 px-2 py-1 text-center font-display text-lg num
  bg-[var(--color-bg)] border border-[var(--color-border)] rounded-sm
  text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]
`;

const adjustButtonClass = `
  w-10 h-10 flex items-center justify-center
  bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)] rounded-sm
  text-[var(--color-text-muted)] hover:text-[var(--color-text)]
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-colors
`;

/** Shared store access for the config rows (editing is locked once a timer starts). */
const useConfigState = () => {
  const config = useClockStore((state) => state.config);
  const status = useClockStore((state) => state.status);
  const setConfig = useClockStore((state) => state.setConfig);
  return { config, setConfig, isDisabled: status !== 'idle' };
};

/** Focus + select the minutes input when an editor opens. */
const useFocusOnEdit = (isEditing: boolean) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEditing && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [isEditing]);
  return ref;
};

const cleanMinutes = (value: string) => value.replace(/\D/g, '').slice(0, 3);
/** Digits only, clamped to 0-59. */
const cleanSeconds = (value: string) => {
  const cleaned = value.replace(/\D/g, '').slice(0, 2);
  return parseInt(cleaned) > 59 ? '59' : cleaned;
};

// ── Tappable MM:SS editor ───────────────────────────────────────────────────
const TimeEditor = ({
  label,
  field,
  minSeconds = 5,
}: {
  label: string;
  field: TimeField;
  minSeconds?: number;
}) => {
  const { config, setConfig, isDisabled } = useConfigState();
  const [isEditing, setIsEditing] = useState(false);
  const [editMinutes, setEditMinutes] = useState('');
  const [editSeconds, setEditSeconds] = useState('');
  const minutesRef = useFocusOnEdit(isEditing);

  const currentValue = config[field];
  const minutes = Math.floor(currentValue / 60);
  const seconds = currentValue % 60;

  const startEditing = () => {
    if (isDisabled) return;
    setEditMinutes(minutes.toString());
    setEditSeconds(seconds.toString().padStart(2, '0'));
    setIsEditing(true);
  };

  const handleSave = () => {
    const mins = parseInt(editMinutes) || 0;
    const secs = parseInt(editSeconds) || 0;
    const totalSeconds = Math.max(minSeconds, mins * 60 + secs);
    setConfig({ [field]: totalSeconds });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-between bg-[var(--color-surface)] rounded-md p-3 border border-[var(--color-input-border-hover)]">
        <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              ref={minutesRef}
              type="text"
              inputMode="numeric"
              value={editMinutes}
              onChange={(e) => setEditMinutes(cleanMinutes(e.target.value))}
              onKeyDown={handleKeyDown}
              placeholder="0"
              className={editInputClass}
              aria-label={`${label} minutes`}
            />
            <span className="text-lg font-bold text-[var(--color-text-muted)]">:</span>
            <input
              type="text"
              inputMode="numeric"
              value={editSeconds}
              onChange={(e) => setEditSeconds(cleanSeconds(e.target.value))}
              onKeyDown={handleKeyDown}
              placeholder="00"
              className={editInputClass}
              aria-label={`${label} seconds`}
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="p-1.5 rounded-sm bg-[var(--color-success)] hover:opacity-90 text-white"
            aria-label={`Save ${label.toLowerCase()}`}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-sm bg-[var(--color-surface-elevated)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)]"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-[var(--color-surface)] rounded-md p-3 border border-[var(--color-border)]">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <button
        type="button"
        onClick={startEditing}
        disabled={isDisabled}
        className="
          font-display text-lg text-[var(--color-text)] num
          px-3 py-1 rounded-sm
          hover:bg-[var(--color-surface-elevated)]
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors cursor-pointer
          border border-transparent hover:border-[var(--color-border)]
        "
        title="Tap to edit"
        aria-label={`${label}: ${formatTime(currentValue)}. Tap to edit`}
      >
        {formatTime(currentValue)}
      </button>
    </div>
  );
};

// ── ± number adjuster for rounds/sets ──────────────────────────────────────
const NumberAdjuster = ({ label, field }: { label: string; field: CountField }) => {
  const { config, setConfig, isDisabled } = useConfigState();
  const value = config[field];
  const adjust = (delta: number) => setConfig({ [field]: Math.max(1, value + delta) });

  return (
    <div className="flex items-center justify-between bg-[var(--color-surface)] rounded-md p-3 border border-[var(--color-border)]">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => adjust(-1)}
          disabled={isDisabled || value <= 1}
          className={adjustButtonClass}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="font-display text-xl text-[var(--color-text)] num min-w-[40px] text-center" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          onClick={() => adjust(1)}
          disabled={isDisabled}
          className={adjustButtonClass}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ── For Time: optional time cap ─────────────────────────────────────────────
const TimeCap = () => {
  const { config, setConfig, isDisabled } = useConfigState();
  const [isEditing, setIsEditing] = useState(false);
  const [editMinutes, setEditMinutes] = useState('');
  const [editSeconds, setEditSeconds] = useState('');
  const minutesRef = useFocusOnEdit(isEditing);

  const currentValue = config.totalTime;
  const hasTimeCap = currentValue > 0;
  const minutes = Math.floor(currentValue / 60);
  const seconds = currentValue % 60;

  const startEditing = () => {
    if (isDisabled) return;
    setEditMinutes(hasTimeCap ? minutes.toString() : '');
    setEditSeconds(hasTimeCap ? seconds.toString().padStart(2, '0') : '00');
    setIsEditing(true);
  };

  const handleSave = () => {
    const mins = parseInt(editMinutes) || 0;
    const secs = parseInt(editSeconds) || 0;
    const totalSeconds = mins * 60 + secs;
    setConfig({ totalTime: totalSeconds });
    setIsEditing(false);
  };

  const handleClear = () => {
    setConfig({ totalTime: 0 });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') handleCancel();
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-between bg-[var(--color-surface)] rounded-md p-3 border border-[var(--color-input-border-hover)]">
        <span className="text-sm text-[var(--color-text-muted)]">Time Cap</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              ref={minutesRef}
              type="text"
              inputMode="numeric"
              value={editMinutes}
              onChange={(e) => setEditMinutes(cleanMinutes(e.target.value))}
              onKeyDown={handleKeyDown}
              placeholder="0"
              className={editInputClass}
              aria-label="Time cap minutes"
            />
            <span className="text-lg font-bold text-[var(--color-text-muted)]">:</span>
            <input
              type="text"
              inputMode="numeric"
              value={editSeconds}
              onChange={(e) => setEditSeconds(cleanSeconds(e.target.value))}
              onKeyDown={handleKeyDown}
              placeholder="00"
              className={editInputClass}
              aria-label="Time cap seconds"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="p-1.5 rounded-sm bg-[var(--color-success)] hover:opacity-90 text-white"
            aria-label="Save time cap"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-2 py-1 rounded-sm bg-[var(--color-surface-elevated)] text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            aria-label="No time cap"
          >
            NONE
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-sm bg-[var(--color-surface-elevated)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)]"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-[var(--color-surface)] rounded-md p-3 border border-[var(--color-border)]">
      <span className="text-sm text-[var(--color-text-muted)]">Time Cap</span>
      <button
        type="button"
        onClick={startEditing}
        disabled={isDisabled}
        className={`
          font-display text-lg num
          px-3 py-1 rounded-sm
          hover:bg-[var(--color-surface-elevated)]
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors cursor-pointer
          border border-transparent hover:border-[var(--color-border)]
          ${hasTimeCap ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}
        `}
        title="Tap to edit"
        aria-label={`Time cap: ${hasTimeCap ? formatTime(currentValue) : 'none'}. Tap to edit`}
      >
        {hasTimeCap ? formatTime(currentValue) : 'NONE'}
      </button>
    </div>
  );
};

/**
 * Timer configuration panel for setting up each mode
 */
export const TimerConfig = () => {
  const mode = useClockStore((state) => state.config.mode);

  return (
    <div className="space-y-3">
      {/* AMRAP config */}
      {mode === 'amrap' && (
        <TimeEditor label="Total Time" field="totalTime" minSeconds={60} />
      )}

      {/* EMOM config */}
      {mode === 'emom' && (
        <>
          <TimeEditor label="Interval" field="intervalTime" minSeconds={10} />
          <NumberAdjuster label="Rounds" field="rounds" />
        </>
      )}

      {/* For Time config */}
      {mode === 'forTime' && (
        <TimeCap />
      )}

      {/* Tabata config */}
      {mode === 'tabata' && (
        <>
          <TimeEditor label="Work" field="workTime" minSeconds={5} />
          <TimeEditor label="Rest" field="restTime" minSeconds={5} />
          <NumberAdjuster label="Rounds" field="rounds" />
        </>
      )}

      {/* Custom config */}
      {mode === 'custom' && (
        <>
          <TimeEditor label="Work" field="workTime" minSeconds={5} />
          <TimeEditor label="Rest" field="restTime" minSeconds={5} />
          <NumberAdjuster label="Rounds" field="rounds" />
          <NumberAdjuster label="Sets" field="sets" />
        </>
      )}
    </div>
  );
};
