import { useState } from 'react';
import { X } from 'lucide-react';
import type { CatalogItem, Variant } from '../types/catalog';
import { useCatalogStore } from '../stores/catalogStore';
import { parseResultToValue, validateResult, getResultPlaceholder, getResultLabel, formatCompoundResult } from '../utils/resultParser';
import { DatePicker } from './DatePicker';
import { TimeInput } from './TimeInput';

interface LogResultModalProps {
  item: CatalogItem;
  onClose: () => void;
  onSuccess: () => void;
}

const VARIANTS: { value: Variant; label: string }[] = [
  { value: 'Rx', label: 'Rx' },
  { value: 'Scaled', label: 'Scaled' },
  { value: 'Rx+', label: 'Rx+' },
];

export const LogResultModal = ({ item, onClose, onSuccess }: LogResultModalProps) => {
  const addPRLog = useCatalogStore((state) => state.addPRLog);
  const settings = useCatalogStore((state) => state.settings);

  const [result, setResult] = useState('');
  const [reps, setReps] = useState<string>('1'); // For Load scoreType
  const [distance, setDistance] = useState<string>(''); // For Monostructural Time items (Run, Row)
  const [distanceUnit, setDistanceUnit] = useState<'m' | 'km' | 'mi'>('m');
  const [calories, setCalories] = useState<string>(''); // For Monostructural Time items (Bike)
  const [variant, setVariant] = useState<Variant>(item.category === 'Benchmark' ? 'Rx' : null);
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine which fields to show based on scoreType/category
  const showReps = item.scoreType === 'Load';
  // Check if this is a calorie-based item (bike)
  const isCalorieBasedItem = item.id === 'bike-cals' || item.name.toLowerCase().includes('bike');
  // Show distance input for Monostructural items with Time scoreType (e.g., Run, Row) but not bike
  const showDistance = item.category === 'Monostructural' && item.scoreType === 'Time' && !isCalorieBasedItem;
  // Show calories input for bike items
  const showCalories = item.category === 'Monostructural' && item.scoreType === 'Time' && isCalorieBasedItem;
  const showVariant = item.category === 'Benchmark'; // Rx/Scaled only for WODs

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate result
    if (!validateResult(result, item.scoreType)) {
      setError(`Invalid ${item.scoreType.toLowerCase()} format`);
      return;
    }

    // Validate reps for Load type
    if (showReps && (!reps || parseInt(reps) < 1)) {
      setError('Please enter a valid number of reps');
      return;
    }

    // Validate distance for Monostructural Time items (Run, Row)
    if (showDistance && (!distance || parseFloat(distance) <= 0)) {
      setError('Please enter a valid distance');
      return;
    }

    // Validate calories for Monostructural Time items (Bike)
    if (showCalories && (!calories || parseFloat(calories) <= 0)) {
      setError('Please enter a valid calorie amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const resultValue = parseResultToValue(result, item.scoreType);
      const repsValue = showReps ? parseInt(reps) : undefined;
      
      // Convert distance to meters for storage
      let distanceInMeters: number | undefined;
      if (showDistance) {
        const rawDistance = parseFloat(distance);
        switch (distanceUnit) {
          case 'km':
            distanceInMeters = rawDistance * 1000;
            break;
          case 'mi':
            distanceInMeters = rawDistance * 1609.34;
            break;
          default:
            distanceInMeters = rawDistance;
        }
      }

      // Build display result string
      let displayResult: string;
      let caloriesValue: number | undefined;
      
      if (showDistance && distanceInMeters) {
        // Format: "400m in 1:20" or "1.5km in 6:30"
        const distanceDisplay = distanceUnit === 'm' 
          ? `${distance}m`
          : `${distance}${distanceUnit}`;
        displayResult = `${distanceDisplay} in ${result}`;
      } else if (showCalories) {
        // Format: "50 cal in 3:20"
        caloriesValue = parseFloat(calories);
        displayResult = `${calories} cal in ${result}`;
      } else {
        displayResult = formatCompoundResult(result, item.scoreType, {
          reps: repsValue,
          weightUnit: settings.weightUnit,
          distanceUnit: settings.distanceUnit,
        });
      }
      
      await addPRLog({
        catalogItemId: item.id,
        result: displayResult,
        resultValue,
        variant,
        date: date.getTime(),
        notes: notes.trim() || undefined,
        reps: repsValue,
        distance: distanceInMeters,
        calories: caloriesValue,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to save. Please try again.');
      console.error('[LogResultModal] Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUnitLabel = () => {
    switch (item.scoreType) {
      case 'Load':
        return settings.weightUnit;
      case 'Distance':
        return settings.distanceUnit;
      default:
        return '';
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
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] border-t sm:border border-[var(--color-border)] sm:rounded-xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Log Result</h2>
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
          {/* Item name (read-only) */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Item
            </label>
            <div className="px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)]">
              {item.name}
            </div>
          </div>

          {/* Reps input for Load type */}
          {showReps && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                Reps
              </label>
              <input
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Use 1 for 1RM (one-rep max)
              </p>
            </div>
          )}

          {/* Distance input for Monostructural Time items (Run, Row) */}
          {showDistance && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                Distance
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="e.g., 400"
                  className="flex-1 px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
                <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
                  {(['m', 'km', 'mi'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setDistanceUnit(unit)}
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        distanceUnit === unit
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Calories input for Monostructural Time items (Bike) */}
          {showCalories && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                Calories
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="e.g., 50"
                  className="flex-1 px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
                <div className="flex items-center px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)] text-sm font-medium">
                  cal
                </div>
              </div>
            </div>
          )}

          {/* Result input */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              {getResultLabel(item.scoreType)} {getUnitLabel() && item.scoreType === 'Load' && `(${getUnitLabel()})`}
            </label>
            {item.scoreType === 'Time' ? (
              <TimeInput
                value={result}
                onChange={setResult}
                autoFocus
              />
            ) : (
              <input
                type="text"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder={getResultPlaceholder(item.scoreType)}
                className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                autoFocus
                required
              />
            )}
          </div>

          {/* Variant selector - only for Benchmark WODs */}
          {showVariant && (
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

          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Date
            </label>
            <DatePicker
              value={date}
              onChange={setDate}
              maxDate={new Date()}
            />
          </div>

          {/* Notes (optional) */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Notes <span className="text-[var(--color-text-muted)]">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel? Any observations..."
              rows={2}
              className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || !result.trim()}
            className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
};
