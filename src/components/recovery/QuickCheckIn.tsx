/**
 * QuickCheckIn Component
 *
 * Fast daily check-in widget for energy, soreness, and sleep.
 * Handles both initial prompt and editing states.
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
    <div role="radiogroup" aria-label="Sleep hours" className="flex gap-1.5">
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
              px-3 py-2 rounded-lg text-sm font-medium
              transition-all duration-150 ease-out
              ${isSelected
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]'
              }
              ${disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-elevated)] active:scale-95'
              }
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
  
  // Tab active states (Pick Date is active when calendar is open OR a past date is selected)
  const isTodayActive = isToday && !showCalendar;
  const isPickDateActive = showCalendar || isOtherDate;
  const minDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // 30 days back
    return date;
  }, []);
  const maxDate = useMemo(() => new Date(), []);
  const selectedDateObj = useMemo(() => new Date(selectedDate + 'T00:00:00'), [selectedDate]);

  // Local form state
  const [mode, setMode] = useState<'prompt' | 'training' | 'summary'>(() => {
    if (selectedCheckIn) return 'summary';
    return 'prompt';
  });
  const [energy, setEnergy] = useState<MetricValue | undefined>(
    selectedCheckIn?.energy
  );
  const [soreness, setSoreness] = useState<MetricValue | undefined>(
    selectedCheckIn?.soreness
  );
  const [sleepHours, setSleepHours] = useState<SleepHours | undefined>(
    selectedCheckIn?.sleepHours
  );

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

  // Edit handler - go to prompt to choose Training or Rest
  const handleEdit = useCallback(() => {
    setMode('prompt');
  }, []);

  const handleTrainingClick = useCallback(() => {
    // Pre-fill form with existing values if editing a training day
    if (selectedCheckIn?.type === 'training') {
      setEnergy(selectedCheckIn.energy);
      setSoreness(selectedCheckIn.soreness);
      setSleepHours(selectedCheckIn.sleepHours);
    } else {
      // Reset form for new training entry
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

  // Format the "other" date for display
  const formatOtherDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Date selector component (shared across all states)
  const dateSelector = (
    <div className="mb-4">
      {/* Quick date tabs */}
      <div className="flex gap-2 p-1 bg-[var(--color-bg)] rounded-xl" role="tablist" aria-label="Select date">
        <button
          type="button"
          role="tab"
          aria-selected={isTodayActive}
          onClick={handleTodayClick}
          disabled={isLoading}
          className={`
            flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-150
            ${isTodayActive
              ? 'bg-[var(--color-primary)] text-white shadow-sm'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
            }
            disabled:opacity-50
          `}
        >
          Today
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isPickDateActive}
          onClick={handleOtherClick}
          disabled={isLoading}
          className={`
            flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-150 flex items-center justify-center gap-1.5
            ${isPickDateActive
              ? 'bg-[var(--color-primary)] text-white shadow-sm'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
            }
            disabled:opacity-50
          `}
        >
          <Calendar className="w-3.5 h-3.5" />
          {isOtherDate ? formatOtherDate(selectedDate) : 'Pick Date'}
        </button>
      </div>

      {/* Calendar picker (shown when "Pick Date" is clicked) */}
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
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Quick Check-in
          </h2>
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
          {dateSelector}
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
          </div>
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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              {isToday ? "Today's" : 'Daily'} Check-in
            </h2>
          </div>
          <button
            onClick={handleEdit}
            className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
            aria-label="Edit check-in"
          >
            <Edit2 className="w-3 h-3" />
            Edit
          </button>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
          {dateSelector}
          {isRestDay ? (
            <div className="flex items-center gap-2 text-[var(--color-text)]">
              <Moon className="w-5 h-5 text-[var(--color-primary)]" />
              <span className="font-medium">Rest Day</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl mb-1">{ENERGY_EMOJIS[selectedCheckIn.energy!]}</div>
                <div className="text-xs text-[var(--color-text-muted)]">Energy</div>
                <div className="text-sm font-medium text-[var(--color-text)]">
                  {ENERGY_LABELS[selectedCheckIn.energy!]}
                </div>
              </div>
              <div>
                <div className="text-2xl mb-1">{SORENESS_EMOJIS[selectedCheckIn.soreness!]}</div>
                <div className="text-xs text-[var(--color-text-muted)]">Soreness</div>
                <div className="text-sm font-medium text-[var(--color-text)]">
                  {SORENESS_LABELS[selectedCheckIn.soreness!]}
                </div>
              </div>
              <div>
                <div className="text-2xl mb-1">😴</div>
                <div className="text-xs text-[var(--color-text-muted)]">Sleep</div>
                <div className="text-sm font-medium text-[var(--color-text)]">
                  {SLEEP_LABELS[selectedCheckIn.sleepHours!]}
                </div>
              </div>
            </div>
          )}
        </div>
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

    // Highlight current selection when editing
    const isTrainingSelected = isEditing && selectedCheckIn?.type === 'training';
    const isRestSelected = isEditing && selectedCheckIn?.type === 'rest';

    const handleCancel = () => setMode('summary');

    return (
      <section aria-label="Quick check-in">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Quick Check-in
          </h2>
          {isEditing && (
            <button
              onClick={handleCancel}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
          {dateSelector}
          <p className="text-center text-[var(--color-text)] mb-4">
            {promptText}
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleTrainingClick}
              className={`
                flex-1 py-3 px-4 font-medium rounded-lg transition-colors
                ${isTrainingSelected
                  ? 'bg-[var(--color-primary)] text-white ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-surface)]'
                  : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white'
                }
              `}
              aria-label="Log training day"
            >
              🏋️ Training
            </button>
            <button
              onClick={handleRestDayClick}
              disabled={isSaving}
              className={`
                flex-1 py-3 px-4 font-medium rounded-lg transition-colors disabled:opacity-50
                ${isRestSelected
                  ? 'bg-[var(--color-surface-elevated)] border-2 border-[var(--color-primary)] text-[var(--color-text)]'
                  : 'bg-[var(--color-surface-elevated)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-text)]'
                }
              `}
              aria-label="Log rest day"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                <>🌙 Rest Day</>
              )}
            </button>
          </div>
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Quick Check-in
        </h2>
        <button
          onClick={handleBackToPrompt}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          Back
        </button>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-4">
        {dateSelector}
        
        {/* Energy */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Energy Level
          </label>
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
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Muscle Soreness
          </label>
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
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Sleep Last Night
          </label>
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
          className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:bg-[var(--color-surface-elevated)] disabled:text-[var(--color-text-muted)] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          aria-label="Save check-in"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Save Check-in
            </>
          )}
        </button>
      </div>
    </section>
  );
};
