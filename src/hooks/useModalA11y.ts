import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open modals, innermost last. */
const modalStack: object[] = [];

/**
 * Shared modal accessibility: Escape closes, body scroll lock, initial focus
 * into the dialog, simple Tab focus trap, and focus restore on close.
 * Attach `ref` to the element with role="dialog" (give it tabIndex={-1}).
 */
export const useModalA11y = (
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled = true
) => {
  // Keep latest onClose without re-running the effect (which would steal focus).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!enabled) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const token = {};
    modalStack.push(token);

    const onKeyDown = (e: KeyboardEvent) => {
      // Only the top-most open modal handles keys (nested dialogs).
      if (modalStack[modalStack.length - 1] !== token) return;
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const focusable = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.closest('[inert]')
      );
      if (focusable.length === 0) {
        e.preventDefault();
        ref.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!ref.current.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    ref.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      modalStack.splice(modalStack.indexOf(token), 1);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [ref, enabled]);
};
