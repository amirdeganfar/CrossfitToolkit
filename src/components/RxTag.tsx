import type { Variant } from '../types/catalog';

/**
 * RxTag — stamped effort tag for a logged result.
 *   <RxTag variant="Rx" /> <RxTag variant="Rx+" /> <RxTag variant="Scaled" />
 * Renders nothing when the variant is null/undefined.
 */
interface RxTagProps {
  variant?: Variant;
}

export function RxTag({ variant }: RxTagProps) {
  if (!variant) return null;
  const base = 'inline-block text-[9px] font-extrabold tracking-[0.06em] rounded-[5px] px-[5px] py-[1px]';
  if (variant === 'Rx+') {
    return <span className={base} style={{ color: 'var(--color-bg)', background: 'var(--color-primary)' }}>RX+</span>;
  }
  if (variant === 'Scaled') {
    return <span className={base} style={{ color: 'var(--color-text-muted)', border: '1.5px dashed rgba(255,255,255,0.25)' }}>SCALED</span>;
  }
  return <span className={base} style={{ color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)' }}>RX</span>;
}
