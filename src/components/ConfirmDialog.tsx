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
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative w-full max-w-sm mx-4 bg-[var(--color-bg)] border border-[var(--color-border-strong)] border-t-2 border-t-[var(--color-primary)] animate-slide-up">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-8 h-0.5 bg-[var(--color-border-strong)]" />
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-2">
          <h2 className="font-display text-xl tracking-[0.1em] text-[var(--color-text)]">{title.toUpperCase()}</h2>
          <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-6 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 px-4 bg-transparent border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-elevated)] active:scale-[0.98] font-display tracking-widest text-sm text-[var(--color-text)] transition-all"
          >
            {cancelLabel.toUpperCase()}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3.5 px-4 font-display tracking-widest text-sm transition-all active:scale-[0.98] ${
              isDestructive
                ? 'bg-[var(--color-danger)] hover:opacity-90 text-white'
                : 'bg-[var(--color-primary)] hover:opacity-90 text-[var(--color-text)]'
            }`}
          >
            {confirmLabel.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
};
