/**
 * QuickCheckIn — BLACKOUT redesign.
 * Fast daily check-in for energy, soreness, and sleep.
 * No emoji, no tactical caps: card-wrapped metrics, .label-eyebrow headers,
 * a segmented date control, and a knurled loaded-bar save button.
 * All store logic is unchanged from the original.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Loader2, Check, Moon, Dumbbell, Edit2, Calendar } from 'lucide-react';
import { EmojiSelector } from './EmojiSelector';
import { DatePicker } from '../DatePicker';
import { useCheckInStore } from '../../stores/checkInStore';
import { getTodayDate, formatDateToISO } from '../../services/checkInService';
import {
  ENERGY_LABELS,
  SORENESS_LABELS,
  SLEEP_OPTIONS,
  SLEEP_LABELS,
} from '../../config/recoveryScoring.config';
import type { MetricValue, SleepHours } from '../../types/training';

// ── Sleep selector ─────────────────────────────────────────────────────────
interface SleepSelectorProps {
  value: SleepHours | undefined;
  onChange: (value: SleepHours) => void;
  disabled?: boolean;
}

const SleepSelector = ({ value, onChange, disabled = false }: SleepSelectorProps) => {
  const handleKeyDown = (e: React.KeyboardEvent, hours: SleepHours) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(hours); }
  };
  return (
    <div role="radiogroup" aria-label="Sleep hours" className="flex gap-2 flex-wrap">
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
            className={`flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 ease-out border ${
              isSelected
                ? 'text-[var(--color-bg)] border-transparent'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-border-strong)]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'} focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg)]`}
            style={isSelected ? { background: 'var(--color-primary)' } : undefined}
          >
            {SLEEP_LABELS[hours]}
          </button>
        );
      })}
    </div>
  );
};

// ── Knurled loaded-bar button ────────────────────────────────────────────────
const LoadedBar = ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="relative w-full h-[54px] rounded-full overflow-hidden flex items-center justify-center transition-transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
    style={{ background: 'var(--color-primary)' }}
  >
    <span className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.13) 0 1px, transparent 1px 6px)' }} />
    <span className="absolute inset-y-0 left-0 w-[14px]" style={{ background: 'var(--color-bg)' }} />
    <span className="absolute inset-y-0 right-0 w-[14px]" style={{ background: 'var(--color-bg)' }} />
    <span className="relative flex items-center gap-2 text-[17px] font-bold" style={{ color: 'var(--color-bg)', letterSpacing: '-0.2px' }}>
      {children}
    </span>
  </button>
);

// ── Main component ───────────────────────────────────────────────────────────
interface QuickCheckInProps {
  /** Called after a check-in (training or rest) is successfully saved. */
  onSaved?: () => void;
  /** Hide the date selector and lock the check-in to today (e.g. the readiness sheet). */
  hideDatePicker?: boolean;
}

export const QuickCheckIn = ({ onSaved, hideDatePicker = false }: QuickCheckInProps = {}) => {
  const selectedDate = useCheckInStore((s) => s.selectedDate);
  const selectedCheckIn = useCheckInStore((s) => s.selectedCheckIn);
  const isSaving = useCheckInStore((s) => s.isSaving);
  const isLoading = useCheckInStore((s) => s.isLoading);
  const isFirstCheckIn = useCheckInStore((s) => s.isFirstCheckIn);
  const setSelectedDate = useCheckInStore((s) => s.setSelectedDate);
  const saveTrainingCheckIn = useCheckInStore((s) => s.saveTrainingCheckIn);
  const saveRestDay = useCheckInStore((s) => s.saveRestDay);

  const [showCalendar, setShowCalendar] = useState(false);

  const today = useMemo(() => getTodayDate(), []);
  const isToday = selectedDate === today;
  const isOtherDate = !isToday;
  const isTodayActive = isToday && !showCalendar;
  const isPickDateActive = showCalendar || isOtherDate;
  const minDate = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; }, []);
  const maxDate = useMemo(() => new Date(), []);
  const selectedDateObj = useMemo(() => new Date(selectedDate + 'T00:00:00'), [selectedDate]);

  const [mode, setMode] = useState<'prompt' | 'training' | 'summary'>(() => (selectedCheckIn ? 'summary' : 'prompt'));
  const [energy, setEnergy] = useState<MetricValue | undefined>(selectedCheckIn?.energy);
  const [soreness, setSoreness] = useState<MetricValue | undefined>(selectedCheckIn?.soreness);
  const [sleepHours, setSleepHours] = useState<SleepHours | undefined>(selectedCheckIn?.sleepHours);

  // When locked to today (readiness sheet), keep the selected date on today so
  // a save reliably updates today's check-in / the readiness chip.
  useEffect(() => {
    if (hideDatePicker && selectedDate !== today) {
      void setSelectedDate(today);
    }
  }, [hideDatePicker, selectedDate, today, setSelectedDate]);

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

  const handleTodayClick = useCallback(() => { setSelectedDate(today); setShowCalendar(false); }, [today, setSelectedDate]);
  const handleCalendarDateChange = useCallback((date: Date) => { setSelectedDate(formatDateToISO(date)); setShowCalendar(false); }, [setSelectedDate]);
  const handleOtherClick = useCallback(() => { setShowCalendar((p) => !p); }, []);
  const handleEdit = useCallback(() => { setMode('prompt'); }, []);
  const handleTrainingClick = useCallback(() => {
    if (selectedCheckIn?.type === 'training') {
      setEnergy(selectedCheckIn.energy); setSoreness(selectedCheckIn.soreness); setSleepHours(selectedCheckIn.sleepHours);
    } else { setEnergy(undefined); setSoreness(undefined); setSleepHours(undefined); }
    setMode('training');
  }, [selectedCheckIn]);
  const handleRestDayClick = useCallback(async () => { await saveRestDay(); setMode('summary'); onSaved?.(); }, [saveRestDay, onSaved]);
  const handleSave = useCallback(async () => {
    if (!energy || !soreness || !sleepHours) return;
    await saveTrainingCheckIn({ energy, soreness, sleepHours });
    setMode('summary');
    onSaved?.();
  }, [energy, soreness, sleepHours, saveTrainingCheckIn, onSaved]);

  const isFormValid = energy !== undefined && soreness !== undefined && sleepHours !== undefined;
  const formatOtherDate = (dateStr: string) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Segmented date control (shared)
  const dateSelector = (
    <div className="mb-4">
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-surface)' }} role="tablist" aria-label="Select date">
        <button
          type="button" role="tab" aria-selected={isTodayActive} onClick={handleTodayClick} disabled={isLoading}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition-all disabled:opacity-50 ${isTodayActive ? 'text-[var(--color-bg)]' : 'text-[var(--color-text-muted)]'}`}
          style={isTodayActive ? { background: 'var(--color-primary)' } : undefined}
        >
          Today
        </button>
        <button
          type="button" role="tab" aria-selected={isPickDateActive} onClick={handleOtherClick} disabled={isLoading}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 ${isPickDateActive ? 'text-[var(--color-bg)]' : 'text-[var(--color-text-muted)]'}`}
          style={isPickDateActive ? { background: 'var(--color-primary)' } : undefined}
        >
          <Calendar className="w-3.5 h-3.5" />
          {isOtherDate ? formatOtherDate(selectedDate) : 'Pick date'}
        </button>
      </div>
      {showCalendar && (
        <div className="mt-3">
          <DatePicker value={selectedDateObj} onChange={handleCalendarDateChange} minDate={minDate} maxDate={maxDate} />
        </div>
      )}
    </div>
  );

  // Hidden when the check-in is hosted in the today-only readiness sheet.
  const dateSelectorNode = hideDatePicker ? null : dateSelector;

  // Loading
  if (isLoading) {
    return (
      <section aria-label="Quick check-in">
        <div className="label-eyebrow mb-3">Quick check-in</div>
        {dateSelectorNode}
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" /></div>
      </section>
    );
  }

  // Summary
  if (mode === 'summary' && selectedCheckIn) {
    const isRestDay = selectedCheckIn.type === 'rest';
    return (
      <section aria-label="Check-in summary">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
            <span className="label-eyebrow">{isToday ? "Today's check-in" : 'Daily check-in'}</span>
          </div>
          <button onClick={handleEdit} className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-primary)] px-2 py-1" aria-label="Edit check-in">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        </div>
        {dateSelectorNode}
        {isRestDay ? (
          <div className="flex items-center gap-2 rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <Moon className="w-5 h-5 text-[var(--color-primary)]" />
            <span className="font-display text-sm">Rest day</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { v: selectedCheckIn.energy!, label: 'Energy', word: ENERGY_LABELS[selectedCheckIn.energy!], tone: 'var(--color-success)' },
              { v: selectedCheckIn.soreness!, label: 'Soreness', word: SORENESS_LABELS[selectedCheckIn.soreness!], tone: 'var(--color-warning)' },
              { v: 0, label: 'Sleep', word: SLEEP_LABELS[selectedCheckIn.sleepHours!], tone: 'var(--color-text)' },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="font-display-black text-xl" style={{ color: m.tone }}>{m.word}</div>
                <div className="label-eyebrow mt-1">{m.label}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  // Prompt
  if (mode === 'prompt') {
    const isEditing = selectedCheckIn !== null;
    const promptText = isFirstCheckIn
      ? 'Track how you feel to get recovery insights.'
      : isEditing ? 'What type of day was this?'
      : isToday ? 'How are you feeling today?'
      : 'Did you train on this day?';
    const handleCancel = () => setMode('summary');
    return (
      <section aria-label="Quick check-in">
        <div className="flex items-center justify-between mb-3">
          <span className="label-eyebrow">Quick check-in</span>
          {isEditing && (
            <button onClick={handleCancel} className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">Cancel</button>
          )}
        </div>
        {dateSelectorNode}
        <p className="font-display text-[15px] text-[var(--color-text-muted)] mb-4">{promptText}</p>
        <div className="flex flex-col gap-2.5">
          <LoadedBar onClick={handleTrainingClick}><Dumbbell className="w-[18px] h-[18px]" /> Training day</LoadedBar>
          <button
            onClick={handleRestDayClick}
            disabled={isSaving}
            className="w-full h-[52px] rounded-full font-semibold text-[16px] transition-transform active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 border text-[var(--color-text)]"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-strong)' }}
            aria-label="Log rest day"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Moon className="w-[18px] h-[18px] text-[var(--color-primary)]" /> Rest day</>}
          </button>
        </div>
      </section>
    );
  }

  // Training form
  const handleBackToPrompt = () => setMode('prompt');
  return (
    <section aria-label="Quick check-in form">
      <div className="flex items-center justify-between mb-3">
        <span className="label-eyebrow">Quick check-in</span>
        <button onClick={handleBackToPrompt} className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">Back</button>
      </div>

      <div className="space-y-3">
        {dateSelectorNode}

        <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="label-eyebrow mb-3">Energy level</div>
          <EmojiSelector value={energy} onChange={setEnergy} emojis={{}} labels={ENERGY_LABELS} ariaLabel="Select energy level" disabled={isSaving} />
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="label-eyebrow mb-3">Muscle soreness</div>
          <EmojiSelector value={soreness} onChange={setSoreness} emojis={{}} labels={SORENESS_LABELS} ariaLabel="Select soreness level" disabled={isSaving} />
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="label-eyebrow mb-3">Sleep last night</div>
          <SleepSelector value={sleepHours} onChange={setSleepHours} disabled={isSaving} />
        </div>

        <LoadedBar onClick={handleSave} disabled={!isFormValid || isSaving}>
          {isSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</> : <><Check className="w-5 h-5" /> Save check-in</>}
        </LoadedBar>
      </div>
    </section>
  );
};
