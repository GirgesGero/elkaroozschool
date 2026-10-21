import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab/Shift+Tab focus within a modal/drawer container, dismisses on Escape,
 * and restores focus to the triggering element when closed or unmounted.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose?: () => void,
  targetRef?: React.RefObject<T>
): React.RefObject<T> {
  const internalRef = useRef<T>(null);
  const containerRef = (targetRef || internalRef) as React.RefObject<T>;
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== 'undefined') {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
    }

    // Set initial focus inside the trap container
    const focusTimer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const autoFocusEl = container.querySelector<HTMLElement>('[autofocus]');
      if (autoFocusEl && typeof autoFocusEl.focus === 'function') {
        autoFocusEl.focus();
        return;
      }

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(
        (el) =>
          el.getAttribute('aria-hidden') !== 'true' &&
          !el.hasAttribute('disabled') &&
          el.tabIndex !== -1
      );

      if (focusable.length > 0) {
        focusable[0].focus();
      } else if (typeof container.focus === 'function') {
        container.focus();
      }
    }, 16);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(
        (el) =>
          el.getAttribute('aria-hidden') !== 'true' &&
          !el.hasAttribute('disabled') &&
          el.tabIndex !== -1
      );

      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === firstElement || !container.contains(activeEl)) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (activeEl === lastElement || !container.contains(activeEl)) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);

      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function' &&
        document.contains(previousActiveElement.current)
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose, containerRef]);

  return containerRef;
}
