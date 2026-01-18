import { useRef, useState, useCallback } from 'react';

interface TimeInputProps {
  value: string; // Format: "MM:SS" or "HH:MM:SS"
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export const TimeInput = ({
  value,
  onChange,
  autoFocus = false,
  className = '',
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
  
  // Only parse on initial mount, don't sync from external value during editing
  const [fields, setFields] = useState(() => parseValue(value));

  const hoursRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const secondsRef = useRef<HTMLInputElement>(null);

  // Build and emit the time string (without padding during input)
  const emitValue = useCallback((newFields: typeof fields) => {
    const { hours, minutes, seconds } = newFields;
    
    if (showHours && hours) {
      // HH:MM:SS format - only pad when both digits are entered
      const h = hours;
      const m = minutes.length === 2 ? minutes : minutes.padStart(2, '0');
      const s = seconds.length === 2 ? seconds : seconds.padStart(2, '0');
      onChange(`${h}:${m}:${s}`);
    } else if (minutes || seconds) {
      // MM:SS format - only pad seconds when both digits are entered
      const m = minutes || '0';
      const s = seconds.length === 2 ? seconds : seconds.padStart(2, '0');
      onChange(`${m}:${s}`);
    } else {
      onChange('');
    }
  }, [showHours, onChange]);

  const handleFieldChange = (
    field: 'hours' | 'minutes' | 'seconds',
    inputValue: string
  ) => {
    // Only allow digits
    const cleaned = inputValue.replace(/\D/g, '');
    
    // Limit length
    const maxLength = field === 'hours' ? 2 : 2;
    const truncated = cleaned.slice(0, maxLength);

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
      // Focus hours field when showing
      setTimeout(() => hoursRef.current?.focus(), 0);
    }
  };

  const inputBaseClass = `
    w-14 px-2 py-2 text-center text-lg font-mono
    bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg
    text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]
    focus:outline-none focus:border-[var(--color-primary)]
    transition-colors
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
            ml-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors
            ${showHours 
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' 
              : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
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
