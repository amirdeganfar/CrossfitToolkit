import { useState } from 'react';
import { X } from 'lucide-react';
import type { CatalogItem, Variant, ScoreType } from '../types/catalog';
import { useCatalogStore } from '../stores/catalogStore';
import { parseResultToValue, validateResult, getResultPlaceholder, getResultLabel, formatCompoundResult, formatSecondsToTime, parseTimeToSeconds } from '../utils/resultParser';
import { getScoreModes, SCORE_TYPES } from '../config/scoreTypes';
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

  // Allowed score modes for this item; when >1 the user picks one per log.
  const modes = getScoreModes(item);
  const isMultiMode = modes.length > 1;

  const [scoreType, setScoreType] = useState<ScoreType>(item.scoreType);
  const [result, setResult] = useState('');
  const [reps, setReps] = useState<string>('1');
  const [distance, setDistance] = useState<string>('');
  const [distanceUnit, setDistanceUnit] = useState<'m' | 'km' | 'mi'>('m');
  const [calories, setCalories] = useState<string>('');
  const [timeCap, setTimeCap] = useState<string>(item.timeCap ? formatSecondsToTime(item.timeCap) : '');
  const [targetReps, setTargetReps] = useState<string>(item.targetReps ? String(item.targetReps) : '');
  const [metricType, setMetricType] = useState<'distance' | 'calories'>('distance');
  const [variant, setVariant] = useState<Variant>(item.category === 'Benchmark' ? 'Rx' : null);
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showReps = scoreType === 'Load';
  const isRepsInTime = scoreType === 'RepsInTime';
  const isTimeForReps = scoreType === 'TimeForReps';
  // Dual/distance metrics only apply to single-mode Monostructural items.
  const isDual = !isMultiMode && isDualMetricItem(item);
  const isDistanceOnly = !isMultiMode && isDistanceOnlyItem(item);
  const showDistance = isDistanceOnly || (isDual && metricType === 'distance');
  const showCalories = isDual && metricType === 'calories';
  const showVariant = item.category === 'Benchmark';

  // Switching mode: clear the result (its format differs per mode) and re-prefill
  // this mode's constraint default from the item.
  const handleScoreTypeChange = (next: ScoreType) => {
    setScoreType(next);
    setResult('');
    setError(null);
    setTimeCap(item.timeCap ? formatSecondsToTime(item.timeCap) : '');
    setTargetReps(item.targetReps ? String(item.targetReps) : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateResult(result, scoreType)) {
      setError(`Invalid ${scoreType.toLowerCase()} format`);
      return;
    }

    if (scoreType === 'Load' && parseFloat(result) <= 0) {
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

    if (isRepsInTime && (!timeCap || parseTimeToSeconds(timeCap) <= 0)) {
      setError('Please enter a valid time cap');
      return;
    }

    if (isTimeForReps && (!targetReps || parseInt(targetReps) < 1)) {
      setError('Please enter a valid rep target');
      return;
    }

    setIsSubmitting(true);

    try {
      const resultValue = parseResultToValue(result, scoreType);
      const repsValue = showReps ? parseInt(reps) : undefined;
      const timeCapValue = isRepsInTime ? parseTimeToSeconds(timeCap) : undefined;
      const targetRepsValue = isTimeForReps ? parseInt(targetReps) : undefined;

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
      } else if (isRepsInTime && timeCapValue) {
        displayResult = `${result} reps in ${formatSecondsToTime(timeCapValue)}`;
      } else if (isTimeForReps) {
        displayResult = `${targetReps} reps in ${result}`;
      } else {
        displayResult = formatCompoundResult(result, scoreType, {
          reps: repsValue,
          weightUnit: settings.weightUnit,
          distanceUnit: settings.distanceUnit,
        });
      }

      await addPRLog({
        catalogItemId: item.id,
        result: displayResult,
        resultValue,
        scoreTypeId: scoreType,
        variant,
        date: date.getTime(),
        notes: notes.trim() || undefined,
        reps: repsValue,
        distance: distanceInMeters,
        calories: caloriesValue,
        timeCap: timeCapValue,
        targetReps: targetRepsValue,
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
    switch (scoreType) {
      case 'Load':     return settings.weightUnit;
      case 'Distance': return settings.distanceUnit;
      default:         return '';
    }
  };

  // Filled field class (visible on near-black — see .field in index.css)
  const inputClass = 'field w-full px-3 py-2.5 font-display tracking-wider text-sm';

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
          {/* Score-type selector — only when the item supports multiple modes */}
          {isMultiMode && (
            <div>
              <label className="block font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)] mb-2">LOG AS</label>
              <div className="flex border-b border-[var(--color-border)] overflow-x-auto">
                {modes.map((mode) => {
                  const active = scoreType === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleScoreTypeChange(mode)}
                      className={`flex-1 whitespace-nowrap py-2.5 px-2 font-display text-xs tracking-widest transition-colors border-b-2 -mb-px ${
                        active
                          ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                      aria-pressed={active}
                    >
                      {SCORE_TYPES[mode].name.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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

          {/* Time cap for RepsInTime items (how long you had to rack up reps) */}
          {isRepsInTime && (
            <div>
              <label className="block font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)] mb-2">TIME CAP</label>
              <TimeInput value={timeCap} onChange={setTimeCap} />
            </div>
          )}

          {/* Target reps for TimeForReps items (rep count you raced to complete) */}
          {isTimeForReps && (
            <div>
              <label className="block font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)] mb-2">TARGET REPS</label>
              <input
                type="number"
                min="1"
                value={targetReps}
                onChange={(e) => setTargetReps(e.target.value)}
                placeholder="e.g., 10"
                className={inputClass}
              />
            </div>
          )}

          {/* Result input */}
          <div>
            <label className="block font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)] mb-2">
              {getResultLabel(scoreType).toUpperCase()} {getUnitLabel() && scoreType === 'Load' && `(${getUnitLabel().toUpperCase()})`}
            </label>
            {scoreType === 'Time' || isTimeForReps ? (
              <TimeInput
                value={result}
                onChange={setResult}
                autoFocus
              />
            ) : scoreType === 'Load' ? (
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
                placeholder={getResultPlaceholder(scoreType)}
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
                          ? { background: 'var(--color-primary)', color: 'var(--color-text)' }
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
              className="field w-full px-3 py-2.5 resize-none text-sm"
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
