import { useEffect, useRef } from 'react';
import { useBackDismiss } from './useBackDismiss.ts';

/** Every layer that is listening for Escape, oldest first. Only the newest one (the top layer) reacts. */
const activeLayers: symbol[] = [];

/**
 * Runs `onEscape` when Escape is pressed while `active` is true (a side panel, dialog or popup is open).
 * With `{ back: true }` the browser's Back button (a phone's back gesture) does the same, instead of leaving the
 * page: for panels and dialogs that cover the screen, not for small popups like tooltips and menus.
 *
 * Robustness / pitfalls guarded against:
 * - Layers inside layers (an emoji picker inside a form inside the tags manager): only the layer that became
 *   active last reacts, so one press closes one layer. Without this, listeners run in the order they were added
 *   and the outer panel (added first) would close together with the picker.
 * - Escape that something else already used (a menu, a text field's own handling) calls preventDefault, so it
 *   is ignored here.
 * - Escape while composing text with an input method (IME) ends the composition, not the panel.
 * - The latest `onEscape` is read through a ref, so the listener is added once per open and never goes stale.
 * - The layer is registered only while `active`, and removed on close or unmount, so a closed panel never
 *   blocks the one below it.
 */
export function useEscapeKey(active: boolean, onEscape: () => void, options?: { back?: boolean }): void {
  const handler = useRef(onEscape);
  useEffect(() => {
    handler.current = onEscape;
  });
  useBackDismiss(active && !!options?.back, onEscape);

  useEffect(() => {
    if (!active) return;
    const layer = Symbol('escape-layer');
    activeLayers.push(layer);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
      if (activeLayers[activeLayers.length - 1] !== layer) return;
      event.preventDefault();
      handler.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = activeLayers.indexOf(layer);
      if (index !== -1) activeLayers.splice(index, 1);
    };
  }, [active]);
}
