/**
 * Centralized z-index values for consistent layering throughout the application
 * Higher values appear on top of lower values
 */
export const Z_INDEX = {
  /** Notifications and toasts - highest priority */
  TOAST: 60,
  
  /** Modals and sidebars */
  MODAL: 50,
  
  /** Dropdowns, context menus, and overlays */
  DROPDOWN: 40,
  
  /** Main sidebar navigation */
  SIDEBAR: 30,
  
  /** General overlays and backdrops */
  OVERLAY: 20,
  
  /** Relative positioning elements */
  RELATIVE: 10,
  
  /** Base level elements */
  BASE: 1
} as const;

export type ZIndexLevel = typeof Z_INDEX[keyof typeof Z_INDEX];

/**
 * Helper function to get Tailwind z-index class
 */
export function getZIndexClass(level: ZIndexLevel): string {
  return `z-[${level}]`;
}

/**
 * Predefined z-index classes for common use cases
 */
export const Z_INDEX_CLASSES = {
  TOAST: getZIndexClass(Z_INDEX.TOAST),
  MODAL: getZIndexClass(Z_INDEX.MODAL),
  DROPDOWN: getZIndexClass(Z_INDEX.DROPDOWN),
  SIDEBAR: getZIndexClass(Z_INDEX.SIDEBAR),
  OVERLAY: getZIndexClass(Z_INDEX.OVERLAY),
  RELATIVE: getZIndexClass(Z_INDEX.RELATIVE),
  BASE: getZIndexClass(Z_INDEX.BASE),
} as const;
