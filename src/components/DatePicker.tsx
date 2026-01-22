import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DatePicker = ({ value, onChange, minDate, maxDate }: DatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position when opened
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const calendarHeight = 320; // Approximate height of calendar
      const calendarWidth = 280;
      
      // Position above the button
      let top = rect.top - calendarHeight - 8;
      let left = rect.left + (rect.width - calendarWidth) / 2;
      
      // If not enough space above, position below
      if (top < 8) {
        top = rect.bottom + 8;
      }
      
      // Keep within horizontal bounds
      if (left < 8) left = 8;
      if (left + calendarWidth > window.innerWidth - 8) {
        left = window.innerWidth - calendarWidth - 8;
      }
      
      setPosition({ top, left });
    }
  }, [isOpen]);

  const { days, startPadding } = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // First day of month (0 = Sunday, 1 = Monday, etc.)
    const firstDay = new Date(year, month, 1).getDay();
    
    // Number of days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    return {
      days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      startPadding: firstDay,
    };
  }, [viewDate]);

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      viewDate.getMonth() === today.getMonth() &&
      viewDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === value.getDate() &&
      viewDate.getMonth() === value.getMonth() &&
      viewDate.getFullYear() === value.getFullYear()
    );
  };

  const isDisabled = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    
    if (minDate) {
      const minDateStart = new Date(minDate);
      minDateStart.setHours(0, 0, 0, 0);
      if (date < minDateStart) return true;
    }
    
    if (maxDate) {
      date.setHours(23, 59, 59, 999);
      if (date > maxDate) return true;
    }
    
    return false;
  };

  const handleDayClick = (day: number) => {
    if (isDisabled(day)) return;
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(newDate);
    setIsOpen(false);
  };

  const navigateMonth = (delta: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] hover:border-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
      >
        <span>{formatDisplayDate(value)}</span>
        <Calendar className="w-5 h-5 text-[var(--color-text-muted)]" />
      </button>

      {/* Calendar dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Calendar */}
          <div 
            className="fixed z-[60] w-[280px] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden animate-fade-in"
            style={{ top: position.top, left: position.left }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
              </button>
              <span className="font-semibold text-[var(--color-text)]">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)]" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 px-2 py-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-[var(--color-text-muted)] py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 px-2 pb-3 gap-1">
              {/* Empty cells for start padding */}
              {Array.from({ length: startPadding }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              
              {/* Day buttons */}
              {days.map((day) => {
                const disabled = isDisabled(day);
                const selected = isSelected(day);
                const today = isToday(day);
                
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    disabled={disabled}
                    className={`
                      aspect-square rounded-lg text-sm font-medium transition-colors
                      ${disabled
                        ? 'text-[var(--color-text-muted)]/40 cursor-not-allowed'
                        : selected
                          ? 'bg-[var(--color-primary)] text-white'
                          : today
                            ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30'
                            : 'text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                      }
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
