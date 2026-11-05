import { useState } from 'react';
import { MoreVertical, Trophy, Calendar } from 'lucide-react';
import type { GoalWithProgress } from '../../types/goal';
import { TrendIndicator } from './TrendIndicator';
import { Barbell } from '../Barbell';
import { parseLocalDate, daysBetween } from '../../utils/date';

/** Goal dates are local `YYYY-MM-DD` (createdAt may be a full ISO timestamp). */
const toDisplayDate = (s: string) =>
  (/^d{4}-d{2}-d{2}$/.test(s) ? parseLocalDate(s) : new Date(s)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

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

    const diffDays = daysBetween(goal.projectedDate, goal.targetDate);

    if (diffDays > 0) {
      return `${diffDays} days ahead`;
    }
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days behind`;
    }
    return 'On schedule';
  };

  return (
    <div
      className={`card ${isAchieved ? 'opacity-70' : ''} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Main content - always visible */}
      <div
        className=""
        onClick={onClick ? () => onClick(goal) : handleToggleExpand}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onClick(goal);
                }
              }
            : undefined
        }
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
            // Clicks inside the menu (button, backdrop, items) must not reach the card.
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={handleMenuClick}
                className="w-9 h-9 -mr-2 -mt-1 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-elevated)] transition-colors"
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
                    aria-hidden="true"
                  />
                  <div role="menu" className="absolute right-0 z-50 mt-1 w-44 rounded-md bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)] shadow-xl overflow-hidden">
                    {onEdit && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleAction(() => onEdit(goal))}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    {onAchieve && !isAchieved && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleAction(() => onAchieve(goal))}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-[var(--color-success)] hover:bg-[var(--color-surface)] transition-colors"
                      >
                        Mark achieved
                      </button>
                    )}
                    {onCancel && !isAchieved && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleAction(() => onCancel(goal))}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-[var(--color-warning)] hover:bg-[var(--color-surface)] transition-colors"
                      >
                        Cancel goal
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleAction(() => onDelete(goal))}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-surface)] transition-colors"
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
        <div className="mb-2">
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-[var(--color-text-muted)] num">{goal.currentResult || '—'}</span>
              <span className="text-[var(--color-text-dim)]">→</span>
              <span className="font-display text-sm text-[var(--color-text)] num">{goal.targetResult}</span>
            </div>
            <span className={`stat text-[28px] ${goal.progress >= 100 ? 'text-[var(--color-success)]' : 'text-[var(--color-text)]'}`}>
              <span className="stat-value">{Math.round(goal.progress)}</span><span className="stat-unit">%</span>
            </span>
          </div>
          <Barbell current={goal.progress} goal={100} />
        </div>

        {/* Bottom row: days remaining + trend */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 t-caption num">
            <Calendar size={10} />
            <span>{isAchieved && goal.achievedAt ? `Achieved ${goal.achievedAt}` : formatDaysRemaining()}</span>
          </div>
          {!isAchieved && (
            <div className="flex items-center gap-2">
              <TrendIndicator trend={goal.trend} size="sm" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand();
                }}
                className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors px-2 min-h-[32px]"
                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
              >
                {isExpanded ? 'Less' : 'More'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded details */}
      <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
        <div>
          <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
            {goal.projectedDate && (
              <div className="mb-3">
                <div className="t-caption mb-0.5">Projected</div>
                <div className="font-display text-sm text-[var(--color-text)] num">
                  {toDisplayDate(goal.projectedDate)}
                </div>
                <div className="t-caption num">
                  {formatProjectedDate()}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="t-caption mb-0.5">Target date</div>
                <div className="font-display text-sm text-[var(--color-text)] num">
                  {toDisplayDate(goal.targetDate)}
                </div>
              </div>
              <div>
                <div className="t-caption mb-0.5">Created</div>
                <div className="font-display text-sm text-[var(--color-text)] num">
                  {toDisplayDate(goal.createdAt)}
                </div>
              </div>
              {goal.variant && (
                <div>
                  <div className="t-caption mb-0.5">Variant</div>
                  <div className="font-display text-sm text-[var(--color-text)] num">{goal.variant}</div>
                </div>
              )}
              {goal.reps && (
                <div>
                  <div className="t-caption mb-0.5">Reps</div>
                  <div className="font-display text-sm text-[var(--color-text)] num">
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
                    className="flex-1 py-2.5 px-3 bg-[var(--color-success)] hover:opacity-90 rounded-sm text-[var(--color-bg)] text-sm font-semibold transition-all"
                  >
                    Mark achieved
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(goal)}
                    className="flex-1 py-2.5 px-3 bg-transparent hover:bg-[var(--color-surface-elevated)] rounded-sm text-[var(--color-text)] text-sm font-semibold transition-all border border-[var(--color-border-strong)]"
                  >
                    Edit
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
