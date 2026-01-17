import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import type { PRLog } from '../types/catalog';

interface PercentageCalculatorProps {
  logs: PRLog[];
  weightUnit: 'kg' | 'lb';
}

/**
 * Calculator option derived from a log entry
 */
interface CalculatorOption {
  id: string;
  logId: string;
  label: string;           // "Est. 1RM: ~117kg" or "1RM: 120kg (actual)"
  sublabel: string;        // "from 5RM @ 100kg • Jan 18" or "Jan 10"
  baseWeight: number;      // The estimated 1RM value to use for calculations
  isEstimated: boolean;
  originalWeight: number;  // The raw logged weight
  originalReps: number;    // The raw logged reps
}

const PERCENTAGE_PRESETS = [90, 85, 80, 75, 70, 65, 60, 55, 50];

/**
 * Estimate 1RM using the Epley formula
 * Formula: weight × (1 + reps / 30)
 */
const estimateOneRepMax = (weight: number, reps: number): number => {
  if (reps <= 1) return weight; // Already a 1RM
  return weight * (1 + reps / 30);
};

/**
 * Round to nearest 0.5
 */
const roundToHalf = (value: number): number => {
  return Math.round(value * 2) / 2;
};

export const PercentageCalculator = ({ logs, weightUnit }: PercentageCalculatorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedPercentage, setSelectedPercentage] = useState(80);
  const [customPercentage, setCustomPercentage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Format date for display
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Transform logs into calculator options with estimated 1RM
  const calculatorOptions = useMemo((): CalculatorOption[] => {
    return logs.map((log) => {
      const reps = log.reps ?? 1;
      const originalWeight = log.resultValue;
      const estimated1RM = roundToHalf(estimateOneRepMax(originalWeight, reps));
      const isActual1RM = reps <= 1;

      return {
        id: `option-${log.id}`,
        logId: log.id,
        label: isActual1RM
          ? `1RM: ${originalWeight}${weightUnit} (actual)`
          : `Est. 1RM: ~${estimated1RM}${weightUnit}`,
        sublabel: isActual1RM
          ? formatDate(log.date)
          : `from ${reps}RM @ ${originalWeight}${weightUnit} • ${formatDate(log.date)}`,
        baseWeight: estimated1RM,
        isEstimated: !isActual1RM,
        originalWeight,
        originalReps: reps,
      };
    })
    // Sort by estimated 1RM (highest first)
    .sort((a, b) => b.baseWeight - a.baseWeight);
  }, [logs, weightUnit]);

  // Get the default option (highest estimated 1RM)
  const defaultOption = calculatorOptions[0] ?? null;

  // Get the currently selected option
  const selectedOption = useMemo(() => {
    if (selectedOptionId) {
      return calculatorOptions.find((opt) => opt.id === selectedOptionId) ?? defaultOption;
    }
    return defaultOption;
  }, [selectedOptionId, calculatorOptions, defaultOption]);

  // Calculate the result based on selected percentage
  const calculatedWeight = useMemo(() => {
    if (!selectedOption) return null;
    const baseWeight = selectedOption.baseWeight;
    const percentage = customPercentage ? parseFloat(customPercentage) : selectedPercentage;
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) return null;
    // Round to nearest 0.5
    return roundToHalf((baseWeight * percentage) / 100);
  }, [selectedOption, selectedPercentage, customPercentage]);

  // Handle preset click
  const handlePresetClick = (percentage: number) => {
    setSelectedPercentage(percentage);
    setCustomPercentage('');
  };

  // Handle custom percentage input
  const handleCustomChange = (value: string) => {
    setCustomPercentage(value);
  };

  // Get current active percentage
  const activePercentage = customPercentage ? parseFloat(customPercentage) : selectedPercentage;

  // No logs - show prompt
  if (logs.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface-elevated)] transition-colors"
          aria-expanded={isExpanded}
          aria-label="Toggle percentage calculator"
        >
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[var(--color-text-muted)]" />
            <span className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              % Calculator
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
          )}
        </button>
        
        <div
          className={`calculator-content ${isExpanded ? 'expanded' : ''}`}
          aria-hidden={!isExpanded}
        >
          <div className="px-4 py-6 text-center border-t border-[var(--color-border)]">
            <p className="text-[var(--color-text-muted)]">
              Log a result to use the calculator
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface-elevated)] transition-colors"
        aria-expanded={isExpanded}
        aria-label="Toggle percentage calculator"
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[var(--color-text-muted)]" />
          <span className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            % Calculator
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
        )}
      </button>

      {/* Expandable content */}
      <div
        className={`calculator-content ${isExpanded ? 'expanded' : ''}`}
        aria-hidden={!isExpanded}
      >
        <div className="px-4 py-4 space-y-4 border-t border-[var(--color-border)]">
          {/* Base selector */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Base
            </label>
            
            {/* Show dropdown only if multiple options */}
            {calculatorOptions.length > 1 ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-colors"
                  aria-haspopup="listbox"
                  aria-expanded={showDropdown}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">
                      {selectedOption?.label ?? 'Select entry'}
                    </span>
                    {selectedOption && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {selectedOption.sublabel}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown menu */}
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg shadow-lg z-10 max-h-56 overflow-y-auto">
                    {calculatorOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setSelectedOptionId(option.id);
                          setShowDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[var(--color-surface)] transition-colors ${
                          selectedOption?.id === option.id ? 'bg-[var(--color-primary)]/10' : ''
                        }`}
                        role="option"
                        aria-selected={selectedOption?.id === option.id}
                      >
                        <div className="flex flex-col">
                          <span className={`font-medium ${selectedOption?.id === option.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                            {option.label}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {option.sublabel}
                          </span>
                        </div>
                        {selectedOption?.id === option.id && (
                          <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Single option - just show it without dropdown
              <div className="px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg">
                <span className="font-medium text-[var(--color-text)]">
                  {selectedOption?.label ?? 'No entry'}
                </span>
                {selectedOption && (
                  <span className="text-xs text-[var(--color-text-muted)] ml-2">
                    ({selectedOption.sublabel})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Percentage presets */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Percentage
            </label>
            <div className="flex flex-wrap gap-2">
              {PERCENTAGE_PRESETS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => handlePresetClick(pct)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    !customPercentage && selectedPercentage === pct
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Custom percentage input */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-[var(--color-text-muted)]">
              Custom:
            </label>
            <div className="relative flex-1 max-w-24">
              <input
                type="number"
                min="1"
                max="100"
                value={customPercentage}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="—"
                className="w-full px-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors text-center"
              />
            </div>
            <span className="text-sm text-[var(--color-text-muted)]">%</span>
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--color-border)]" />

          {/* Calculated result */}
          <div className="text-center py-2">
            {calculatedWeight !== null && selectedOption ? (
              <>
                <div className="text-3xl font-bold text-[var(--color-primary)]">
                  {calculatedWeight} {weightUnit}
                </div>
                <div className="text-sm text-[var(--color-text-muted)] mt-1">
                  {activePercentage}% of {selectedOption.baseWeight}{weightUnit}
                  {selectedOption.isEstimated && (
                    <span className="text-xs"> (est.)</span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-[var(--color-text-muted)]">
                Enter a valid percentage (1-100)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
