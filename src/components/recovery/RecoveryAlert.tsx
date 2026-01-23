/**
 * RecoveryAlert Component
 *
 * Displays recovery alerts with reasons when the user's score warrants attention.
 * Shows different severity levels: info, warning, critical.
 */

import { useState, useCallback } from 'react';
import { AlertTriangle, Info, AlertCircle, X, Moon } from 'lucide-react';
import { useCheckInStore } from '../../stores/checkInStore';
import { ALERT_TITLES, ALERT_DESCRIPTIONS, type AlertLevel } from '../../config/recoveryScoring.config';

// ═══════════════════════════════════════════════════════════════════════════
// ALERT STYLING CONFIG
// ═══════════════════════════════════════════════════════════════════════════

interface AlertStyle {
  bg: string;
  border: string;
  icon: React.ReactNode;
  titleColor: string;
  textColor: string;
}

const getAlertStyle = (level: AlertLevel): AlertStyle => {
  switch (level) {
    case 'info':
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        icon: <Info className="w-5 h-5 text-yellow-500" />,
        titleColor: 'text-yellow-600 dark:text-yellow-400',
        textColor: 'text-yellow-700 dark:text-yellow-300',
      };
    case 'warning':
      return {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
        titleColor: 'text-orange-600 dark:text-orange-400',
        textColor: 'text-orange-700 dark:text-orange-300',
      };
    case 'critical':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
        titleColor: 'text-red-600 dark:text-red-400',
        textColor: 'text-red-700 dark:text-red-300',
      };
    default:
      return {
        bg: '',
        border: '',
        icon: null,
        titleColor: '',
        textColor: '',
      };
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const RecoveryAlert = () => {
  const recoveryScore = useCheckInStore((s) => s.recoveryScore);
  const todayCheckIn = useCheckInStore((s) => s.todayCheckIn);
  const saveRestDay = useCheckInStore((s) => s.saveRestDay);
  const isSaving = useCheckInStore((s) => s.isSaving);

  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  const handleLogRestDay = useCallback(async () => {
    await saveRestDay();
    setIsDismissed(true);
  }, [saveRestDay]);

  // Don't show if no score, no alert needed, or already dismissed
  if (!recoveryScore || recoveryScore.level === 'none' || isDismissed) {
    return null;
  }

  // Don't show rest day button if already logged as rest day
  const showRestDayButton = !todayCheckIn || todayCheckIn.type !== 'rest';

  const style = getAlertStyle(recoveryScore.level);
  const title = ALERT_TITLES[recoveryScore.level];
  const description = ALERT_DESCRIPTIONS[recoveryScore.level];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`${style.bg} ${style.border} border rounded-xl p-4 mb-4`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {style.icon}
          <h3 className={`font-semibold ${style.titleColor}`}>{title}</h3>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Description */}
      <p className={`text-sm ${style.textColor} mb-3`}>{description}</p>

      {/* Reasons */}
      {recoveryScore.reasons.length > 0 && (
        <ul className="space-y-1 mb-4">
          {recoveryScore.reasons.map((reason, index) => (
            <li
              key={`${reason.metric}-${index}`}
              className={`flex items-center gap-2 text-sm ${style.textColor}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" aria-hidden="true" />
              {reason.message}
            </li>
          ))}
        </ul>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleDismiss}
          className="flex-1 py-2 px-4 bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium rounded-lg transition-colors"
          aria-label="Acknowledge alert"
        >
          Got it
        </button>
        {showRestDayButton && (
          <button
            onClick={handleLogRestDay}
            disabled={isSaving}
            className="flex-1 py-2 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            aria-label="Log rest day"
          >
            <Moon className="w-4 h-4" />
            Log Rest Day
          </button>
        )}
      </div>
    </div>
  );
};
