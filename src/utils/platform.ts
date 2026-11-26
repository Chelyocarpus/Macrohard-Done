/**
 * Platform helpers so on-screen hints match the keys people actually press.
 *
 * Robustness / pitfalls guarded against:
 * - `navigator` may be missing (tests, server rendering), so every read is guarded.
 * - `navigator.platform` is deprecated and `userAgentData` is not available everywhere, so several
 *   sources are tried in order.
 * - iPadOS reports itself as "MacIntel"; touch support is used to tell it apart from a real Mac so
 *   the hint is still right (iPads with a keyboard use ⌘ too, which is why this still counts as Apple).
 */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** True when the primary input is a finger (phones and tablets), where hover and right-click don't exist. */
export function isTouchPrimary(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

/** Format a "primary modifier + key" hint: "⌘N" on Apple devices, "Ctrl+N" elsewhere. */
export function shortcutLabel(key: string, extraModifier?: 'Shift' | 'Alt'): string {
  const apple = isApplePlatform();
  const mod = apple ? '⌘' : 'Ctrl';
  const extra = extraModifier ? (apple ? (extraModifier === 'Shift' ? '⇧' : '⌥') : `${extraModifier}+`) : '';
  return apple ? `${mod}${extra}${key}` : `${mod}+${extra}${key}`;
}
