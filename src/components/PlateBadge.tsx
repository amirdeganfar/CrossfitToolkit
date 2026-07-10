import type { ReactNode } from 'react';

/**
 * PlateBadge — a competition bumper plate seen head-on.
 * Colored rubber rim + dark hub + a category glyph (lucide icon) that
 * inherits the category color via currentColor. Glows in its color.
 *
 *   <PlateBadge category="Lift" favorite>
 *     <Dumbbell size={18} />
 *   </PlateBadge>
 */
const CAT_COLOR: Record<string, string> = {
  Lift: '#0A84FF',
  Benchmark: '#FF9F0A',
  Monostructural: '#34C759',
  Cardio: '#34C759',
  Skill: '#BF5AF2',
  Custom: '#FF375F',
};

interface PlateBadgeProps {
  category: string;
  size?: number;
  favorite?: boolean;
  children: ReactNode;
}

export function PlateBadge({ category, size = 46, favorite = false, children }: PlateBadgeProps) {
  const color = CAT_COLOR[category] ?? 'var(--color-text-muted)';
  const hub = Math.round(size * 0.65);
  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, borderRadius: 9999, background: color, boxShadow: `0 0 14px ${color}80` }}
    >
      <div
        className="flex items-center justify-center"
        style={{ width: hub, height: hub, borderRadius: 9999, background: 'var(--color-surface)', color }}
      >
        {children}
      </div>
      {favorite && (
        <span
          className="absolute -right-1 -top-1 flex items-center justify-center"
          style={{ width: 18, height: 18, borderRadius: 9999, background: 'var(--color-primary)', color: 'var(--color-bg)' }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </span>
      )}
    </div>
  );
}
