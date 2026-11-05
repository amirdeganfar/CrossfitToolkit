/**
 * RecoveryAlert Component
 *
 * Tactical alert with left border accent — no rounded cards.
 */

import { useState, useCallback } from 'react';
import { AlertTriangle, Info, AlertCircle, X, Moon } from 'lucide-react';
import { useCheckInStore } from '../../stores/checkInStore';
import { ALERT_TITLES, ALERT_DESCRIPTIONS, type AlertLevel } from '../../config/recoveryScoring.config';

interface AlertStyle {
  leftBorder: string;
  icon: React.ReactNode;
  titleColor: string;
  textColor: string;
}

const getAlertStyle = (level: AlertLevel): AlertStyle => {
  switch (level) {
    case 'info':
      return {
        leftBorder: 'border-l-4 border-[var(--color-info)]',
        icon: <Info className="w-4 h-4 text-[var(--color-info)]" />,
        titleColor: 'text-[var(--color-info)]',
        textColor: 'text-[var(--color-text-muted)]',
      };
    case 'warning':
      return {
        leftBorder: 'border-l-4 border-[var(--color-warning)]',
        icon: <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />,
        titleColor: 'text-[var(--color-warning)]',
        textColor: 'text-[var(--color-text-muted)]',
      };
    case 'critical':
      return {
        leftBorder: 'border-l-4 border-[var(--color-danger)]',
        icon: <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />,
        titleColor: 'text-[var(--color-danger)]',
        textColor: 'text-[var(--color-text-muted)]',
      };
    default:
      return {
        leftBorder: '',
        icon: null,
        titleColor: '',
        textColor: '',
      };
  }
};

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

  if (!recoveryScore || recoveryScore.level === 'none' || isDismissed) {
    return null;
  }

  const showRestDayButton = !todayCheckIn || todayCheckIn.type !== 'rest';
  const style = getAlertStyle(recoveryScore.level);
  const title = ALERT_TITLES[recoveryScore.level];
  const description = ALERT_DESCRIPTIONS[recoveryScore.level];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`${style.leftBorder} rounded-lg bg-[var(--color-surface)] p-4`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2">
          {style.icon}
          <h3 className={`t-section text-[15px] ${style.titleColor}`}>{title}</h3>
        </div>
        <button
          onClick={handleDismiss}
          className="w-8 h-8 -mr-2 -mt-1 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-elevated)] transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Description */}
      <p className={`text-xs ${style.textColor} mb-2`}>{description}</p>

      {/* Reasons */}
      {recoveryScore.reasons.length > 0 && (
        <ul className="space-y-0.5 mb-3">
          {recoveryScore.reasons.map((reason, index) => (
            <li
              key={`${reason.metric}-${index}`}
              className={`flex items-center gap-2 text-xs ${style.textColor}`}
            >
              <span className="w-1 h-1 bg-current opacity-60" aria-hidden="true" />
              {reason.message}
            </li>
          ))}
        </ul>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleDismiss}
          className="flex-1 min-h-[40px] px-3 rounded-sm bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)] text-[var(--color-text)] text-sm font-semibold transition-colors hover:bg-[var(--color-border-strong)]"
          aria-label="Acknowledge alert"
        >
          Got it
        </button>
        {showRestDayButton && (
          <button
            onClick={handleLogRestDay}
            disabled={isSaving}
            className="flex-1 min-h-[40px] px-3 rounded-sm chip-selected text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            aria-label="Log rest day"
          >
            <Moon className="w-3.5 h-3.5" />
            Log rest day
          </button>
        )}
      </div>
    </div>
  );
};
