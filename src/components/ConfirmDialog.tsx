import { useId, useRef } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmDialog = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmDialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const messageId = useId();
  useModalA11y(dialogRef, onCancel);

  return (
    <div className="sheet-root">
      {/* Backdrop */}
      <div className="sheet-backdrop" onClick={onCancel} aria-hidden="true" />

      {/* Sheet */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        className="sheet sheet-sm"
      >
        <div className="sheet-handle" aria-hidden="true" />

        {/* Content */}
        <div className="px-4 pt-3 pb-4 space-y-2">
          <h2 id={titleId} className="t-section">{title}</h2>
          <p id={messageId} className="t-body text-[var(--color-text-muted)]">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-6 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-[48px] px-4 rounded-md bg-transparent border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-elevated)] font-semibold text-[15px] text-[var(--color-text)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 min-h-[48px] px-4 rounded-md font-semibold text-[15px] hover:opacity-90 ${
              isDestructive
                ? 'bg-[var(--color-danger-fill)] text-white'
                : 'bg-[var(--color-primary)] text-[var(--color-text)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
