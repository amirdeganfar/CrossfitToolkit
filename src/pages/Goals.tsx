import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, ChevronDown, Trophy, Loader2 } from 'lucide-react';
import { useCatalogStore } from '../stores/catalogStore';
import { useGoalsStore, useSortedActiveGoals, useSortedAchievedGoals } from '../stores/goalsStore';
import { GoalCard, GoalModal } from '../components/goals';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { GoalWithProgress, CreateGoalInput, UpdateGoalInput } from '../types/goal';

export const Goals = () => {
  const catalogItems = useCatalogStore((s) => s.catalogItems);
  const settings = useCatalogStore((s) => s.settings);
  const isStoreInitialized = useCatalogStore((s) => s.isInitialized);

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

  const handleAchieveGoal = (goal: GoalWithProgress) => {
    setConfirmAction({ type: 'achieve', goal });
  };

  const handleCancelGoal = (goal: GoalWithProgress) => {
    setConfirmAction({ type: 'cancel', goal });
  };

  const handleDeleteGoal = (goal: GoalWithProgress) => {
    setConfirmAction({ type: 'delete', goal });
  };

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="p-2 -ml-1 hover:bg-[var(--color-surface-elevated)] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--color-text)]" />
          </Link>
          <h1 className="font-display text-2xl text-[var(--color-text)] tracking-[0.1em]">MISSIONS</h1>
        </div>
      </header>

      <main className="p-4 pb-24 space-y-6">
        {/* Active Goals Section */}
        <section>
          <div className="flex items-center gap-2 mb-3 pb-1 border-b border-[var(--color-border)]">
            <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">ACTIVE</span>
            <span className="font-display text-xs text-[var(--color-text-dim)]">({activeGoals.length})</span>
          </div>

          {activeGoals.length === 0 ? (
            <div className="py-12 text-center border-l-2 border-[var(--color-primary)] pl-4">
              <p className="font-display text-2xl text-[var(--color-text)] mb-2 tracking-[0.1em]">NO ACTIVE<br/>MISSIONS</p>
              <p className="text-xs text-[var(--color-text-muted)] font-display tracking-widest mb-6">SET A GOAL TO TRACK YOUR PROGRESS</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-[var(--color-primary)] text-[#0B130B] hover:opacity-90 active:scale-95 font-display tracking-widest text-sm transition-all shadow-[0_0_24px_rgba(212,255,0,0.3)]"
              >
                SET FIRST GOAL
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

        {/* Achieved Goals Section */}
        {achievedGoals.length > 0 && (
          <section>
            <button
              onClick={() => setShowAchieved(!showAchieved)}
              className="flex items-center gap-2 mb-3 w-full text-left pb-1 border-b border-[var(--color-border)]"
            >
              <Trophy size={14} className="text-[var(--color-warning)]" />
              <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">ACHIEVED</span>
              <span className="font-display text-xs text-[var(--color-text-dim)]">({achievedGoals.length})</span>
              <ChevronDown
                size={14}
                className={`ml-auto text-[var(--color-text-muted)] transition-transform ${showAchieved ? 'rotate-180' : ''}`}
              />
            </button>

            <div className={`accordion-content ${showAchieved ? 'expanded' : ''}`}>
              <div className="space-y-4">
                {achievedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    isAchieved
                    onDelete={handleDeleteGoal}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 w-14 h-14 bg-[var(--color-primary)] hover:opacity-90 active:scale-90 text-[#0B130B] flex items-center justify-center transition-all shadow-[0_0_24px_rgba(212,255,0,0.3)]"
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
