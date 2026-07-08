import { useState } from 'react';
import { MoreVertical, Trophy, Calendar } from 'lucide-react';
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
      return `${Math.abs(goal.daysRemaining)} DAYS OVERDUE`;
    }
    if (goal.daysRemaining === 0) {
      return 'DUE TODAY';
    }
    if (goal.daysRemaining === 1) {
      return '1 DAY LEFT';
    }
    return `${goal.daysRemaining} DAYS LEFT`;
  };

  const formatProjectedDate = () => {
    if (!goal.projectedDate) return null;

    const projected = new Date(goal.projectedDate + 'T00:00:00');
    const target = new Date(goal.targetDate + 'T00:00:00');
    const diffDays = Math.round(
      (target.getTime() - projected.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 0) {
      return `${diffDays} DAYS AHEAD`;
    }
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} DAYS BEHIND`;
    }
    return 'ON SCHEDULE';
  };

  return (
    <div
      className={`border-l-2 ${isAchieved ? 'border-[var(--color-success)] opacity-70' : 'border-[var(--color-primary)]'} pl-3 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Main content - always visible */}
      <div
        className="py-2"
        onClick={onClick ? () => onClick(goal) : handleToggleExpand}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {isAchieved && (
              <Trophy size={14} className="text-[var(--color-warning)] flex-shrink-0" />
            )}
            <h3 className="font-display text-base text-[var(--color-text)] truncate">
              {goal.itemName}
            </h3>
          </div>

          {/* Menu button */}
          {(onEdit || onAchieve || onCancel || onDelete) && (
            <div className="relative">
              <button
                onClick={handleMenuClick}
                className="p-1.5 -mr-1 hover:bg-[var(--color-surface-elevated)] transition-colors"
                aria-label="Goal actions"
                aria-haspopup="menu"
                aria-expanded={showMenu}
              >
                <MoreVertical size={16} className="text-[var(--color-text-muted)]" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 z-50 mt-1 w-40 bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)] shadow-xl overflow-hidden">
                    {onEdit && (
                      <button
                        onClick={() => handleAction(() => onEdit(goal))}
                        className="w-full px-4 py-3 text-left font-display text-xs tracking-widest text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
                      >
                        EDIT
                      </button>
                    )}
                    {onAchieve && !isAchieved && (
                      <button
                        onClick={() => handleAction(() => onAchieve(goal))}
                        className="w-full px-4 py-3 text-left font-display text-xs tracking-widest text-[var(--color-success)] hover:bg-[var(--color-surface)] transition-colors"
                      >
                        MARK ACHIEVED
                      </button>
                    )}
                    {onCancel && !isAchieved && (
                      <button
                        onClick={() => handleAction(() => onCancel(goal))}
                        className="w-full px-4 py-3 text-left font-display text-xs tracking-widest text-[var(--color-warning)] hover:bg-[var(--color-surface)] transition-colors"
                      >
                        CANCEL
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => handleAction(() => onDelete(goal))}
                        className="w-full px-4 py-3 text-left font-display text-xs tracking-widest text-[var(--color-danger)] hover:bg-[var(--color-surface)] transition-colors"
                      >
                        DELETE
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Progress display */}
        <div className="mb-2">
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">{goal.currentResult || '—'}</span>
              <span className="text-[var(--color-text-dim)]">→</span>
              <span className="font-display text-sm text-[var(--color-text)]">{goal.targetResult}</span>
            </div>
            <span className={`font-display text-3xl ${goal.progress >= 100 ? 'text-[var(--color-success)]' : 'text-[var(--color-primary)]'}`}>
              {Math.round(goal.progress)}%
            </span>
          </div>
          <GoalProgress progress={goal.progress} size="md" showLabel={false} />
        </div>

        {/* Bottom row: days remaining + trend */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-display text-[10px] tracking-widest text-[var(--color-text-muted)]">
            <Calendar size={10} />
            <span>{isAchieved && goal.achievedAt ? `ACHIEVED ${goal.achievedAt}` : formatDaysRemaining()}</span>
          </div>
          {!isAchieved && (
            <div className="flex items-center gap-2">
              <TrendIndicator trend={goal.trend} size="sm" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand();
                }}
                className="font-display text-[9px] tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors px-1"
                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
              >
                {isExpanded ? '▲ LESS' : '▼ MORE'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded details */}
      <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
        <div>
          <div className="pt-2 pb-3 border-t border-[var(--color-border)]">
            {goal.projectedDate && (
              <div className="mb-3">
                <div className="font-display text-[10px] tracking-widest text-[var(--color-text-muted)] mb-0.5">PROJECTED ACHIEVEMENT</div>
                <div className="font-display text-sm text-[var(--color-text)]">
                  {new Date(goal.projectedDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                <div className="font-display text-xs text-[var(--color-text-muted)]">
                  {formatProjectedDate()}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-display text-[10px] tracking-widest text-[var(--color-text-muted)] mb-0.5">TARGET DATE</div>
                <div className="font-display text-sm text-[var(--color-text)]">
                  {new Date(goal.targetDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <div>
                <div className="font-display text-[10px] tracking-widest text-[var(--color-text-muted)] mb-0.5">CREATED</div>
                <div className="font-display text-sm text-[var(--color-text)]">
                  {new Date(goal.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
              {goal.variant && (
                <div>
                  <div className="font-display text-[10px] tracking-widest text-[var(--color-text-muted)] mb-0.5">VARIANT</div>
                  <div className="font-display text-sm text-[var(--color-text)]">{goal.variant}</div>
                </div>
              )}
              {goal.reps && (
                <div>
                  <div className="font-display text-[10px] tracking-widest text-[var(--color-text-muted)] mb-0.5">REPS</div>
                  <div className="font-display text-sm text-[var(--color-text)]">
                    {goal.reps === 1 ? '1RM' : `${goal.reps}RM`}
                  </div>
                </div>
              )}
            </div>

            {/* Quick actions */}
            {!isAchieved && (onAchieve || onEdit) && (
              <div className="flex gap-2 mt-3">
                {onAchieve && goal.progress >= 100 && (
                  <button
                    onClick={() => onAchieve(goal)}
                    className="flex-1 py-2.5 px-3 bg-[var(--color-success)] hover:opacity-90 active:scale-[0.98] text-[#0B130B] font-display text-sm tracking-widest transition-all"
                  >
                    ACHIEVED
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(goal)}
                    className="flex-1 py-2.5 px-3 bg-transparent hover:bg-[var(--color-surface-elevated)] active:scale-[0.98] text-[var(--color-text)] font-display text-sm tracking-widest transition-all border border-[var(--color-border-strong)]"
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
