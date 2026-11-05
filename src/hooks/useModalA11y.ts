import { useEffect, useRef, useState, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open modals, innermost last. */
const modalStack: object[] = [];

/** Body scroll lock shared by all open modals: locked while any is open. */
let scrollLocks = 0;
let savedOverflow = '';
const lockScroll = () => {
  if (scrollLocks++ === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
};
const unlockScroll = () => {
  if (--scrollLocks === 0) document.body.style.overflow = savedOverflow;
};

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

  // Capture the opener during render — before children mount and any
  // `autoFocus` field moves focus into the dialog.
  const [opener, setOpener] = useState<Element | null>(null);
  const [wasEnabled, setWasEnabled] = useState(false);
  if (enabled !== wasEnabled) {
    setWasEnabled(enabled);
    setOpener(enabled ? document.activeElement : null);
  }

  // Focus restore is deferred a microtask so StrictMode's immediate
  // unmount/remount of effects cancels it instead of stealing focus.
  const pendingRestore = useRef<{ cancelled: boolean } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (pendingRestore.current) pendingRestore.current.cancelled = true;
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
    lockScroll();

    // Respect an autoFocus field already inside the dialog.
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      modalStack.splice(modalStack.indexOf(token), 1);
      unlockScroll();
      const restore = { cancelled: false };
      pendingRestore.current = restore;
      queueMicrotask(() => {
        if (restore.cancelled) return;
        if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
      });
    };
  }, [ref, enabled, opener]);
};
