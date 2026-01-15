import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Settings = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
        </button>
        <h1 className="text-xl font-bold text-[var(--color-text)]">Settings</h1>
      </div>
      
      <div className="flex items-center justify-center h-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
        <p className="text-[var(--color-text-muted)]">Settings page coming soon...</p>
      </div>
    </div>
  );
};
