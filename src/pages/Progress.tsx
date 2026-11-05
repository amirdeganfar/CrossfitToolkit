import { useState, useEffect } from 'react';
import { Plus, ChevronDown, Trophy, Target } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { Skeleton, SkeletonRows } from '../components/Skeleton';
import { haptics } from '../utils/haptics';
import { useCatalogStore } from '../stores/catalogStore';
import { useCheckInStore } from '../stores/checkInStore';
import { useGoalsStore, useSortedActiveGoals, useSortedAchievedGoals } from '../stores/goalsStore';
import { GoalCard, GoalModal } from '../components/goals';
import { RecoveryTrends } from '../components/recovery';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { GoalWithProgress, CreateGoalInput, UpdateGoalInput } from '../types/goal';

/**
 * Progress — consolidated dashboard for the athlete's record:
 * recovery trends (the review surface for daily check-in data) + goals.
 */
export const Progress = () => {
  const catalogItems = useCatalogStore((s) => s.catalogItems);
  const settings = useCatalogStore((s) => s.settings);
  const isStoreInitialized = useCatalogStore((s) => s.isInitialized);

  const checkInIsInitialized = useCheckInStore((s) => s.isInitialized);
  const checkInInitialize = useCheckInStore((s) => s.initialize);

  const goalsIsInitialized = useGoalsStore((s) => s.isInitialized);
  const goalsIsLoading = useGoalsStore((s) => s.isLoading);
  const goalsInitialize = useGoalsStore((s) => s.initialize);
  const goalsAddGoal = useGoalsStore((s) => s.addGoal);
  const goalsUpdateGoal = useGoalsStore((s) => s.updateGoal);
  const goalsAchieveGoal = useGoalsStore((s) => s.achieveGoal);
  const goalsCancelGoal = useGoalsStore((s) => s.cancelGoal);
  const goalsDeleteGoal = useGoalsStore((s) => s.deleteGoal);
  const activeGoals = useSortedActiveGoals();
  const achievedGoals = useSortedAchievedGoals();

  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | null>(null);
  const [showAchieved, setShowAchieved] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'achieve' | 'cancel' | 'delete';
    goal: GoalWithProgress;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (isStoreInitialized && !goalsIsInitialized && catalogItems.length > 0) {
      goalsInitialize(catalogItems);
    }
  }, [isStoreInitialized, goalsIsInitialized, catalogItems, goalsInitialize]);

  useEffect(() => {
    if (isStoreInitialized && !checkInIsInitialized) {
      checkInInitialize();
    }
  }, [isStoreInitialized, checkInIsInitialized, checkInInitialize]);

  const handleSaveGoal = async (
    input: CreateGoalInput | { id: string; updates: UpdateGoalInput }
  ) => {
    if ('id' in input) {
      await goalsUpdateGoal(input.id, input.updates, catalogItems);
    } else {
      await goalsAddGoal(input, catalogItems);
    }
  };

  const handleEditGoal = (goal: GoalWithProgress) => {
    setEditingGoal(goal);
    setShowModal(true);
  };

  const handleAchieveGoal = (goal: GoalWithProgress) => setConfirmAction({ type: 'achieve', goal });
  const handleCancelGoal = (goal: GoalWithProgress) => setConfirmAction({ type: 'cancel', goal });
  const handleDeleteGoal = (goal: GoalWithProgress) => setConfirmAction({ type: 'delete', goal });

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, goal } = confirmAction;
    setActionError(null);
    try {
      switch (type) {
        case 'achieve':
          await goalsAchieveGoal(goal.id, catalogItems);
          haptics.goal();
          break;
        case 'cancel':
          await goalsCancelGoal(goal.id, catalogItems);
          break;
        case 'delete':
          await goalsDeleteGoal(goal.id, catalogItems);
          break;
      }
    } catch (error) {
      console.error('[Progress] Goal action failed:', error);
      setActionError('Something went wrong updating the goal. Please try again.');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGoal(null);
  };

  // Goals initialize after the catalog loads; keep the skeleton until then so
  // the empty state doesn't flash.
  if (!isStoreInitialized || goalsIsLoading || (!goalsIsInitialized && catalogItems.length > 0)) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <section className="space-y-3">
          <Skeleton className="h-5 w-28" />
          <SkeletonRows count={2} withBadge={false} label="Loading goals" />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="t-title">Progress</h1>

      {/* Recovery trends — review surface for daily check-in history */}
      <RecoveryTrends />

      {/* Active goals */}
      <section>
        <h2 className="t-section mb-3">
          Active goals <span className="t-caption num">({activeGoals.length})</span>
        </h2>

        {actionError && (
          <div className="mb-3 px-1 py-2 border-l-2 border-[var(--color-danger)]" role="alert">
            <p className="text-[13px] font-medium text-[var(--color-danger)]">{actionError}</p>
          </div>
        )}

        {activeGoals.length === 0 ? (
          <EmptyState
            icon={Target}
            message="No active goals. Set one to track progress toward it."
            action={{ label: 'Set a goal', onClick: () => setShowModal(true) }}
          />
        ) : (
          <div className="space-y-3">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={handleEditGoal}
                onAchieve={handleAchieveGoal}
                onCancel={handleCancelGoal}
                onDelete={handleDeleteGoal}
              />
            ))}
          </div>
        )}
      </section>

      {/* Achieved goals */}
      {achievedGoals.length > 0 && (
        <section>
          <button
            onClick={() => setShowAchieved(!showAchieved)}
            className="flex items-center gap-2 mb-3 w-full text-left min-h-[44px]"
            aria-expanded={showAchieved}
          >
            <Trophy size={16} className="text-[var(--color-warning)]" />
            <span className="t-section">Achieved</span>
            <span className="t-caption num">({achievedGoals.length})</span>
            <ChevronDown
              size={14}
              className={`ml-auto text-[var(--color-text-muted)] transition-transform ${showAchieved ? 'rotate-180' : ''}`}
            />
          </button>

          <div className={`accordion-content ${showAchieved ? 'expanded' : ''}`}>
            <div className="space-y-3">
              {achievedGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} isAchieved onDelete={handleDeleteGoal} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Floating add-goal action — sits above the always-visible bottom nav */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-[var(--color-primary)] hover:opacity-90 active:scale-90 text-[var(--color-text)] flex items-center justify-center transition-all shadow-[0_0_24px_rgba(232,50,28,0.3)]"
        aria-label="Add new goal"
      >
        <Plus size={24} />
      </button>

      {/* Goal Modal */}
      {showModal && (
        <GoalModal
          items={catalogItems}
          editGoal={editingGoal}
          weightUnit={settings.weightUnit}
          onSave={handleSaveGoal}
          onClose={handleCloseModal}
        />
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          title={
            confirmAction.type === 'achieve'
              ? 'Mark as Achieved?'
              : confirmAction.type === 'cancel'
                ? 'Cancel Goal?'
                : 'Delete Goal?'
          }
          message={
            confirmAction.type === 'achieve'
              ? `Congratulations! Mark "${confirmAction.goal.itemName}" goal as achieved?`
              : confirmAction.type === 'cancel'
                ? `Cancel your "${confirmAction.goal.itemName}" goal? You can set a new goal anytime.`
                : `Delete the "${confirmAction.goal.itemName}" goal? This cannot be undone.`
          }
          confirmLabel={
            confirmAction.type === 'achieve'
              ? 'Mark Achieved'
              : confirmAction.type === 'cancel'
                ? 'Cancel Goal'
                : 'Delete'
          }
          isDestructive={confirmAction.type === 'delete'}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
};
