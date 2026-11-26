import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Every trap that is active, oldest first. Only the newest one (the top layer) handles Tab. */
const activeTraps: symbol[] = [];

/**
 * Keeps keyboard focus inside a dialog or side panel while it is open, and gives focus back to what opened it.
 *
 * Robustness / pitfalls guarded against:
 * - A dialog inside a dialog (a date picker over the task panel): only the newest trap handles Tab, so the outer one
 *   does not pull focus out of the picker.
 * - Focus that is already inside when the dialog opens (an auto-focused title field) is left alone; otherwise the
 *   first control inside, or the box itself, gets it, so keyboard and screen-reader users start in the dialog.
 * - Hidden controls (no layout) are skipped, but fixed-position ones count (they have no `offsetParent`).
 * - Focus that has already left the box (a click on the page behind) is brought back on the next Tab.
 * - On close the previous element gets focus back, but only if it is still on the page.
 * - A dialog with nothing focusable keeps focus on the box instead of letting Tab escape.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const box = ref.current;
    if (!active || !box) return;

    const trap = Symbol('focus-trap');
    activeTraps.push(trap);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const items = () => Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);

    if (!box.contains(document.activeElement)) {
      if (box.tabIndex < 0 && !box.hasAttribute('tabindex')) box.tabIndex = -1;
      (box.querySelector<HTMLElement>('[data-autofocus]') ?? items()[0] ?? box).focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.defaultPrevented) return;
      if (activeTraps[activeTraps.length - 1] !== trap) return;
      const list = items();
      if (list.length === 0) {
        event.preventDefault();
        box.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const current = document.activeElement;
      if (!box.contains(current)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (current === first || current === box)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = activeTraps.indexOf(trap);
      if (index !== -1) activeTraps.splice(index, 1);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [ref, active]);
}
