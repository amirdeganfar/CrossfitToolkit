import { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { toLocalDateString } from '../utils/date';
import { useModalA11y } from '../hooks/useModalA11y';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  /** id of an external label element. */
  labelledBy?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DatePicker = ({ value, onChange, minDate, maxDate, labelledBy }: DatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const close = () => setIsOpen(false);
  // Escape closes; focus moves into the calendar and back to the trigger.
  useModalA11y(calendarRef, close, isOpen);

  // Calculate position from the trigger, then open.
  const openCalendar = () => {
    if (triggerRef.current) {
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
    setViewDate(value);
    setIsOpen(true);
  };

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

  // Compare local calendar dates (YYYY-MM-DD strings sort chronologically),
  // so today stays selectable when maxDate is "now".
  const minDateStr = minDate ? toLocalDateString(minDate) : null;
  const maxDateStr = maxDate ? toLocalDateString(maxDate) : null;
  const isDisabled = (day: number) => {
    const dateStr = toLocalDateString(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
    if (minDateStr && dateStr < minDateStr) return true;
    if (maxDateStr && dateStr > maxDateStr) return true;
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
        onClick={() => (isOpen ? close() : openCalendar())}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-labelledby={labelledBy}
        className="field w-full flex items-center justify-between px-3 py-2.5"
      >
        <span>{formatDisplayDate(value)}</span>
        <Calendar className="w-5 h-5 text-[var(--color-text-muted)]" />
      </button>

      {/* Calendar popover — portaled to <body> so a transformed / scrolling
          ancestor (sheet slide-up, card-enter) can't offset or clip it. */}
      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[59]"
            onClick={close}
            aria-hidden="true"
          />

          {/* Calendar */}
          <div
            ref={calendarRef}
            role="dialog"
            aria-modal="true"
            aria-label="Choose date"
            tabIndex={-1}
            className="fixed z-[60] w-[280px] bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)] rounded-md shadow-xl overflow-hidden animate-fade-in focus:outline-none"
            style={{ top: position.top, left: position.left }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                aria-label="Previous month"
                className="p-2 rounded-sm hover:bg-[var(--color-surface)] transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
              </button>
              <span className="font-display text-[15px] font-semibold text-[var(--color-text)] num" aria-live="polite">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                aria-label="Next month"
                className="p-2 rounded-sm hover:bg-[var(--color-surface)] transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)]" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 px-2 py-2" aria-hidden="true">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center t-caption py-1"
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
                    aria-pressed={selected}
                    aria-current={today ? 'date' : undefined}
                    aria-label={`${MONTHS[viewDate.getMonth()]} ${day}, ${viewDate.getFullYear()}`}
                    className={`
                      aspect-square rounded-sm text-sm font-display num transition-colors
                      ${selected
                        ? 'chip-selected font-semibold'
                        : disabled
                          ? 'text-[var(--color-text-muted)]/40 cursor-not-allowed'
                          : today
                            ? 'text-[var(--color-text)] font-semibold ring-1 ring-inset ring-[var(--color-input-border-hover)] hover:bg-[var(--color-surface)]'
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
        </>,
        document.body
      )}
    </div>
  );
};
