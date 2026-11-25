/**
 * Page layout by window width (the UI spec's three layouts). Pure, so it can be unit-tested; the hook
 * `useLayoutMode` in hooks/useMediaQuery.ts uses the same numbers through media queries.
 *
 * - wide   (1100px and up): sidebar, list and a permanent 360px details pane side by side.
 * - medium (700 to 1099px): the sidebar shrinks to icons and the details open over the list.
 * - narrow (under 700px):   one screen at a time: Lists, then a list, with the details as a bottom sheet.
 */
export type LayoutMode = 'wide' | 'medium' | 'narrow';

export const WIDE_MIN_WIDTH = 1100;
export const MEDIUM_MIN_WIDTH = 700;

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_ICON_WIDTH = 64;
export const DETAIL_PANE_WIDTH = 360;

export function layoutModeForWidth(width: number): LayoutMode {
  if (!Number.isFinite(width)) return 'wide'; // unknown width: the desktop layout is the safe default
  if (width >= WIDE_MIN_WIDTH) return 'wide';
  if (width >= MEDIUM_MIN_WIDTH) return 'medium';
  return 'narrow';
}

/**
 * Whether the sidebar shows only icons. On a wide screen that is the person's choice; on a medium one
 * it is always so (there is no room); on a narrow one the sidebar is the full-screen Lists screen and
 * always shows labels.
 */
export function isSidebarCollapsed(mode: LayoutMode, storedCollapsed: boolean): boolean {
  if (mode === 'narrow') return false;
  if (mode === 'medium') return true;
  return storedCollapsed;
}

/** Space the page content leaves free for the fixed sidebar (left) and the permanent details pane (right). */
export function contentInsets(mode: LayoutMode, storedCollapsed: boolean, detailPaneOpen: boolean): { left: number; right: number } {
  if (mode === 'narrow') return { left: 0, right: 0 };
  return {
    left: isSidebarCollapsed(mode, storedCollapsed) ? SIDEBAR_ICON_WIDTH : SIDEBAR_WIDTH,
    right: mode === 'wide' && detailPaneOpen ? DETAIL_PANE_WIDTH : 0,
  };
}
