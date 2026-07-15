import type { ReactNode } from 'react';

/**
 * LoadedBarButton — the primary CTA. A clean solid accent button.
 *
 *   <LoadedBarButton onClick={save}><Plus size={17} /> Log a lift</LoadedBarButton>
 */
interface LoadedBarButtonProps {
  children: ReactNode;
  onClick?: () => void;
  /** pill (default, full-width CTA) or a compact rounded variant for the quick-action row */
  variant?: 'pill' | 'compact';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}

export function LoadedBarButton({ children, onClick, variant = 'pill', type = 'button', disabled = false, className = '' }: LoadedBarButtonProps) {
  const radius = variant === 'pill' ? 9999 : 14;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`relative flex h-[54px] w-full items-center justify-center transition-transform active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${className}`}
      style={{ background: 'var(--color-primary)', borderRadius: radius }}
    >
      <span
        className="relative flex items-center gap-2 text-[17px] font-bold"
        style={{ color: 'var(--color-text)', letterSpacing: '-0.2px' }}
      >
        {children}
      </span>
    </button>
  );
}
