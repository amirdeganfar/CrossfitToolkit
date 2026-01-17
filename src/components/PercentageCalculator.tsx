import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import type { PRLog } from '../types/catalog';

interface PercentageCalculatorProps {
  logs: PRLog[];
  weightUnit: 'kg' | 'lb';
}

const PERCENTAGE_PRESETS = [90, 85, 80, 75, 70, 65, 60, 55, 50];

export const PercentageCalculator = ({ logs, weightUnit }: PercentageCalculatorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [selectedPercentage, setSelectedPercentage] = useState(80);
  const [customPercentage, setCustomPercentage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Sort logs by date (most recent first) and find default selection
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => b.date - a.date);
  }, [logs]);

  // Find the default log to select (most recent 1RM, or most recent if no 1RM)
  const defaultLog = useMemo(() => {
    const oneRepMax = sortedLogs.find((log) => log.reps === 1 || !log.reps);
    return oneRepMax ?? sortedLogs[0] ?? null;
  }, [sortedLogs]);

  // Get the currently selected log
  const selectedLog = useMemo(() => {
    if (selectedLogId) {
      return logs.find((log) => log.id === selectedLogId) ?? defaultLog;
    }
    return defaultLog;
  }, [selectedLogId, logs, defaultLog]);

  // Calculate the result based on selected percentage
  const calculatedWeight = useMemo(() => {
    if (!selectedLog) return null;
    const baseWeight = selectedLog.resultValue;
    const percentage = customPercentage ? parseFloat(customPercentage) : selectedPercentage;
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) return null;
    // Round to nearest 0.5
    return Math.round((baseWeight * percentage) / 100 * 2) / 2;
  }, [selectedLog, selectedPercentage, customPercentage]);

  // Format log entry for display
  const formatLogEntry = (log: PRLog): string => {
    const reps = log.reps ?? 1;
    return `${reps}RM @ ${log.resultValue}${weightUnit}`;
  };

  // Format date for display
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
            
            {/* Show dropdown only if multiple logs */}
            {sortedLogs.length > 1 ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-colors"
                  aria-haspopup="listbox"
                  aria-expanded={showDropdown}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">
                      {selectedLog ? formatLogEntry(selectedLog) : 'Select entry'}
                    </span>
                    {selectedLog && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {formatDate(selectedLog.date)}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown menu */}
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {sortedLogs.map((log) => (
                      <button
                        key={log.id}
                        onClick={() => {
                          setSelectedLogId(log.id);
                          setShowDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--color-surface)] transition-colors ${
                          selectedLog?.id === log.id ? 'bg-[var(--color-primary)]/10' : ''
                        }`}
                        role="option"
                        aria-selected={selectedLog?.id === log.id}
                      >
                        <div className="flex flex-col">
                          <span className={`font-medium ${selectedLog?.id === log.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                            {formatLogEntry(log)}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {formatDate(log.date)}
                          </span>
                        </div>
                        {selectedLog?.id === log.id && (
                          <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Single log - just show it without dropdown
              <div className="px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg">
                <span className="font-medium text-[var(--color-text)]">
                  {selectedLog ? formatLogEntry(selectedLog) : 'No entry'}
                </span>
                {selectedLog && (
                  <span className="text-xs text-[var(--color-text-muted)] ml-2">
                    ({formatDate(selectedLog.date)})
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
            {calculatedWeight !== null ? (
              <>
                <div className="text-3xl font-bold text-[var(--color-primary)]">
                  {calculatedWeight} {weightUnit}
                </div>
                <div className="text-sm text-[var(--color-text-muted)] mt-1">
                  {activePercentage}% of {selectedLog?.resultValue}{weightUnit}
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
