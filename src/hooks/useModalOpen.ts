import { useEffect, useState } from 'react';

/** Is a dialog or side panel open over the page? */
export function isModalOpen(root: ParentNode = document): boolean {
  return !!root.querySelector('[aria-modal="true"]');
}

/**
 * True while a dialog or side panel is open over the page. Every one of them (task details, list and group editors,
 * tag manager, pickers, "Remove all data", ...) declares `aria-modal`, so that is what is looked for. Used to hide
 * the add-task bar and to freeze the Undo messages, which must not be usable behind a dialog.
 *
 * Robustness / pitfalls guarded against:
 * - Bursts of changes in the page cause at most one look per animation frame.
 * - Only the page's own structure is watched (added/removed elements and the `aria-modal` attribute), not every class
 *   change, and there is no timer polling.
 * - The watcher is disconnected and its pending frame cancelled when the component goes away.
 */
export function useModalOpen(): boolean {
  const [modalOpen, setModalOpen] = useState(() => (typeof document === 'undefined' ? false : isModalOpen()));

  useEffect(() => {
    const check = () => setModalOpen(isModalOpen());
    check();
    let frame = 0;
    const scheduleCheck = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        check();
      });
    };
    const observer = new MutationObserver(scheduleCheck);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal'] });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return modalOpen;
}
