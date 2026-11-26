import type { ThemePreference } from '../types/index.ts';

/**
 * Which theme choice to start with, from what an earlier version saved.
 *
 * Robustness / pitfalls guarded against:
 * - A file saved before the "follow the device" choice existed has only the light/dark that was showing. That
 *   is kept as an explicit choice, so nobody's theme changes when the app updates.
 * - No saved value at all means a first launch: follow the device.
 * - Any other (damaged) value is ignored the same way as no value, never passed on.
 */
export function resolveThemePreference(savedPreference: unknown, savedDarkMode: unknown): ThemePreference {
  if (savedPreference === 'system' || savedPreference === 'light' || savedPreference === 'dark') return savedPreference;
  if (typeof savedDarkMode !== 'boolean') return 'system';
  return savedDarkMode ? 'dark' : 'light';
}

/** Whether the dark theme is showing for a choice, given the device's current setting. */
export function isDarkFor(preference: ThemePreference, deviceIsDark: boolean): boolean {
  return preference === 'system' ? deviceIsDark : preference === 'dark';
}
