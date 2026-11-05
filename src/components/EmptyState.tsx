import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * EmptyState — icon, one line of direction, optional action.
 *
 *   <EmptyState icon={Target} message="Set a goal to track progress"
 *     action={{ label: 'Set a goal', onClick: open }} />
 */
interface EmptyStateProps {
  icon: LucideIcon;
  message: ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon: Icon, message, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`card flex flex-col items-center text-center gap-3 py-6 ${className}`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-elevated)]">
        <Icon className="h-5 w-5 text-[var(--color-text-muted)]" aria-hidden="true" />
      </span>
      <p className="t-body text-[var(--color-text-muted)] max-w-[28ch]">{message}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 rounded-full px-5 min-h-[44px] text-sm font-semibold bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)] text-[var(--color-text)] hover:bg-[var(--color-input)]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
