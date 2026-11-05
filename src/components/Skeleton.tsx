import type { CSSProperties } from 'react';

/**
 * Skeleton — shimmering placeholder for content that is still loading.
 *
 *   <Skeleton className="h-6 w-24" />
 *   <SkeletonRows count={3} />       // list of card-shaped rows
 */
interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return <span className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

interface SkeletonRowsProps {
  count?: number;
  /** Show a round leading badge, like the catalog / recent-result rows. */
  withBadge?: boolean;
  label?: string;
}

export function SkeletonRows({ count = 3, withBadge = true, label = 'Loading' }: SkeletonRowsProps) {
  return (
    <div className="space-y-2" role="status" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)]">
          {withBadge && <Skeleton className="h-10 w-10 rounded-full shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-5 w-14" />
        </div>
      ))}
    </div>
  );
}
