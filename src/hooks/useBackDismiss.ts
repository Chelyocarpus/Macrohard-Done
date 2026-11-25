import { useEffect, useRef, useState } from 'react';
import { getBackStack } from '../utils/backStack.ts';

/**
 * While `active` (a panel or dialog is open over the page), the browser's Back button, and a phone's back gesture,
 * run `onBack` instead of leaving the page. `onBack` should do what Escape does: close the panel, or the inner part
 * (a form, a picker) that is open on top of it.
 *
 * Robustness / pitfalls guarded against:
 * - The history bookkeeping (one entry per open panel, kept right however the panel closes) lives in
 *   `utils/backStack.ts`; this hook only registers and unregisters.
 * - A panel that is still open after Back (only an inner part closed) is registered again, so the next Back
 *   reaches it too.
 * - The latest `onBack` is read through a ref, so the registration never goes stale and is made once per open.
 * - Without a browser history (tests, server rendering) nothing is registered.
 */
export function useBackDismiss(active: boolean, onBack: () => void): void {
  const handler = useRef(onBack);
  useEffect(() => {
    handler.current = onBack;
  });
  // Bumped after Back, so a panel that stays open registers again
  const [armed, setArmed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const stack = getBackStack();
    if (!stack) return;
    return stack.register(() => {
      handler.current();
      setArmed((count) => count + 1);
    });
  }, [active, armed]);
}
