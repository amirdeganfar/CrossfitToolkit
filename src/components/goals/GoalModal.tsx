import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { CatalogItem, Variant } from '../../types/catalog';
import type { Goal, CreateGoalInput, UpdateGoalInput } from '../../types/goal';
import { ItemSelector } from './ItemSelector';
import { DatePicker } from '../DatePicker';
import { TimeInput } from '../TimeInput';
import { parseResultToValue, getResultPlaceholder } from '../../utils/resultParser';
import * as db from '../../db';

interface GoalModalProps {
  items: CatalogItem[];
  editGoal?: Goal | null;
  preselectedItem?: CatalogItem | null;
  weightUnit?: string;
  onSave: (input: CreateGoalInput | { id: string; updates: UpdateGoalInput }) => Promise<void>;
  onClose: () => void;
}

const VARIANTS: { value: Variant; label: string }[] = [
  { value: 'Rx', label: 'Rx' },
  { value: 'Scaled', label: 'Scaled' },
  { value: 'Rx+', label: 'Rx+' },
];

const REPS_OPTIONS = [1, 2, 3, 5, 10];

export const GoalModal = ({
  items,
  editGoal,
  preselectedItem,
  weightUnit = 'kg',
  onSave,
  onClose,
}: GoalModalProps) => {
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(
    preselectedItem || null
  );
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState<Date>(() => {
    // Default to 3 months from now
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date;
  });
  const [variant, setVariant] = useState<Variant>(null);
  const [reps, setReps] = useState<number>(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentBest, setCurrentBest] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editGoal;

  // Load edit goal data
  useEffect(() => {
    if (editGoal) {
      const item = items.find((i) => i.id === editGoal.itemId);
      setSelectedItem(item || null);

      // Convert target value back to display format
      if (item) {
        if (item.scoreType === 'Time') {
          // Convert seconds to MM:SS
          const minutes = Math.floor(editGoal.targetValue / 60);
          const seconds = Math.floor(editGoal.targetValue % 60);
          setTargetValue(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setTargetValue(String(editGoal.targetValue));
        }
      }

      setTargetDate(new Date(editGoal.targetDate));
      setVariant(editGoal.variant || null);
      setReps(editGoal.reps || 1);
      setShowAdvanced(!!(editGoal.variant || editGoal.reps));
    }
  }, [editGoal, items]);

  // Fetch current best PR when item changes
  useEffect(() => {
    const fetchCurrentBest = async () => {
      if (!selectedItem) {
        setCurrentBest(null);
        return;
      }

      try {
        const bestPR = await db.getBestPR(selectedItem.id, variant || undefined);
        if (bestPR) {
          setCurrentBest(bestPR.result);
        } else {
          setCurrentBest(null);
        }
      } catch (err) {
        console.error('[GoalModal] Error fetching best PR:', err);
        setCurrentBest(null);
      }
    };

    fetchCurrentBest();
  }, [selectedItem, variant]);

  // Set default variant when item changes
  useEffect(() => {
    if (selectedItem?.category === 'Benchmark' && !editGoal) {
      setVariant('Rx');
    } else if (selectedItem?.category !== 'Benchmark') {
      setVariant(null);
    }
  }, [selectedItem, editGoal]);

  const showVariantSelector = selectedItem?.category === 'Benchmark';
  const showRepsSelector = selectedItem?.scoreType === 'Load';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedItem) {
      setError('Please select an item');
      return;
    }

    if (!targetValue.trim()) {
      setError('Please enter a target value');
      return;
    }

    // Parse target value based on score type
    const parsedTargetValue = parseResultToValue(targetValue, selectedItem.scoreType);
    if (parsedTargetValue <= 0) {
      setError('Please enter a valid target value');
      return;
    }

    // Validate date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate < today) {
      setError('Target date must be in the future');
      return;
    }

    setIsSubmitting(true);

    try {
      const targetDateStr = targetDate.toISOString().split('T')[0];

      if (isEditing && editGoal) {
        const updates: UpdateGoalInput = {
          targetValue: parsedTargetValue,
          targetDate: targetDateStr,
          variant: showVariantSelector ? variant : undefined,
          reps: showRepsSelector ? reps : undefined,
        };
        await onSave({ id: editGoal.id, updates });
      } else {
        const input: CreateGoalInput = {
          itemId: selectedItem.id,
          targetValue: parsedTargetValue,
          targetDate: targetDateStr,
          variant: showVariantSelector ? variant : undefined,
          reps: showRepsSelector ? reps : undefined,
        };
        await onSave(input);
      }

      onClose();
    } catch (err) {
      setError('Failed to save goal. Please try again.');
      console.error('[GoalModal] Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTargetLabel = () => {
    if (!selectedItem) return 'Target';

    switch (selectedItem.scoreType) {
      case 'Time':
        return 'Target Time';
      case 'Load':
        return `Target Weight (${weightUnit})`;
      case 'Reps':
        return 'Target Reps';
      case 'Distance':
        return 'Target Distance (m)';
      case 'Calories':
        return 'Target Calories';
      case 'Rounds+Reps':
        return 'Target Rounds+Reps';
      default:
        return 'Target';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] border-t sm:border border-[var(--color-border)] sm:rounded-xl overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-surface)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            {isEditing ? 'Edit Goal' : 'Set Goal'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 -m-2 rounded-lg hover:bg-[var(--color-surface-elevated)] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Item selector */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Select Item
            </label>
            <ItemSelector
              items={items}
              value={selectedItem}
              onChange={setSelectedItem}
              disabled={isEditing}
              placeholder="Search for an item..."
            />
          </div>

          {/* Target value input */}
          {selectedItem && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                {getTargetLabel()}
              </label>
              {selectedItem.scoreType === 'Time' ? (
                <TimeInput
                  value={targetValue}
                  onChange={setTargetValue}
                  autoFocus={!isEditing}
                />
              ) : (
                <input
                  type="text"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={getResultPlaceholder(selectedItem.scoreType)}
                  className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  autoFocus={!isEditing}
                />
              )}
              {currentBest && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Current best: {currentBest}
                </p>
              )}
            </div>
          )}

          {/* Target date */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Target Date
            </label>
            <DatePicker
              value={targetDate}
              onChange={setTargetDate}
              minDate={new Date()}
            />
          </div>

          {/* Advanced options toggle */}
          {selectedItem && (showVariantSelector || showRepsSelector) && (
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
              </button>
            </div>
          )}

          {/* Advanced options */}
          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-[var(--color-border)]">
              {/* Variant selector */}
              {showVariantSelector && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                    Variant
                  </label>
                  <div className="flex gap-2">
                    {VARIANTS.map((v) => (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() => setVariant(v.value)}
                        className={`flex-1 px-4 py-2 rounded-lg border font-medium transition-colors ${
                          variant === v.value
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reps selector */}
              {showRepsSelector && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                    Rep Scheme
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {REPS_OPTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReps(r)}
                        className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
                          reps === r
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                        }`}
                      >
                        {r === 1 ? '1RM' : `${r}RM`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || !selectedItem || !targetValue.trim()}
            className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-colors"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Goal' : 'Create Goal'}
          </button>
        </form>
      </div>
    </div>
  );
};
