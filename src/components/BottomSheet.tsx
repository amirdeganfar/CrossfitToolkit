import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * BottomSheet — slide-up sheet matching the LogResultModal treatment:
 * dimmed backdrop, drag handle, yellow top rule. Used for secondary flows
 * (e.g. the daily check-in) that shouldn't own permanent screen space.
 */
interface BottomSheetProps {
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export const BottomSheet = ({ title, onClose, children }: BottomSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Escape closes; lock body scroll; move focus into the sheet on open.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    sheetRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--color-bg)] border-t-2 border-t-[var(--color-primary)] border-x border-[var(--color-border-strong)] sm:border-2 sm:border-[var(--color-border-strong)] sm:border-t-[var(--color-primary)] animate-slide-up focus:outline-none"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-0.5 bg-[var(--color-border-strong)] mx-auto mb-3" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
          <h2 className="font-display text-xl text-[var(--color-text)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-surface-elevated)] active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};
