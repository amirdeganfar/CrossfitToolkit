import { useState, useRef, useEffect } from 'react';
import { useClockStore, formatTime } from '../../stores/clockStore';
import { Minus, Plus, Check, X } from 'lucide-react';

/**
 * Timer configuration panel for setting up each mode
 */
export const TimerConfig = () => {
  const config = useClockStore((state) => state.config);
  const status = useClockStore((state) => state.status);
  const setConfig = useClockStore((state) => state.setConfig);

  const isDisabled = status !== 'idle';

  // Increment/decrement for rounds/sets
  const adjustNumber = (field: 'rounds' | 'sets', delta: number) => {
    const current = config[field];
    const newValue = Math.max(1, current + delta);
    setConfig({ [field]: newValue });
  };

  // Render a time input component (tappable to edit)
  const TimeEditor = ({ 
    label, 
    field,
    minSeconds = 5,
  }: { 
    label: string; 
    field: 'totalTime' | 'intervalTime' | 'workTime' | 'restTime';
    minSeconds?: number;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editMinutes, setEditMinutes] = useState('');
    const [editSeconds, setEditSeconds] = useState('');
    const minutesRef = useRef<HTMLInputElement>(null);
    const secondsRef = useRef<HTMLInputElement>(null);

    const currentValue = config[field];
    const minutes = Math.floor(currentValue / 60);
    const seconds = currentValue % 60;

    const startEditing = () => {
      if (isDisabled) return;
      setEditMinutes(minutes.toString());
      setEditSeconds(seconds.toString().padStart(2, '0'));
      setIsEditing(true);
    };

    useEffect(() => {
      if (isEditing && minutesRef.current) {
        minutesRef.current.focus();
        minutesRef.current.select();
      }
    }, [isEditing]);

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

    const handleMinutesChange = (value: string) => {
      const cleaned = value.replace(/\D/g, '').slice(0, 3);
      setEditMinutes(cleaned);
    };

    const handleSecondsChange = (value: string) => {
      const cleaned = value.replace(/\D/g, '').slice(0, 2);
      setEditSeconds(cleaned);
      // Clamp seconds to 59
      if (parseInt(cleaned) > 59) {
        setEditSeconds('59');
      }
    };

    const handleSecondsBlur = () => {
      // Normalize seconds > 59
      const secs = parseInt(editSeconds) || 0;
      if (secs > 59) {
        const extraMins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        setEditMinutes(((parseInt(editMinutes) || 0) + extraMins).toString());
        setEditSeconds(remainingSecs.toString().padStart(2, '0'));
      } else {
        setEditSeconds(secs.toString().padStart(2, '0'));
      }
    };

    if (isEditing) {
      return (
        <div className="flex items-center justify-between bg-[var(--color-surface)] rounded-lg p-3 border border-[var(--color-primary)]">
          <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input
                ref={minutesRef}
                type="text"
                inputMode="numeric"
                value={editMinutes}
                onChange={(e) => handleMinutesChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0"
                className="
                  w-12 px-2 py-1 text-center font-mono text-lg
                  bg-[var(--color-bg)] border border-[var(--color-border)] rounded
                  text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]
                "
                aria-label="Minutes"
              />
              <span className="text-lg font-bold text-[var(--color-text-muted)]">:</span>
              <input
                ref={secondsRef}
                type="text"
                inputMode="numeric"
                value={editSeconds}
                onChange={(e) => handleSecondsChange(e.target.value)}
                onBlur={handleSecondsBlur}
                onKeyDown={handleKeyDown}
                placeholder="00"
                className="
                  w-12 px-2 py-1 text-center font-mono text-lg
                  bg-[var(--color-bg)] border border-[var(--color-border)] rounded
                  text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]
                "
                aria-label="Seconds"
              />
            </div>
            <button
              onClick={handleSave}
              className="p-1.5 rounded bg-green-600 hover:bg-green-500 text-white"
              aria-label="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded bg-[var(--color-surface-elevated)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)]"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between bg-[var(--color-surface)] rounded-lg p-3 border border-[var(--color-border)]">
        <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
        <button
          onClick={startEditing}
          disabled={isDisabled}
          className="
            font-mono text-lg font-semibold text-[var(--color-text)]
            px-3 py-1 rounded-lg
            hover:bg-[var(--color-surface-elevated)]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors cursor-pointer
            border border-transparent hover:border-[var(--color-border)]
          "
          title="Tap to edit"
        >
          {formatTime(currentValue)}
        </button>
      </div>
    );
  };

  // Render a number adjuster component
  const NumberAdjuster = ({ 
    label, 
    field 
  }: { 
    label: string; 
    field: 'rounds' | 'sets';
  }) => (
    <div className="flex items-center justify-between bg-[var(--color-surface)] rounded-lg p-3 border border-[var(--color-border)]">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => adjustNumber(field, -1)}
          disabled={isDisabled || config[field] <= 1}
          className="
            w-8 h-8 flex items-center justify-center
            bg-[var(--color-surface-elevated)] rounded-lg
            text-[var(--color-text-muted)] hover:text-[var(--color-text)]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="font-mono text-lg font-semibold text-[var(--color-text)] min-w-[40px] text-center">
          {config[field]}
        </span>
        <button
          onClick={() => adjustNumber(field, 1)}
          disabled={isDisabled}
          className="
            w-8 h-8 flex items-center justify-center
            bg-[var(--color-surface-elevated)] rounded-lg
            text-[var(--color-text-muted)] hover:text-[var(--color-text)]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // For Time mode - special handling for optional time cap
  const TimeCap = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [editMinutes, setEditMinutes] = useState('');
    const [editSeconds, setEditSeconds] = useState('');
    const minutesRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
      if (isEditing && minutesRef.current) {
        minutesRef.current.focus();
        minutesRef.current.select();
      }
    }, [isEditing]);

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
        <div className="flex items-center justify-between bg-[var(--color-surface)] rounded-lg p-3 border border-[var(--color-primary)]">
          <span className="text-sm text-[var(--color-text-muted)]">Time Cap</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input
                ref={minutesRef}
                type="text"
                inputMode="numeric"
                value={editMinutes}
                onChange={(e) => setEditMinutes(e.target.value.replace(/\D/g, '').slice(0, 3))}
                onKeyDown={handleKeyDown}
                placeholder="0"
                className="
                  w-12 px-2 py-1 text-center font-mono text-lg
                  bg-[var(--color-bg)] border border-[var(--color-border)] rounded
                  text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]
                "
              />
              <span className="text-lg font-bold text-[var(--color-text-muted)]">:</span>
              <input
                type="text"
                inputMode="numeric"
                value={editSeconds}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                  setEditSeconds(parseInt(val) > 59 ? '59' : val);
                }}
                onKeyDown={handleKeyDown}
                placeholder="00"
                className="
                  w-12 px-2 py-1 text-center font-mono text-lg
                  bg-[var(--color-bg)] border border-[var(--color-border)] rounded
                  text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]
                "
              />
            </div>
            <button
              onClick={handleSave}
              className="p-1.5 rounded bg-green-600 hover:bg-green-500 text-white"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              className="px-2 py-1 rounded bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              None
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded bg-[var(--color-surface-elevated)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between bg-[var(--color-surface)] rounded-lg p-3 border border-[var(--color-border)]">
        <span className="text-sm text-[var(--color-text-muted)]">Time Cap</span>
        <button
          onClick={startEditing}
          disabled={isDisabled}
          className="
            font-mono text-lg font-semibold
            px-3 py-1 rounded-lg
            hover:bg-[var(--color-surface-elevated)]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors cursor-pointer
            border border-transparent hover:border-[var(--color-border)]
            ${hasTimeCap ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}
          "
          title="Tap to edit"
        >
          {hasTimeCap ? formatTime(currentValue) : 'None'}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* AMRAP config */}
      {config.mode === 'amrap' && (
        <TimeEditor label="Total Time" field="totalTime" minSeconds={60} />
      )}

      {/* EMOM config */}
      {config.mode === 'emom' && (
        <>
          <TimeEditor label="Interval" field="intervalTime" minSeconds={10} />
          <NumberAdjuster label="Rounds" field="rounds" />
        </>
      )}

      {/* For Time config */}
      {config.mode === 'forTime' && (
        <TimeCap />
      )}

      {/* Tabata config */}
      {config.mode === 'tabata' && (
        <>
          <TimeEditor label="Work" field="workTime" minSeconds={5} />
          <TimeEditor label="Rest" field="restTime" minSeconds={5} />
          <NumberAdjuster label="Rounds" field="rounds" />
        </>
      )}

      {/* Custom config */}
      {config.mode === 'custom' && (
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
