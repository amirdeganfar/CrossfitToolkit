import type { ReactNode } from 'react';
import type { Category } from '../types/catalog';
import { categoryColorHex } from '../utils/categoryColors';

/**
 * PlateBadge — a competition bumper plate seen head-on.
 * Colored rubber rim + dark hub + a category glyph (lucide icon) that
 * inherits the category color via currentColor. Glows in its color.
 *
 *   <PlateBadge category="Lift" favorite>
 *     <Dumbbell size={18} />
 *   </PlateBadge>
 *
 * Tapping the badge (when onToggleFavorite is provided) toggles favorite.
 */
interface PlateBadgeProps {
  category: Category;
  size?: number;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  children: ReactNode;
}

export function PlateBadge({ category, size = 46, favorite = false, onToggleFavorite, children }: PlateBadgeProps) {
  const color = categoryColorHex(category);
  const hub = Math.round(size * 0.65);
  const content = (
    <>
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
    </>
  );

  const style = { width: size, height: size, borderRadius: 9999, background: color, boxShadow: `0 0 14px ${color}80` };

  if (onToggleFavorite) {
    return (
      <button
        type="button"
        aria-label={favorite ? 'Remove favorite' : 'Add favorite'}
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className="relative flex shrink-0 items-center justify-center transition-transform active:scale-95"
        style={style}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={style}>
      {content}
    </div>
  );
}
