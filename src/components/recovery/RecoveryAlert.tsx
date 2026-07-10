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
        leftBorder: 'border-l-4 border-[var(--color-primary)]',
        icon: <Info className="w-4 h-4 text-[var(--color-primary)]" />,
        titleColor: 'text-[var(--color-primary)]',
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
      className={`${style.leftBorder} bg-[var(--color-surface)] p-3 pl-4`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2">
          {style.icon}
          <h3 className={`font-display text-sm tracking-[0.15em] ${style.titleColor}`}>{title.toUpperCase()}</h3>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-[var(--color-surface-elevated)] transition-colors"
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
              className={`flex items-center gap-2 text-xs ${style.textColor} tracking-wide`}
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
          className="flex-1 py-2 px-3 bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)] text-[var(--color-text)] font-display text-xs tracking-[0.1em] transition-colors hover:bg-[var(--color-border-strong)]"
          aria-label="Acknowledge alert"
        >
          GOT IT
        </button>
        {showRestDayButton && (
          <button
            onClick={handleLogRestDay}
            disabled={isSaving}
            className="flex-1 py-2 px-3 bg-[var(--color-primary)] text-[var(--color-bg)] font-display text-xs tracking-[0.1em] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            aria-label="Log rest day"
          >
            <Moon className="w-3.5 h-3.5" />
            REST DAY
          </button>
        )}
      </div>
    </div>
  );
};
