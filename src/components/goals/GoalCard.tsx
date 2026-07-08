import { useState } from 'react';
import { ChevronDown, ChevronRight, MoreVertical, Target, Trophy, Calendar } from 'lucide-react';
import type { GoalWithProgress } from '../../types/goal';
import { GoalProgress } from './GoalProgress';
import { TrendIndicator } from './TrendIndicator';

interface GoalCardProps {
  goal: GoalWithProgress;
  onEdit?: (goal: GoalWithProgress) => void;
  onAchieve?: (goal: GoalWithProgress) => void;
  onCancel?: (goal: GoalWithProgress) => void;
  onDelete?: (goal: GoalWithProgress) => void;
  onClick?: (goal: GoalWithProgress) => void;
  isAchieved?: boolean;
}

export const GoalCard = ({
  goal,
  onEdit,
  onAchieve,
  onCancel,
  onDelete,
  onClick,
  isAchieved = false,
}: GoalCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleAction = (action: () => void) => {
    action();
    setShowMenu(false);
  };

  const formatDaysRemaining = () => {
    if (goal.daysRemaining < 0) {
      return `${Math.abs(goal.daysRemaining)} days overdue`;
    }
    if (goal.daysRemaining === 0) {
      return 'Due today';
    }
    if (goal.daysRemaining === 1) {
      return '1 day left';
    }
    return `${goal.daysRemaining} days left`;
  };

  const formatProjectedDate = () => {
    if (!goal.projectedDate) return null;

    // Parse as local midnight to avoid UTC offset shifting the date by one day
    const projected = new Date(goal.projectedDate + 'T00:00:00');
    const target = new Date(goal.targetDate + 'T00:00:00');
    const diffDays = Math.round(
      (target.getTime() - projected.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 0) {
      return `${diffDays} days ahead of schedule`;
    }
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days behind schedule`;
    }
    return 'On schedule';
  };

  return (
    <div
      className={`cat-bar bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden transition-colors pl-0 ${
        onClick ? 'cursor-pointer hover:border-[var(--color-border-strong)]' : ''
      } ${isAchieved ? 'opacity-70' : ''}`}
      style={{ borderLeft: isAchieved ? '3px solid var(--color-success)' : '3px solid var(--color-primary)' }}
    >
      {/* Main content - always visible */}
      <div
        className="p-4"
        onClick={onClick ? () => onClick(goal) : handleToggleExpand}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {isAchieved ? (
              <Trophy size={16} className="text-[var(--color-warning)] flex-shrink-0" />
            ) : (
              <Target size={16} className="text-[var(--color-primary)] flex-shrink-0" />
            )}
            <h3 className="font-display text-lg text-[var(--color-text)] truncate">
              {goal.itemName}
            </h3>
          </div>

          {/* Menu button */}
          {(onEdit || onAchieve || onCancel || onDelete) && (
            <div className="relative">
              <button
                onClick={handleMenuClick}
                className="p-2 -mr-1 hover:bg-[var(--color-surface-elevated)] rounded-lg transition-colors"
                aria-label="Goal actions"
                aria-haspopup="menu"
                aria-expanded={showMenu}
              >
                <MoreVertical size={18} className="text-[var(--color-text-muted)]" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 z-50 mt-1 w-40 bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)] rounded-lg shadow-xl overflow-hidden">
                    {onEdit && (
                      <button
                        onClick={() => handleAction(() => onEdit(goal))}
                        className="w-full px-4 py-3 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    {onAchieve && !isAchieved && (
                      <button
                        onClick={() => handleAction(() => onAchieve(goal))}
                        className="w-full px-4 py-3 text-left text-sm text-green-500 hover:bg-[var(--color-surface)] transition-colors"
                      >
                        Mark Achieved
                      </button>
                    )}
                    {onCancel && !isAchieved && (
                      <button
                        onClick={() => handleAction(() => onCancel(goal))}
                        className="w-full px-4 py-3 text-left text-sm text-yellow-500 hover:bg-[var(--color-surface)] transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => handleAction(() => onDelete(goal))}
                        className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-[var(--color-surface)] transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Progress display */}
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">{goal.currentResult || '—'}</span>
              <span className="text-[var(--color-text-dim)]">→</span>
              <span className="font-display text-base text-[var(--color-text)]">{goal.targetResult}</span>
            </div>
            <span className={`font-display text-2xl ${goal.progress >= 100 ? 'text-[var(--color-success)]' : goal.progress >= 75 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
              {Math.round(goal.progress)}%
            </span>
          </div>
          <GoalProgress progress={goal.progress} size="md" showLabel={false} />
        </div>

        {/* Bottom row: days remaining + trend */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
            <Calendar size={12} />
            <span>{isAchieved && goal.achievedAt ? `Achieved ${goal.achievedAt}` : formatDaysRemaining()}</span>
          </div>
          {!isAchieved && (
            <div className="flex items-center gap-2">
              <TrendIndicator trend={goal.trend} size="sm" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand();
                }}
                className="p-2 -mr-1 hover:bg-[var(--color-surface-elevated)] rounded-lg transition-colors"
                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
              >
                {isExpanded ? (
                  <ChevronDown size={16} className="text-[var(--color-text-muted)]" />
                ) : (
                  <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded details */}
      <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
        <div>
          <div className="px-4 pb-4 pt-0 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
            {/* Projected date */}
            {goal.projectedDate && (
              <div className="pt-3 mb-3">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">
                  Projected Achievement
                </div>
                <div className="text-sm text-[var(--color-text)]">
                  {new Date(goal.projectedDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {formatProjectedDate()}
                </div>
              </div>
            )}

            {/* Goal details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-0.5">
                  Target Date
                </div>
                <div className="text-[var(--color-text)]">
                  {new Date(goal.targetDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-0.5">
                  Created
                </div>
                <div className="text-[var(--color-text)]">
                  {new Date(goal.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
              {goal.variant && (
                <div>
                  <div className="text-xs text-[var(--color-text-muted)] mb-0.5">
                    Variant
                  </div>
                  <div className="text-[var(--color-text)]">{goal.variant}</div>
                </div>
              )}
              {goal.reps && (
                <div>
                  <div className="text-xs text-[var(--color-text-muted)] mb-0.5">
                    Reps
                  </div>
                  <div className="text-[var(--color-text)]">
                    {goal.reps === 1 ? '1RM' : `${goal.reps}RM`}
                  </div>
                </div>
              )}
            </div>

            {/* Quick actions */}
            {!isAchieved && (onAchieve || onEdit) && (
              <div className="flex gap-2 mt-4">
                {onAchieve && goal.progress >= 100 && (
                  <button
                    onClick={() => onAchieve(goal)}
                    className="flex-1 py-2.5 px-3 bg-[var(--color-success)] hover:opacity-90 active:scale-[0.98] text-white rounded-sm font-display text-sm tracking-widest transition-all"
                  >
                    ACHIEVED
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(goal)}
                    className="flex-1 py-2.5 px-3 bg-[var(--color-surface-elevated)] hover:bg-[var(--color-border-strong)] active:scale-[0.98] text-[var(--color-text)] rounded-sm font-display text-sm tracking-widest transition-all border border-[var(--color-border-strong)]"
                  >
                    EDIT
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
