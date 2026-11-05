import { useRef, useState, useCallback } from 'react';

interface TimeInputProps {
  value: string; // Format: "MM:SS" or "HH:MM:SS"
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  /** id for the first input (lets an external <label htmlFor> target it). */
  id?: string;
}

/** Highest value a field may hold: seconds always, minutes when hours are shown. */
const MAX_SEXAGESIMAL = 59;

export const TimeInput = ({
  value,
  onChange,
  autoFocus = false,
  className = '',
  id,
}: TimeInputProps) => {
  // Parse initial value (only on mount)
  const parseValue = useCallback((val: string) => {
    if (!val) return { hours: '', minutes: '', seconds: '' };
    
    const parts = val.split(':');
    if (parts.length === 3) {
      return {
        hours: parts[0] || '',
        minutes: parts[1] || '',
        seconds: parts[2] || '',
      };
    } else if (parts.length === 2) {
      return {
        hours: '',
        minutes: parts[0] || '',
        seconds: parts[1] || '',
      };
    }
    return { hours: '', minutes: '', seconds: '' };
  }, []);

  const [showHours, setShowHours] = useState(() => {
    const parsed = parseValue(value);
    return parsed.hours !== '' && parsed.hours !== '0';
  });
  
  const [fields, setFields] = useState(() => parseValue(value));

  // Sync from the prop when the parent changes it externally (e.g. cleared on
  // mode switch). Values we emitted ourselves are recorded in `syncedValue`, so
  // the user's in-progress typing (e.g. unpadded "4:3") is never clobbered.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    const parsed = parseValue(value);
    setFields(parsed);
    setShowHours(parsed.hours !== '' && parsed.hours !== '0');
  }

  const hoursRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const secondsRef = useRef<HTMLInputElement>(null);

  // Build and emit the time string (without padding during input)
  const emitValue = useCallback((newFields: typeof fields) => {
    const { hours, minutes, seconds } = newFields;
    const emit = (next: string) => {
      setSyncedValue(next);
      onChange(next);
    };
    
    if (showHours && hours) {
      // HH:MM:SS format - only pad when both digits are entered
      const h = hours;
      const m = minutes.length === 2 ? minutes : minutes.padStart(2, '0');
      const s = seconds.length === 2 ? seconds : seconds.padStart(2, '0');
      emit(`${h}:${m}:${s}`);
    } else if (minutes || seconds) {
      // MM:SS format - only pad seconds when both digits are entered
      const m = minutes || '0';
      const s = seconds.length === 2 ? seconds : seconds.padStart(2, '0');
      emit(`${m}:${s}`);
    } else {
      emit('');
    }
  }, [showHours, onChange]);

  const handleFieldChange = (
    field: 'hours' | 'minutes' | 'seconds',
    inputValue: string
  ) => {
    // Only allow digits
    const cleaned = inputValue.replace(/\D/g, '');
    
    // Limit length
    let truncated = cleaned.slice(0, 2);

    // Clamp seconds (and minutes when hours are shown) to 0-59
    const isSexagesimal = field === 'seconds' || (field === 'minutes' && showHours);
    if (isSexagesimal && Number(truncated) > MAX_SEXAGESIMAL) {
      truncated = String(MAX_SEXAGESIMAL);
    }

    const newFields = { ...fields, [field]: truncated };
    setFields(newFields);
    emitValue(newFields);

    // Auto-advance to next field when filled
    if (truncated.length === 2) {
      if (field === 'hours') {
        minutesRef.current?.focus();
        minutesRef.current?.select();
      } else if (field === 'minutes') {
        secondsRef.current?.focus();
        secondsRef.current?.select();
      }
    }
  };

  const handleKeyDown = (
    field: 'hours' | 'minutes' | 'seconds',
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Handle backspace to go to previous field when empty
    if (e.key === 'Backspace' && fields[field] === '') {
      if (field === 'seconds') {
        minutesRef.current?.focus();
      } else if (field === 'minutes' && showHours) {
        hoursRef.current?.focus();
      }
    }
    
    // Handle colon to advance to next field
    if (e.key === ':') {
      e.preventDefault();
      if (field === 'hours') {
        minutesRef.current?.focus();
      } else if (field === 'minutes') {
        secondsRef.current?.focus();
      }
    }
  };

  const toggleHours = () => {
    const newShowHours = !showHours;
    setShowHours(newShowHours);
    
    if (!newShowHours) {
      // Clear hours when hiding
      const newFields = { ...fields, hours: '' };
      setFields(newFields);
      emitValue(newFields);
    } else {
      // Minutes must be 0-59 once hours are shown: carry overflow into hours
      const mins = Number(fields.minutes);
      if (mins > MAX_SEXAGESIMAL) {
        setFields({
          ...fields,
          hours: String(Math.floor(mins / 60)),
          minutes: String(mins % 60).padStart(2, '0'),
        });
      }
      // Focus hours field when showing
      setTimeout(() => hoursRef.current?.focus(), 0);
    }
  };

  const inputBaseClass = `
    field w-14 px-2 py-2 text-center text-lg font-display
  `;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        {showHours && (
          <>
            <input
              ref={hoursRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={fields.hours}
              onChange={(e) => handleFieldChange('hours', e.target.value)}
              onKeyDown={(e) => handleKeyDown('hours', e)}
              placeholder="HH"
              maxLength={2}
              className={inputBaseClass}
              id={id}
              aria-label="Hours"
            />
            <span className="text-xl font-bold text-[var(--color-text-muted)]">:</span>
          </>
        )}
        
        <input
          ref={minutesRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={fields.minutes}
          onChange={(e) => handleFieldChange('minutes', e.target.value)}
          onKeyDown={(e) => handleKeyDown('minutes', e)}
          placeholder="MM"
          maxLength={2}
          className={inputBaseClass}
          autoFocus={autoFocus && !showHours}
          id={showHours ? undefined : id}
          aria-label="Minutes"
        />
        
        <span className="text-xl font-bold text-[var(--color-text-muted)]">:</span>
        
        <input
          ref={secondsRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={fields.seconds}
          onChange={(e) => handleFieldChange('seconds', e.target.value)}
          onKeyDown={(e) => handleKeyDown('seconds', e)}
          placeholder="SS"
          maxLength={2}
          className={inputBaseClass}
          aria-label="Seconds"
        />

        <button
          type="button"
          onClick={toggleHours}
          className={`
            ml-2 px-3 py-2 text-sm font-semibold rounded-sm border transition-colors
            ${showHours
              ? 'chip-selected'
              : 'bg-[var(--color-input)] border-[var(--color-input-border)] text-[var(--color-text-muted)] hover:border-[var(--color-input-border-hover)]'
            }
          `}
          title={showHours ? 'Hide hours' : 'Add hours (for long workouts)'}
          aria-label={showHours ? 'Hide hours field' : 'Show hours field'}
        >
          +H
        </button>
      </div>
      
      <p className="text-xs text-[var(--color-text-muted)]">
        {showHours ? 'Format: HH:MM:SS (e.g., 1:05:30)' : 'Format: MM:SS (e.g., 4:32)'}
      </p>
    </div>
  );
};
