/**
 * QuickCheckIn Component
 *
 * Fast daily check-in widget for energy, soreness, and sleep.
 * Tactical styling — no card wrappers, section rules, underline tabs.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Loader2, Check, Moon, Edit2, Calendar } from 'lucide-react';
import { EmojiSelector } from './EmojiSelector';
import { DatePicker } from '../DatePicker';
import { useCheckInStore } from '../../stores/checkInStore';
import { getTodayDate, formatDateToISO } from '../../services/checkInService';
import {
  ENERGY_LABELS,
  ENERGY_EMOJIS,
  SORENESS_LABELS,
  SORENESS_EMOJIS,
  SLEEP_OPTIONS,
  SLEEP_LABELS,
} from '../../config/recoveryScoring.config';
import type { MetricValue, SleepHours } from '../../types/training';

// ═══════════════════════════════════════════════════════════════════════════
// SLEEP SELECTOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface SleepSelectorProps {
  value: SleepHours | undefined;
  onChange: (value: SleepHours) => void;
  disabled?: boolean;
}

const SleepSelector = ({ value, onChange, disabled = false }: SleepSelectorProps) => {
  const handleKeyDown = (e: React.KeyboardEvent, hours: SleepHours) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(hours);
    }
  };

  return (
    <div role="radiogroup" aria-label="Sleep hours" className="flex gap-1.5 flex-wrap">
      {SLEEP_OPTIONS.map((hours) => {
        const isSelected = value === hours;

        return (
          <button
            key={hours}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${SLEEP_LABELS[hours]} of sleep`}
            tabIndex={0}
            disabled={disabled}
            onClick={() => onChange(hours)}
            onKeyDown={(e) => handleKeyDown(e, hours)}
            className={`
              flex items-center justify-center
              px-3 py-2.5 rounded-none font-display text-sm tracking-wider
              transition-all duration-150 ease-out border
              ${isSelected
                ? 'bg-[var(--color-primary)] text-[#0B130B] border-[var(--color-primary)]'
                : 'bg-transparent border-[var(--color-border-strong)] text-[var(--color-text)] hover:border-[var(--color-primary)]'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg)]
            `}
          >
            {SLEEP_LABELS[hours]}
          </button>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const QuickCheckIn = () => {
  // Store state
  const selectedDate = useCheckInStore((s) => s.selectedDate);
  const selectedCheckIn = useCheckInStore((s) => s.selectedCheckIn);
  const isSaving = useCheckInStore((s) => s.isSaving);
  const isLoading = useCheckInStore((s) => s.isLoading);
  const isFirstCheckIn = useCheckInStore((s) => s.isFirstCheckIn);
  const setSelectedDate = useCheckInStore((s) => s.setSelectedDate);
  const saveTrainingCheckIn = useCheckInStore((s) => s.saveTrainingCheckIn);
  const saveRestDay = useCheckInStore((s) => s.saveRestDay);

  // Calendar picker state
  const [showCalendar, setShowCalendar] = useState(false);

  // Date calculations
  const today = useMemo(() => getTodayDate(), []);
  const isToday = selectedDate === today;
  const isOtherDate = !isToday;

  // Tab active states
  const isTodayActive = isToday && !showCalendar;
  const isPickDateActive = showCalendar || isOtherDate;
  const minDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  }, []);
  const maxDate = useMemo(() => new Date(), []);
  const selectedDateObj = useMemo(() => new Date(selectedDate + 'T00:00:00'), [selectedDate]);

  // Local form state
  const [mode, setMode] = useState<'prompt' | 'training' | 'summary'>(() => {
    if (selectedCheckIn) return 'summary';
    return 'prompt';
  });
  const [energy, setEnergy] = useState<MetricValue | undefined>(selectedCheckIn?.energy);
  const [soreness, setSoreness] = useState<MetricValue | undefined>(selectedCheckIn?.soreness);
  const [sleepHours, setSleepHours] = useState<SleepHours | undefined>(selectedCheckIn?.sleepHours);

  // Sync mode and form state when selectedCheckIn changes
  useEffect(() => {
    if (selectedCheckIn) {
      setMode('summary');
      setEnergy(selectedCheckIn.energy);
      setSoreness(selectedCheckIn.soreness);
      setSleepHours(selectedCheckIn.sleepHours);
    } else {
      setMode('prompt');
      setEnergy(undefined);
      setSoreness(undefined);
      setSleepHours(undefined);
    }
  }, [selectedCheckIn]);

  // Date navigation handlers
  const handleTodayClick = useCallback(() => {
    setSelectedDate(today);
    setShowCalendar(false);
  }, [today, setSelectedDate]);

  const handleCalendarDateChange = useCallback((date: Date) => {
    setSelectedDate(formatDateToISO(date));
    setShowCalendar(false);
  }, [setSelectedDate]);

  const handleOtherClick = useCallback(() => {
    setShowCalendar((prev) => !prev);
  }, []);

  const handleEdit = useCallback(() => {
    setMode('prompt');
  }, []);

  const handleTrainingClick = useCallback(() => {
    if (selectedCheckIn?.type === 'training') {
      setEnergy(selectedCheckIn.energy);
      setSoreness(selectedCheckIn.soreness);
      setSleepHours(selectedCheckIn.sleepHours);
    } else {
      setEnergy(undefined);
      setSoreness(undefined);
      setSleepHours(undefined);
    }
    setMode('training');
  }, [selectedCheckIn]);

  const handleRestDayClick = useCallback(async () => {
    await saveRestDay();
    setMode('summary');
  }, [saveRestDay]);

  const handleSave = useCallback(async () => {
    if (!energy || !soreness || !sleepHours) return;
    await saveTrainingCheckIn({ energy, soreness, sleepHours });
    setMode('summary');
  }, [energy, soreness, sleepHours, saveTrainingCheckIn]);

  const isFormValid = energy !== undefined && soreness !== undefined && sleepHours !== undefined;

  const formatOtherDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Date selector (shared across all states)
  const dateSelector = (
    <div className="mb-4">
      <div className="flex border-b border-[var(--color-border)]" role="tablist" aria-label="Select date">
        <button
          type="button"
          role="tab"
          aria-selected={isTodayActive}
          onClick={handleTodayClick}
          disabled={isLoading}
          className={`
            flex-1 py-2 px-4 font-display text-sm tracking-widest transition-all duration-150 border-b-2 -mb-px
            ${isTodayActive
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }
            disabled:opacity-50
          `}
        >
          TODAY
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isPickDateActive}
          onClick={handleOtherClick}
          disabled={isLoading}
          className={`
            flex-1 py-2 px-4 font-display text-sm tracking-widest transition-all duration-150 border-b-2 -mb-px flex items-center justify-center gap-1.5
            ${isPickDateActive
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }
            disabled:opacity-50
          `}
        >
          <Calendar className="w-3.5 h-3.5" />
          {isOtherDate ? formatOtherDate(selectedDate) : 'PICK DATE'}
        </button>
      </div>

      {showCalendar && (
        <div className="mt-3">
          <DatePicker
            value={selectedDateObj}
            onChange={handleCalendarDateChange}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
      )}
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <section aria-label="Quick check-in">
        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[var(--color-border)]">
          <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">QUICK CHECK-IN</span>
        </div>
        {dateSelector}
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Summary State (already checked in)
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === 'summary' && selectedCheckIn) {
    const isRestDay = selectedCheckIn.type === 'rest';

    return (
      <section aria-label="Check-in summary">
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
            <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">
              {isToday ? "TODAY'S" : 'DAILY'} CHECK-IN
            </span>
          </div>
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 font-display text-xs tracking-[0.1em] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 px-2 py-1 transition-colors"
            aria-label="Edit check-in"
          >
            <Edit2 className="w-3 h-3" />
            EDIT
          </button>
        </div>

        {dateSelector}

        {isRestDay ? (
          <div className="flex items-center gap-2 text-[var(--color-text)]">
            <Moon className="w-5 h-5 text-[var(--color-primary)]" />
            <span className="font-display text-sm tracking-wider">REST DAY</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl mb-1">{ENERGY_EMOJIS[selectedCheckIn.energy!]}</div>
              <div className="font-display text-[10px] tracking-widest text-[var(--color-text-muted)]">ENERGY</div>
              <div className="font-display text-sm text-[var(--color-primary)]">
                {ENERGY_LABELS[selectedCheckIn.energy!].toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-2xl mb-1">{SORENESS_EMOJIS[selectedCheckIn.soreness!]}</div>
              <div className="font-display text-[10px] tracking-widest text-[var(--color-text-muted)]">SORENESS</div>
              <div className="font-display text-sm text-[var(--color-primary)]">
                {SORENESS_LABELS[selectedCheckIn.soreness!].toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-2xl mb-1">😴</div>
              <div className="font-display text-[10px] tracking-widest text-[var(--color-text-muted)]">SLEEP</div>
              <div className="font-display text-sm text-[var(--color-primary)]">
                {SLEEP_LABELS[selectedCheckIn.sleepHours!]}
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Prompt State (choose Training or Rest Day)
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === 'prompt') {
    const isEditing = selectedCheckIn !== null;
    const promptText = isFirstCheckIn
      ? 'Track how you feel to get recovery insights!'
      : isEditing
        ? 'What type of day was this?'
        : isToday
          ? 'How are you feeling today?'
          : 'Did you train on this day?';

    const isTrainingSelected = isEditing && selectedCheckIn?.type === 'training';
    const isRestSelected = isEditing && selectedCheckIn?.type === 'rest';

    const handleCancel = () => setMode('summary');

    return (
      <section aria-label="Quick check-in">
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-[var(--color-border)]">
          <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">QUICK CHECK-IN</span>
          {isEditing && (
            <button
              onClick={handleCancel}
              className="font-display text-xs tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              CANCEL
            </button>
          )}
        </div>

        {dateSelector}

        <p className="font-display text-xs tracking-[0.1em] text-[var(--color-text-muted)] mb-4">{promptText.toUpperCase()}</p>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleTrainingClick}
            className={`
              w-full py-5 px-4 font-display text-sm tracking-[0.15em] transition-all active:scale-[0.97] flex items-center justify-center gap-2
              ${isTrainingSelected
                ? 'bg-[var(--color-primary)] text-[#0B130B] ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-bg)]'
                : 'bg-[var(--color-primary)] text-[#0B130B] hover:opacity-90'
              }
            `}
            aria-label="Log training day"
          >
            <span className="text-xl">🏋️</span> TRAINING DAY
          </button>
          <button
            onClick={handleRestDayClick}
            disabled={isSaving}
            className={`
              w-full py-4 px-4 font-display text-sm tracking-[0.15em] transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 border
              ${isRestSelected
                ? 'bg-[var(--color-surface-elevated)] border-[var(--color-primary)] text-[var(--color-text)]'
                : 'bg-transparent border-[var(--color-border-strong)] text-[var(--color-text)] hover:border-[var(--color-text-muted)]'
              }
            `}
            aria-label="Log rest day"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              <><span className="text-xl">🌙</span> REST DAY</>
            )}
          </button>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Training Form State
  // ─────────────────────────────────────────────────────────────────────────
  const handleBackToPrompt = () => setMode('prompt');

  return (
    <section aria-label="Quick check-in form">
      <div className="flex items-center justify-between mb-2 pb-1 border-b border-[var(--color-border)]">
        <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">QUICK CHECK-IN</span>
        <button
          onClick={handleBackToPrompt}
          className="font-display text-xs tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          BACK
        </button>
      </div>

      <div className="space-y-4">
        {dateSelector}

        {/* Energy */}
        <div>
          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[var(--color-border)]">
            <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">ENERGY LEVEL</span>
          </div>
          <EmojiSelector
            value={energy}
            onChange={setEnergy}
            emojis={ENERGY_EMOJIS}
            labels={ENERGY_LABELS}
            ariaLabel="Select energy level"
            disabled={isSaving}
          />
        </div>

        {/* Soreness */}
        <div>
          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[var(--color-border)]">
            <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">MUSCLE SORENESS</span>
          </div>
          <EmojiSelector
            value={soreness}
            onChange={setSoreness}
            emojis={SORENESS_EMOJIS}
            labels={SORENESS_LABELS}
            ariaLabel="Select soreness level"
            disabled={isSaving}
          />
        </div>

        {/* Sleep */}
        <div>
          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[var(--color-border)]">
            <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">SLEEP LAST NIGHT</span>
          </div>
          <SleepSelector
            value={sleepHours}
            onChange={setSleepHours}
            disabled={isSaving}
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!isFormValid || isSaving}
          className={`w-full py-4 bg-[var(--color-primary)] text-[#0B130B] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed font-display tracking-[0.15em] text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isFormValid ? 'shadow-[0_0_20px_rgba(212,255,0,0.25)]' : ''}`}
          aria-label="Save check-in"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              SAVING...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              SAVE CHECK-IN
            </>
          )}
        </button>
      </div>
    </section>
  );
};
