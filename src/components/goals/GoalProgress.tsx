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

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  const textClass = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size];

  // Progress bar color based on completion
  const getProgressColor = () => {
    if (roundedProgress >= 100) return 'bg-green-500';
    if (roundedProgress >= 75) return 'bg-[var(--color-primary)]';
    if (roundedProgress >= 50) return 'bg-yellow-500';
    return 'bg-[var(--color-text-muted)]';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex-1 bg-[var(--color-surface-elevated)] rounded-full overflow-hidden ${heightClass}`}
        role="progressbar"
        aria-valuenow={roundedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${roundedProgress}% progress`}
      >
        <div
          className={`${heightClass} ${getProgressColor()} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <span className={`${textClass} font-medium text-[var(--color-text-muted)] min-w-[3ch] text-right`}>
          {roundedProgress}%
        </span>
      )}
    </div>
  );
};
