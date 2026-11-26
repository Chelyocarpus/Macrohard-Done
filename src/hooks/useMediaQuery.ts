import { useSyncExternalStore } from 'react';
import { MEDIUM_MIN_WIDTH, WIDE_MIN_WIDTH, type LayoutMode } from '../utils/layout.ts';

/**
 * Subscribe to a CSS media query.
 *
 * Robustness / pitfalls guarded against:
 * - Environments without `matchMedia` (very old browsers, some test runners) fall back to `false`
 *   instead of throwing.
 * - Uses `useSyncExternalStore` so the first render already has the right value (no flash of the
 *   desktop layout on phones) and updates stay consistent while React renders concurrently.
 * - Older Safari (< 14) only supports the deprecated `addListener` API, so both are handled.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
    const mql = window.matchMedia(query);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  };

  const getSnapshot = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Phone layout (under 700px, which is also Tailwind's `md` breakpoint here): one screen at a time. */
export const MOBILE_QUERY = `(max-width: ${MEDIUM_MIN_WIDTH - 1}px)`;
export const WIDE_QUERY = `(min-width: ${WIDE_MIN_WIDTH}px)`;

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

/** 'wide' (1100px and up), 'medium' (700 to 1099px) or 'narrow' (under 700px). See utils/layout.ts. */
export function useLayoutMode(): LayoutMode {
  const narrow = useMediaQuery(MOBILE_QUERY);
  const wide = useMediaQuery(WIDE_QUERY);
  return narrow ? 'narrow' : wide ? 'wide' : 'medium';
}
