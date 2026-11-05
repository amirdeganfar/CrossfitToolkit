import { createPortal } from 'react-dom';
import { useState, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import type { CatalogItem, Variant, ScoreType, PRLog } from '../../types/catalog';
import type { Goal, CreateGoalInput, UpdateGoalInput } from '../../types/goal';
import { ItemSelector } from './ItemSelector';
import { DatePicker } from '../DatePicker';
import { TimeInput } from '../TimeInput';
import { parseResultToValue, getResultPlaceholder, formatResult } from '../../utils/resultParser';
import { getScoreModes, getScoreTypeDef, formatSecondsToTime } from '../../config/scoreTypes';
import { supportsDistance } from '../../utils/itemMetrics';
import { toLocalDateString, parseLocalDate } from '../../utils/date';
import {
  convertWeight,
  convertDistance,
  formatMeters,
  formatWeight,
  formatDistance,
  type WeightUnit,
  type DistanceUnit,
} from '../../utils/units';
import { useCatalogStore } from '../../stores/catalogStore';
import { useModalA11y } from '../../hooks/useModalA11y';
import * as db from '../../db';

interface GoalModalProps {
  items: CatalogItem[];
  editGoal?: Goal | null;
  preselectedItem?: CatalogItem | null;
  preselectedScoreType?: ScoreType | null;
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

/** Item's effective score type for a goal pool (multi-mode → chosen pool). */
const resolveScoreType = (item: CatalogItem | null, scoreType: ScoreType): ScoreType =>
  item && getScoreModes(item).length <= 1 ? item.scoreType : scoreType;

/** Time goals on distance items (e.g. Run, Row) target a specific distance. */
const needsDistance = (item: CatalogItem | null, scoreType: ScoreType): boolean =>
  !!item && getScoreModes(item).length <= 1 && scoreType === 'Time' && supportsDistance(item);

/** Stored goal target → editable display string in the current units. */
const formatTargetForEdit = (
  goal: Goal,
  scoreType: ScoreType,
  weightUnit: WeightUnit,
  distanceUnit: DistanceUnit
): string => {
  if (scoreType === 'Time' || scoreType === 'TimeForReps') {
    return formatSecondsToTime(goal.targetValue); // MM:SS, or H:MM:SS from 60 min
  }
  if (scoreType === 'Load') {
    return String(Math.round(convertWeight(goal.targetValue, goal.unit, weightUnit) * 10) / 10);
  }
  if (scoreType === 'Distance') {
    return String(Math.round(convertDistance(goal.targetValue, goal.distanceUnit, distanceUnit)));
  }
  return String(goal.targetValue);
};

/** Meters → editable distance string in the display unit (whole units). */
const metersToInput = (meters: number, distanceUnit: DistanceUnit): string =>
  String(Math.round(convertDistance(meters, 'm', distanceUnit)));

/** A stored best PR, formatted in the current display units. */
const formatBest = (
  log: PRLog,
  scoreType: ScoreType,
  weightUnit: WeightUnit,
  distanceUnit: DistanceUnit
): string => {
  if (scoreType === 'Load') return formatWeight(log.resultValue, log.unit, weightUnit);
  if (scoreType === 'Distance') return formatDistance(log.resultValue, log.distanceUnit, distanceUnit);
  return formatResult(log.result, scoreType);
};

const defaultTargetDate = () => {
  // Default to 3 months from now
  const date = new Date();
  date.setMonth(date.getMonth() + 3);
  return date;
};

export const GoalModal = ({
  items,
  editGoal,
  preselectedItem,
  preselectedScoreType,
  weightUnit: weightUnitProp,
  onSave,
  onClose,
}: GoalModalProps) => {
  const settings = useCatalogStore((state) => state.settings);
  const weightUnit: 'kg' | 'lb' = weightUnitProp === 'lb' || weightUnitProp === 'kg' ? weightUnitProp : settings.weightUnit;
  const distanceUnit = settings.distanceUnit;

  const editItem = editGoal ? items.find((i) => i.id === editGoal.itemId) ?? null : null;
  const initialItem = editGoal ? editItem : preselectedItem || null;
  // For multi-mode items: which score pool the goal targets. Defaults to the
  // pool the modal was opened for, else the item's primary score type.
  const initialScoreType: ScoreType =
    (editGoal ? editGoal.scoreTypeId ?? editItem?.scoreType : undefined) ??
    preselectedScoreType ??
    initialItem?.scoreType ??
    'Reps';

  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(initialItem);
  const [scoreType, setScoreType] = useState<ScoreType>(initialScoreType);
  const [targetValue, setTargetValue] = useState(() =>
    editGoal
      ? formatTargetForEdit(editGoal, resolveScoreType(initialItem, initialScoreType), weightUnit, distanceUnit)
      : ''
  );
  const [targetDate, setTargetDate] = useState<Date>(() =>
    editGoal ? parseLocalDate(editGoal.targetDate) : defaultTargetDate()
  );
  const [variant, setVariant] = useState<Variant>(() =>
    editGoal ? editGoal.variant || null : initialItem?.category === 'Benchmark' ? 'Rx' : null
  );
  const [reps, setReps] = useState<number>(editGoal?.reps || 1);
  // Distance input, in the user's display unit (stored on the goal in meters).
  const [distance, setDistance] = useState<string>(
    editGoal?.distance ? metersToInput(editGoal.distance, distanceUnit) : ''
  );
  const [loggedDistances, setLoggedDistances] = useState<number[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(!!(editGoal?.variant || editGoal?.reps));
  const [currentBest, setCurrentBest] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y(dialogRef, onClose);
  const titleId = useId();
  const itemFieldId = useId();
  const targetFieldId = useId();
  const distanceFieldId = useId();
  const dateFieldId = useId();

  const isEditing = !!editGoal;

  const modes = selectedItem ? getScoreModes(selectedItem) : [];
  const isMultiMode = modes.length > 1;
  // The score type the goal targets — the chosen pool for multi-mode items,
  // otherwise the item's single score type.
  const effectiveScoreType = resolveScoreType(selectedItem, scoreType);
  const isTimeInput = effectiveScoreType === 'Time' || effectiveScoreType === 'TimeForReps';
  const showDistanceInput = needsDistance(selectedItem, effectiveScoreType);
  const enteredMeters = showDistanceInput ? convertDistance(parseFloat(distance), distanceUnit, 'm') : NaN;
  // Snap to a logged distance when within rounding error of the ft display
  // (e.g. 400m shows as 1312ft → 399.9m), so the pool matches exactly.
  const knownDistances = editGoal?.distance ? [editGoal.distance, ...loggedDistances] : loggedDistances;
  const snappedMeters = knownDistances.find((d) => Math.abs(d - enteredMeters) < 0.5) ?? enteredMeters;
  const goalDistance = Number.isFinite(snappedMeters) && snappedMeters > 0 ? snappedMeters : undefined;

  // Logged distances for distance items — offered as quick picks, and the
  // first one becomes the default distance when creating a goal.
  const itemId = selectedItem?.id;
  useEffect(() => {
    if (!itemId || !showDistanceInput) return;
    let cancelled = false;
    db.getBestPRsByDistance(itemId)
      .then((byDistance) => {
        if (cancelled) return;
        const distances = [...byDistance.keys()].sort((a, b) => a - b);
        setLoggedDistances(distances);
        if (distances.length > 0) setDistance((prev) => prev || metersToInput(distances[0], distanceUnit));
      })
      .catch((err) => console.error('[GoalModal] Error fetching distances:', err));
    return () => {
      cancelled = true;
    };
  }, [itemId, showDistanceInput, distanceUnit]);

  // Fetch current best PR for the selected item / pool. Stale responses (item
  // or pool changed while loading) are ignored.
  useEffect(() => {
    if (!selectedItem) return;
    let cancelled = false;

    const fetchCurrentBest = async () => {
      try {
        if (showDistanceInput) {
          const byDistance = await db.getBestPRsByDistance(selectedItem.id);
          if (cancelled) return;
          const best = goalDistance !== undefined ? byDistance.get(goalDistance) : undefined;
          setCurrentBest(best ? formatBest(best, effectiveScoreType, weightUnit, distanceUnit) : null);
          return;
        }
        const opts = {
          ...(isMultiMode && {
            scoreTypeId: effectiveScoreType,
            timeCap: effectiveScoreType === 'RepsInTime' ? selectedItem.timeCap : undefined,
            targetReps: effectiveScoreType === 'TimeForReps' ? selectedItem.targetReps : undefined,
          }),
          // Load goals target one rep scheme — compare against that scheme's best.
          reps: effectiveScoreType === 'Load' ? reps : undefined,
        };
        const bestPR = await db.getBestPR(selectedItem.id, variant || undefined, opts);
        if (!cancelled) {
          setCurrentBest(bestPR ? formatBest(bestPR, effectiveScoreType, weightUnit, distanceUnit) : null);
        }
      } catch (err) {
        console.error('[GoalModal] Error fetching best PR:', err);
        if (!cancelled) setCurrentBest(null);
      }
    };

    fetchCurrentBest();
    return () => {
      cancelled = true;
    };
  }, [selectedItem, variant, effectiveScoreType, isMultiMode, showDistanceInput, goalDistance, reps, weightUnit, distanceUnit]);

  const showVariantSelector = selectedItem?.category === 'Benchmark';
  const showRepsSelector = selectedItem?.scoreType === 'Load';

  // Changing the item resets everything derived from it: pool, target, variant, distance.
  const handleItemChange = (item: CatalogItem | null) => {
    setSelectedItem(item);
    // Keep the preselected pool only if the new item actually offers it.
    const keep = preselectedScoreType && getScoreModes(item).includes(preselectedScoreType) ? preselectedScoreType : null;
    setScoreType(keep ?? item?.scoreType ?? 'Reps');
    setTargetValue('');
    setVariant(item?.category === 'Benchmark' ? 'Rx' : null);
    setDistance('');
    setLoggedDistances([]);
    setCurrentBest(null);
    setError(null);
  };

  // Switching pool changes the target format — clear the entered value.
  const handleScoreTypeChange = (next: ScoreType) => {
    setScoreType(next);
    setTargetValue('');
    setError(null);
  };

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

    // Parse target value based on the targeted score type
    const parsedTargetValue = parseResultToValue(targetValue, effectiveScoreType);
    if (parsedTargetValue <= 0) {
      setError('Please enter a valid target value');
      return;
    }

    if (showDistanceInput && goalDistance === undefined) {
      setError('Please enter a distance');
      return;
    }

    // Validate date is not in the past (compare local calendar dates)
    const targetDateStr = toLocalDateString(targetDate);
    if (targetDateStr < toLocalDateString(new Date())) {
      setError('Target date must be in the future');
      return;
    }

    setIsSubmitting(true);

    try {
      // Bind the goal to a score pool for multi-mode items (constraint from the
      // item's default). Undefined for single-mode items — behavior unchanged.
      const poolScoreType = isMultiMode ? effectiveScoreType : undefined;
      const poolTimeCap =
        poolScoreType === 'RepsInTime' ? selectedItem.timeCap : undefined;
      const poolTargetReps =
        poolScoreType === 'TimeForReps' ? selectedItem.targetReps : undefined;

      if (isEditing && editGoal) {
        const updates: UpdateGoalInput = {
          targetValue: parsedTargetValue,
          targetDate: targetDateStr,
          variant: showVariantSelector ? variant : undefined,
          reps: showRepsSelector ? reps : undefined,
          scoreTypeId: poolScoreType,
          timeCap: poolTimeCap,
          targetReps: poolTargetReps,
          distance: goalDistance,
          // Target was entered in the current display units.
          unit: weightUnit,
          distanceUnit,
        };
        await onSave({ id: editGoal.id, updates });
      } else {
        const input: CreateGoalInput = {
          itemId: selectedItem.id,
          targetValue: parsedTargetValue,
          targetDate: targetDateStr,
          variant: showVariantSelector ? variant : undefined,
          reps: showRepsSelector ? reps : undefined,
          scoreTypeId: poolScoreType,
          timeCap: poolTimeCap,
          targetReps: poolTargetReps,
          distance: goalDistance,
          unit: weightUnit,
          distanceUnit,
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

    switch (effectiveScoreType) {
      case 'Time':
        return 'Target Time';
      case 'TimeForReps':
        return 'Target Time';
      case 'Load':
        return `Target Weight (${weightUnit})`;
      case 'Reps':
        return 'Target Reps';
      case 'RepsInTime':
        return 'Target Reps';
      case 'Distance':
        return `Target Distance (${distanceUnit})`;
      case 'Calories':
        return 'Target Calories';
      case 'Rounds+Reps':
        return 'Target Rounds+Reps';
      default:
        return 'Target';
    }
  };

  return createPortal(
    <div className="sheet-root">
      {/* Backdrop */}
      <div
        className="sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="sheet"
      >
        {/* Drag handle */}
        <div className="sheet-handle" aria-hidden="true" />
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] sticky top-0 z-10 bg-[var(--color-surface)]">
          <h2 id={titleId} className="t-section">
            {isEditing ? 'Edit goal' : 'Set goal'}
          </h2>
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
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Item selector */}
          <div>
            <label id={itemFieldId} className="block label-eyebrow mb-1">
              Item
            </label>
            <ItemSelector
              items={items}
              value={selectedItem}
              onChange={handleItemChange}
              disabled={isEditing}
              clearable={!isEditing}
              labelledBy={itemFieldId}
              placeholder="Search for an item..."
            />
          </div>

          {/* Score-type picker — only for multi-mode items */}
          {selectedItem && isMultiMode && (
            <div>
              <label className="block label-eyebrow mb-2">
                Goal type
              </label>
              <div className="flex flex-wrap gap-2">
                {modes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleScoreTypeChange(mode)}
                    aria-pressed={effectiveScoreType === mode}
                    className={`px-4 py-2.5 rounded-sm border text-sm font-semibold transition-colors ${
                      effectiveScoreType === mode
                        ? 'chip-selected'
                        : 'bg-[var(--color-input)] border-[var(--color-input-border)] text-[var(--color-text-muted)] hover:border-[var(--color-input-border-hover)]'
                    }`}
                  >
                    {getScoreTypeDef(mode).name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Distance — Time goals on distance items target one distance */}
          {selectedItem && showDistanceInput && (
            <div>
              <label htmlFor={distanceFieldId} className="block label-eyebrow mb-1">
                Distance ({distanceUnit})
              </label>
              <input
                id={distanceFieldId}
                type="number"
                min="1"
                step="any"
                inputMode="decimal"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder={distanceUnit === 'ft' ? 'e.g., 1312' : 'e.g., 400'}
                className="field w-full px-3 py-2"
              />
              {loggedDistances.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {loggedDistances.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDistance(metersToInput(d, distanceUnit))}
                      aria-pressed={goalDistance === d}
                      className={`px-3 py-1.5 rounded-sm border text-[13px] font-semibold num transition-colors ${
                        goalDistance === d
                          ? 'chip-selected'
                          : 'bg-[var(--color-input)] border-[var(--color-input-border)] text-[var(--color-text-muted)] hover:border-[var(--color-input-border-hover)]'
                      }`}
                    >
                      {formatMeters(d, distanceUnit)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Target value input */}
          {selectedItem && (
            <div>
              <label htmlFor={targetFieldId} className="block label-eyebrow mb-1">
                {getTargetLabel()}
              </label>
              {isTimeInput ? (
                <TimeInput
                  id={targetFieldId}
                  value={targetValue}
                  onChange={setTargetValue}
                  autoFocus={!isEditing}
                />
              ) : (
                <input
                  id={targetFieldId}
                  type="text"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={getResultPlaceholder(effectiveScoreType)}
                  className="field w-full px-3 py-2"
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
            <label id={dateFieldId} className="block label-eyebrow mb-1">
              Target date
            </label>
            <DatePicker
              value={targetDate}
              onChange={setTargetDate}
              minDate={new Date()}
              labelledBy={dateFieldId}
            />
          </div>

          {/* Advanced options toggle */}
          {selectedItem && (showVariantSelector || showRepsSelector) && (
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                aria-expanded={showAdvanced}
                className="text-sm font-medium text-[var(--color-text-muted)] underline underline-offset-2 hover:text-[var(--color-text)]"
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
                  <label className="block label-eyebrow mb-2">
                    Variant
                  </label>
                  <div className="flex gap-2">
                    {VARIANTS.map((v) => (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() => setVariant(v.value)}
                        aria-pressed={variant === v.value}
                        className={`flex-1 px-4 py-2.5 rounded-sm border text-sm font-semibold transition-colors ${
                          variant === v.value
                            ? 'chip-selected'
                            : 'bg-[var(--color-bg)] border-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
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
                  <label className="block label-eyebrow mb-2">
                    Rep scheme
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {REPS_OPTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReps(r)}
                        aria-pressed={reps === r}
                        className={`px-4 py-2.5 rounded-sm border text-sm font-semibold transition-colors ${
                          reps === r
                            ? 'chip-selected'
                            : 'bg-[var(--color-bg)] border-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
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
            <div
              role="alert"
              className="px-3 py-2 rounded-sm text-sm text-[var(--color-danger)] border"
              style={{
                background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-danger) 30%, transparent)',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || !selectedItem || !targetValue.trim()}
            className="w-full py-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-white font-bold text-[17px]"
          >
            {isSubmitting ? 'Saving…' : isEditing ? 'Update goal' : 'Create goal'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
};
