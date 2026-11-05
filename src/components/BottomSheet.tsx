import { useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

/**
 * BottomSheet — slide-up sheet matching the LogResultModal treatment:
 * shared .sheet styles (backdrop fade, drag handle, top radius). Used for secondary flows
 * (e.g. the daily check-in) that shouldn't own permanent screen space.
 */
interface BottomSheetProps {
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export const BottomSheet = ({ title, onClose, children }: BottomSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Escape, scroll lock, initial focus, focus trap + restore.
  useModalA11y(sheetRef, onClose);

  return (
    <div className="sheet-root">
      {/* Backdrop */}
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="sheet"
      >
        <div className="sheet-handle" aria-hidden="true" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
          <h2 className="t-section">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-[var(--color-surface-elevated)]"
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
