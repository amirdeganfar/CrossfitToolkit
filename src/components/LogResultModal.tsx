import { useId, useRef, useState } from 'react';
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
import { useModalA11y } from '../hooks/useModalA11y';
import { haptics } from '../utils/haptics';

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

  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y(dialogRef, onClose);
  const titleId = useId();
  const repsId = useId();
  const distanceId = useId();
  const caloriesId = useId();
  const timeCapId = useId();
  const targetRepsId = useId();
  const resultId = useId();
  const dateLabelId = useId();
  const notesId = useId();

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

      haptics.success();
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
  const inputClass = 'field w-full px-3 py-2.5 text-[15px] num';

  return (
    <div className="sheet-root">
      {/* Backdrop */}
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="sheet"
      >
        <div className="sheet-handle" aria-hidden="true" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
          <div className="min-w-0">
            <p className="t-caption">Log result</p>
            <h2 id={titleId} className="t-section truncate">{item.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-[var(--color-surface-elevated)]"
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
              <label className="block label-eyebrow mb-2">Log as</label>
              <div className="flex border-b border-[var(--color-border)] overflow-x-auto">
                {modes.map((mode) => {
                  const active = scoreType === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleScoreTypeChange(mode)}
                      className={`flex-1 whitespace-nowrap py-2.5 px-2 text-[13px] font-semibold transition-colors border-b-2 -mb-px ${
                        active
                          ? 'border-[var(--color-text)] text-[var(--color-text)]'
                          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                      aria-pressed={active}
                    >
                      {SCORE_TYPES[mode].name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reps input for Load type */}
          {showReps && (
            <div>
              <label htmlFor={repsId} className="block label-eyebrow mb-2">Reps</label>
              <input
                id={repsId}
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="1"
                className={inputClass}
              />
              <p className="mt-1 t-caption">Use 1 for 1RM</p>
            </div>
          )}

          {/* Metric type toggle for dual-metric items */}
          {isDual && (
            <div>
              <label className="block label-eyebrow mb-2">Measure by</label>
              <div className="flex border-b border-[var(--color-border)]">
                {(['distance', 'calories'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMetricType(type)}
                    aria-pressed={metricType === type}
                    className={`flex-1 py-2 text-[14px] font-semibold capitalize transition-colors border-b-2 -mb-px ${
                      metricType === type
                        ? 'border-[var(--color-text)] text-[var(--color-text)]'
                        : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Distance input */}
          {showDistance && (
            <div>
              <label htmlFor={distanceId} className="block label-eyebrow mb-2">Distance</label>
              <div className="flex gap-3 items-end">
                <input
                  id={distanceId}
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
                      aria-pressed={distanceUnit === unit}
                      className={`px-2 py-2 text-[13px] font-semibold transition-colors border-b-2 -mb-px ${
                        distanceUnit === unit
                          ? 'border-[var(--color-text)] text-[var(--color-text)]'
                          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Calories input */}
          {showCalories && (
            <div>
              <label htmlFor={caloriesId} className="block label-eyebrow mb-2">Calories</label>
              <div className="flex gap-3 items-end">
                <input
                  id={caloriesId}
                  type="number"
                  min="1"
                  step="1"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="e.g., 50"
                  className={`flex-1 ${inputClass}`}
                />
                <span className="t-caption pb-2.5">cal</span>
              </div>
            </div>
          )}

          {/* Time cap for RepsInTime items (how long you had to rack up reps) */}
          {isRepsInTime && (
            <div>
              <label htmlFor={timeCapId} className="block label-eyebrow mb-2">Time cap</label>
              <TimeInput id={timeCapId} value={timeCap} onChange={setTimeCap} />
            </div>
          )}

          {/* Target reps for TimeForReps items (rep count you raced to complete) */}
          {isTimeForReps && (
            <div>
              <label htmlFor={targetRepsId} className="block label-eyebrow mb-2">Target reps</label>
              <input
                id={targetRepsId}
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
            <label htmlFor={resultId} className="block label-eyebrow mb-2">
              {getResultLabel(scoreType)} {getUnitLabel() && scoreType === 'Load' && `(${getUnitLabel()})`}
            </label>
            {scoreType === 'Time' || isTimeForReps ? (
              <TimeInput
                id={resultId}
                value={result}
                onChange={setResult}
                autoFocus
              />
            ) : scoreType === 'Load' ? (
              <div className="py-2 space-y-3">
                <PlateStepper
                  value={parseFloat(result) || 0}
                  step={settings.weightUnit === 'lb' ? 5 : 2.5}
                  unit={settings.weightUnit}
                  onChange={(v) => setResult(String(v))}
                />
                {/* Type a weight directly (the stepper is for fine-tuning) */}
                <input
                  id={resultId}
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  placeholder={`Type weight (${settings.weightUnit})`}
                  className={`${inputClass} text-center`}
                />
              </div>
            ) : (
              <input
                id={resultId}
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
                      className="flex-1 py-2.5 rounded-md text-[13px] font-extrabold tracking-[0.06em]"
                      style={
                        active
                          ? { background: 'var(--color-text)', color: 'var(--color-bg)' }
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
            <label id={dateLabelId} className="block label-eyebrow mb-2">Date</label>
            <DatePicker
              value={date}
              onChange={setDate}
              maxDate={new Date()}
              labelledBy={dateLabelId}
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor={notesId} className="block label-eyebrow mb-2">
              Notes <span className="font-normal text-[var(--color-text-dim)]">(optional)</span>
            </label>
            <textarea
              id={notesId}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel?"
              rows={2}
              className="field w-full px-3 py-2.5 resize-none text-sm"
            />
          </div>

          {/* Error message */}
          {error && (
            <div role="alert" className="border-l-2 border-[var(--color-danger)] pl-3 py-1">
              <p className="text-[13px] font-medium text-[var(--color-danger)]">{error}</p>
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
