import { useState } from 'react';
import { X } from 'lucide-react';
import type { CatalogItem, Variant } from '../types/catalog';
import { useCatalogStore } from '../stores/catalogStore';
import { parseResultToValue, validateResult, getResultPlaceholder, getResultLabel, formatCompoundResult } from '../utils/resultParser';
import { isDualMetricItem, isDistanceOnlyItem } from '../utils/itemMetrics';
import { DatePicker } from './DatePicker';
import { TimeInput } from './TimeInput';
import { PlateStepper } from './PlateStepper';
import { LoadedBarButton } from './LoadedBarButton';

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
  const [reps, setReps] = useState<string>('1');
  const [distance, setDistance] = useState<string>('');
  const [distanceUnit, setDistanceUnit] = useState<'m' | 'km' | 'mi'>('m');
  const [calories, setCalories] = useState<string>('');
  const [metricType, setMetricType] = useState<'distance' | 'calories'>('distance');
  const [variant, setVariant] = useState<Variant>(item.category === 'Benchmark' ? 'Rx' : null);
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showReps = item.scoreType === 'Load';
  const isDual = isDualMetricItem(item);
  const isDistanceOnly = isDistanceOnlyItem(item);
  const showDistance = isDistanceOnly || (isDual && metricType === 'distance');
  const showCalories = isDual && metricType === 'calories';
  const showVariant = item.category === 'Benchmark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateResult(result, item.scoreType)) {
      setError(`Invalid ${item.scoreType.toLowerCase()} format`);
      return;
    }

    if (item.scoreType === 'Load' && parseFloat(result) <= 0) {
      setError('Please enter a weight greater than 0');
      return;
    }

    if (showReps && (!reps || parseInt(reps) < 1)) {
      setError('Please enter a valid number of reps');
      return;
    }

    if (showDistance && (!distance || parseFloat(distance) <= 0)) {
      setError('Please enter a valid distance');
      return;
    }

    if (showCalories && (!calories || parseFloat(calories) <= 0)) {
      setError('Please enter a valid calorie amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const resultValue = parseResultToValue(result, item.scoreType);
      const repsValue = showReps ? parseInt(reps) : undefined;

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

      let displayResult: string;
      let caloriesValue: number | undefined;

      if (showDistance && distanceInMeters) {
        const distanceDisplay = distanceUnit === 'm'
          ? `${distance}m`
          : `${distance}${distanceUnit}`;
        displayResult = `${distanceDisplay} in ${result}`;
      } else if (showCalories) {
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
      case 'Load':     return settings.weightUnit;
      case 'Distance': return settings.distanceUnit;
      default:         return '';
    }
  };

  // Underline input class
  const inputClass = 'w-full bg-transparent border-b border-[var(--color-border-strong)] px-0 py-2.5 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors font-display tracking-wider text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-[var(--color-bg)] border-t-2 border-t-[var(--color-primary)] border-x border-[var(--color-border-strong)] sm:border-2 sm:border-[var(--color-border-strong)] sm:border-t-[var(--color-primary)] overflow-hidden animate-slide-up">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-0.5 bg-[var(--color-border-strong)] mx-auto mb-3" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
          <div>
            <h2 className="font-display text-xl text-[var(--color-text)]">Log · {item.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-surface-elevated)] active:scale-95 transition-all"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          {/* Reps input for Load type */}
          {showReps && (
            <div>
              <label className="block font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)] mb-2">REPS</label>
              <input
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="1"
                className={inputClass}
              />
              <p className="mt-1 font-display text-xs text-[var(--color-text-muted)] tracking-widest">USE 1 FOR 1RM</p>
            </div>
          )}

          {/* Metric type toggle for dual-metric items */}
          {isDual && (
            <div>
              <label className="block font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)] mb-2">MEASURE BY</label>
              <div className="flex border-b border-[var(--color-border)]">
                {(['distance', 'calories'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMetricType(type)}
                    className={`flex-1 py-2 font-display text-sm tracking-widest transition-colors border-b-2 -mb-px ${
                      metricType === type
                        ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                        : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Distance input */}
          {showDistance && (
            <div>
              <label className="block font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)] mb-2">DISTANCE</label>
              <div className="flex gap-3 items-end">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="e.g., 400"
                  className={`flex-1 ${inputClass}`}
                />
                <div className="flex border-b border-[var(--color-border-strong)]">
                  {(['m', 'km', 'mi'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setDistanceUnit(unit)}
                      className={`px-2 py-2 font-display text-xs tracking-widest transition-colors border-b-2 -mb-px ${
                        distanceUnit === unit
                          ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {unit.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Calories input */}
          {showCalories && (
            <div>
              <label className="block font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)] mb-2">CALORIES</label>
              <div className="flex gap-3 items-end">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="e.g., 50"
                  className={`flex-1 ${inputClass}`}
                />
                <span className="font-display text-xs tracking-widest text-[var(--color-text-muted)] pb-2.5">CAL</span>
              </div>
            </div>
          )}

          {/* Result input */}
          <div>
            <label className="block font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)] mb-2">
              {getResultLabel(item.scoreType).toUpperCase()} {getUnitLabel() && item.scoreType === 'Load' && `(${getUnitLabel().toUpperCase()})`}
            </label>
            {item.scoreType === 'Time' ? (
              <TimeInput
                value={result}
                onChange={setResult}
                autoFocus
              />
            ) : item.scoreType === 'Load' ? (
              <div className="py-2">
                <PlateStepper
                  value={parseFloat(result) || 0}
                  step={settings.weightUnit === 'lb' ? 5 : 2.5}
                  unit={settings.weightUnit}
                  onChange={(v) => setResult(String(v))}
                />
              </div>
            ) : (
              <input
                type="text"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder={getResultPlaceholder(item.scoreType)}
                className={inputClass}
                autoFocus
                required
              />
            )}
          </div>

          {/* Variant selector — RxTag-style toggles */}
          {showVariant && (
            <div>
              <label className="block label-eyebrow mb-2">Effort</label>
              <div className="flex gap-2">
                {VARIANTS.map((v) => {
                  const active = variant === v.value;
                  const label = v.value === 'Rx+' ? 'RX+' : v.value === 'Scaled' ? 'SCALED' : 'RX';
                  return (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => setVariant(v.value)}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-extrabold tracking-[0.06em] transition-transform active:scale-95"
                      style={
                        active
                          ? { background: 'var(--color-primary)', color: 'var(--color-bg)' }
                          : v.value === 'Scaled'
                            ? { color: 'var(--color-text-muted)', border: '1.5px dashed rgba(255,255,255,0.25)' }
                            : { color: '#fff', border: '1.5px solid rgba(255,255,255,0.25)' }
                      }
                      aria-pressed={active}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date picker */}
          <div>
            <label className="block font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)] mb-2">DATE</label>
            <DatePicker
              value={date}
              onChange={setDate}
              maxDate={new Date()}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)] mb-2">
              NOTES <span className="normal-case opacity-50 font-display text-[10px]">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel?"
              rows={2}
              className="w-full bg-transparent border-b border-[var(--color-border-strong)] px-0 py-2.5 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none text-sm"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="border-l-2 border-[var(--color-danger)] pl-3 py-1">
              <p className="font-display text-xs tracking-widest text-[var(--color-danger)]">{error.toUpperCase()}</p>
            </div>
          )}

          {/* Submit button */}
          <LoadedBarButton type="submit" disabled={isSubmitting || !result.trim()}>
            {isSubmitting ? 'Saving…' : `Save · ${item.name}`}
          </LoadedBarButton>
        </form>
      </div>
    </div>
  );
};
