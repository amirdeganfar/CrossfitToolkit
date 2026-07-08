interface GoalProgressProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const GoalProgress = ({
  progress,
  size = 'md',
  showLabel = true,
  className = '',
}: GoalProgressProps) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const roundedProgress = Math.round(clampedProgress);

  const heightClass = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' }[size];

  const getProgressColor = () => {
    if (roundedProgress >= 100) return 'bg-[var(--color-success)]';
    if (roundedProgress >= 75)  return 'bg-[var(--color-primary)]';
    if (roundedProgress >= 50)  return 'bg-[var(--color-warning)]';
    return 'bg-[var(--color-text-muted)]';
  };

  const getLabelColor = () => {
    if (roundedProgress >= 100) return 'text-[var(--color-success)]';
    if (roundedProgress >= 75)  return 'text-[var(--color-primary)]';
    if (roundedProgress >= 50)  return 'text-[var(--color-warning)]';
    return 'text-[var(--color-text-muted)]';
  };

  const labelSize = { sm: 'text-xs', md: 'text-sm font-display text-base', lg: 'text-lg font-display' }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`flex-1 bg-[var(--color-border-strong)] rounded-none overflow-hidden ${heightClass}`}
        role="progressbar"
        aria-valuenow={roundedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${roundedProgress}% progress`}
      >
        <div
          className={`${heightClass} ${getProgressColor()} transition-all duration-500 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <span className={`${labelSize} font-display ${getLabelColor()} min-w-[3ch] text-right`}>
          {roundedProgress}%
        </span>
      )}
    </div>
  );
};
