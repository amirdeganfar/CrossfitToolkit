import type { ReactNode } from 'react';

/**
 * LoadedBarButton — the signature CTA. A knurled yellow grip with dark
 * collar caps: the button reads as a mini loaded barbell.
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
  const cap = variant === 'pill' ? 14 : 11;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`relative flex h-[54px] w-full items-center justify-center overflow-hidden transition-transform active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${className}`}
      style={{ background: 'var(--color-primary)', borderRadius: radius }}
    >
      {/* knurl */}
      <span
        className="absolute inset-0"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.13) 0 1px, transparent 1px 6px)' }}
      />
      {/* collar caps */}
      <span className="absolute inset-y-0 left-0" style={{ width: cap, background: 'var(--color-bg)' }} />
      <span className="absolute inset-y-0 right-0" style={{ width: cap, background: 'var(--color-bg)' }} />
      <span
        className="relative flex items-center gap-2 text-[17px] font-bold"
        style={{ color: 'var(--color-bg)', letterSpacing: '-0.2px' }}
      >
        {children}
      </span>
    </button>
  );
}
