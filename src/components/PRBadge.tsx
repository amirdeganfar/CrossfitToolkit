/** Small "PR" tag — marks the best result in history and heads the PR celebration. */
export function PRBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`text-[10px] font-extrabold tracking-[0.06em] rounded-xs bg-[var(--color-primary)]/20 text-[var(--color-primary-text)] px-1.5 py-0.5 ${className}`}
    >
      PR
    </span>
  );
}
