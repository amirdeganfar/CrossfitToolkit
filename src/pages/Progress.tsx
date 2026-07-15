import { useState, useEffect } from 'react';
import { Plus, ChevronDown, Trophy, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    if (isStoreInitialized && !goalsIsInitialized && catalogItems.length > 0) {
      goalsInitialize(catalogItems, settings.weightUnit);
    }
  }, [isStoreInitialized, goalsIsInitialized, catalogItems, settings.weightUnit, goalsInitialize]);

  useEffect(() => {
    if (isStoreInitialized && !checkInIsInitialized) {
      checkInInitialize();
    }
  }, [isStoreInitialized, checkInIsInitialized, checkInInitialize]);

  const handleSaveGoal = async (
    input: CreateGoalInput | { id: string; updates: UpdateGoalInput }
  ) => {
    if ('id' in input) {
      await goalsUpdateGoal(input.id, input.updates, catalogItems, settings.weightUnit);
    } else {
      await goalsAddGoal(input, catalogItems, settings.weightUnit);
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
    switch (type) {
      case 'achieve':
        await goalsAchieveGoal(goal.id, catalogItems, settings.weightUnit);
        break;
      case 'cancel':
        await goalsCancelGoal(goal.id, catalogItems, settings.weightUnit);
        break;
      case 'delete':
        await goalsDeleteGoal(goal.id, catalogItems, settings.weightUnit);
        break;
    }
    setConfirmAction(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGoal(null);
  };

  if (!isStoreInitialized || goalsIsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display-black text-[30px] text-[var(--color-text)] leading-[1.05]">Progress</h1>

      {/* Recovery trends — review surface for daily check-in history */}
      <RecoveryTrends />

      {/* Active goals */}
      <section>
        <div className="flex items-center gap-2 mb-3 pb-1 border-b border-[var(--color-border)]">
          <span className="label-eyebrow">Active goals</span>
          <span className="text-xs text-[var(--color-text-dim)]">({activeGoals.length})</span>
        </div>

        {activeGoals.length === 0 ? (
          <div className="py-8 text-center border-l-2 border-[var(--color-primary)] pl-4">
            <p className="font-display text-xl text-[var(--color-text)] mb-1">No active goals</p>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">Set a goal to track your progress</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-[var(--color-primary)] text-[var(--color-text)] hover:opacity-90 active:scale-95 font-semibold text-sm rounded-full transition-all"
            >
              Set first goal
            </button>
          </div>
        ) : (
          <div className="space-y-4">
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
            className="flex items-center gap-2 mb-3 w-full text-left pb-1 border-b border-[var(--color-border)]"
          >
            <Trophy size={14} className="text-[var(--color-warning)]" />
            <span className="label-eyebrow">Achieved</span>
            <span className="text-xs text-[var(--color-text-dim)]">({achievedGoals.length})</span>
            <ChevronDown
              size={14}
              className={`ml-auto text-[var(--color-text-muted)] transition-transform ${showAchieved ? 'rotate-180' : ''}`}
            />
          </button>

          <div className={`accordion-content ${showAchieved ? 'expanded' : ''}`}>
            <div className="space-y-4">
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
