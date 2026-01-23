/**
 * QuickCheckIn Component
 *
 * Fast daily check-in widget for energy, soreness, and sleep.
 * Handles both initial prompt and editing states.
 */

import { useState, useCallback } from 'react';
import { Loader2, Check, Moon, Edit2 } from 'lucide-react';
import { EmojiSelector } from './EmojiSelector';
import { useCheckInStore } from '../../stores/checkInStore';
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
  const todayCheckIn = useCheckInStore((s) => s.todayCheckIn);
  const isSaving = useCheckInStore((s) => s.isSaving);
  const isFirstCheckIn = useCheckInStore((s) => s.isFirstCheckIn);
  const saveTrainingCheckIn = useCheckInStore((s) => s.saveTrainingCheckIn);
  const saveRestDay = useCheckInStore((s) => s.saveRestDay);

  // Local form state
  const [mode, setMode] = useState<'prompt' | 'training' | 'summary'>(() => {
    if (todayCheckIn) return 'summary';
    return 'prompt';
  });
  const [energy, setEnergy] = useState<MetricValue | undefined>(
    todayCheckIn?.energy
  );
  const [soreness, setSoreness] = useState<MetricValue | undefined>(
    todayCheckIn?.soreness
  );
  const [sleepHours, setSleepHours] = useState<SleepHours | undefined>(
    todayCheckIn?.sleepHours
  );

  // Sync state when todayCheckIn changes
  const handleEdit = useCallback(() => {
    if (todayCheckIn) {
      setEnergy(todayCheckIn.energy);
      setSoreness(todayCheckIn.soreness);
      setSleepHours(todayCheckIn.sleepHours);
    }
    setMode('training');
  }, [todayCheckIn]);

  const handleTrainingClick = useCallback(() => {
    setMode('training');
  }, []);

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

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Summary State (already checked in)
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === 'summary' && todayCheckIn) {
    const isRestDay = todayCheckIn.type === 'rest';

    return (
      <section aria-label="Today's check-in summary">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              Today's Check-in
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
          {isRestDay ? (
            <div className="flex items-center gap-2 text-[var(--color-text)]">
              <Moon className="w-5 h-5 text-[var(--color-primary)]" />
              <span className="font-medium">Rest Day</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl mb-1">{ENERGY_EMOJIS[todayCheckIn.energy!]}</div>
                <div className="text-xs text-[var(--color-text-muted)]">Energy</div>
                <div className="text-sm font-medium text-[var(--color-text)]">
                  {ENERGY_LABELS[todayCheckIn.energy!]}
                </div>
              </div>
              <div>
                <div className="text-2xl mb-1">{SORENESS_EMOJIS[todayCheckIn.soreness!]}</div>
                <div className="text-xs text-[var(--color-text-muted)]">Soreness</div>
                <div className="text-sm font-medium text-[var(--color-text)]">
                  {SORENESS_LABELS[todayCheckIn.soreness!]}
                </div>
              </div>
              <div>
                <div className="text-2xl mb-1">😴</div>
                <div className="text-xs text-[var(--color-text-muted)]">Sleep</div>
                <div className="text-sm font-medium text-[var(--color-text)]">
                  {SLEEP_LABELS[todayCheckIn.sleepHours!]}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Prompt State (no check-in yet)
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === 'prompt') {
    return (
      <section aria-label="Quick check-in">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Quick Check-in
          </h2>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
          <p className="text-center text-[var(--color-text)] mb-4">
            {isFirstCheckIn
              ? 'Track how you feel to get recovery insights!'
              : 'How are you feeling today?'}
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleTrainingClick}
              className="flex-1 py-3 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium rounded-lg transition-colors"
              aria-label="Log training day"
            >
              🏋️ Training
            </button>
            <button
              onClick={handleRestDayClick}
              disabled={isSaving}
              className="flex-1 py-3 px-4 bg-[var(--color-surface-elevated)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-text)] font-medium rounded-lg transition-colors disabled:opacity-50"
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
  return (
    <section aria-label="Quick check-in form">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Quick Check-in
        </h2>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-4">
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
