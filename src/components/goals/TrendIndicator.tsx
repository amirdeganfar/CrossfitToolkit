import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';
import type { TrendStatus } from '../../types/goal';

interface TrendIndicatorProps {
  trend: TrendStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const trendConfig: Record<
  TrendStatus,
  {
    icon: typeof TrendingUp;
    label: string;
    colorClass: string;
    bgClass: string;
  }
> = {
  ahead: {
    icon: TrendingUp,
    label: 'Ahead',
    colorClass: 'text-green-500',
    bgClass: 'bg-green-500/10',
  },
  on_track: {
    icon: Minus,
    label: 'On Track',
    colorClass: 'text-yellow-500',
    bgClass: 'bg-yellow-500/10',
  },
  behind: {
    icon: TrendingDown,
    label: 'Behind',
    colorClass: 'text-red-500',
    bgClass: 'bg-red-500/10',
  },
  no_data: {
    icon: HelpCircle,
    label: 'No Data',
    colorClass: 'text-[var(--color-text-muted)]',
    bgClass: 'bg-[var(--color-surface-elevated)]',
  },
};

export const TrendIndicator = ({
  trend,
  showLabel = true,
  size = 'md',
  className = '',
}: TrendIndicatorProps) => {
  const config = trendConfig[trend];
  const Icon = config.icon;

  const iconSize = size === 'sm' ? 14 : 16;
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';
  const paddingClass = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';

  return (
    <div
      className={`inline-flex items-center gap-1 ${paddingClass} rounded-full ${config.bgClass} ${config.colorClass} ${className}`}
      aria-label={`Trend: ${config.label}`}
    >
      <Icon size={iconSize} aria-hidden="true" />
      {showLabel && (
        <span className={`${textClass} font-medium`}>{config.label}</span>
      )}
    </div>
  );
};
