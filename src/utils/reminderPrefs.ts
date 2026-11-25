/**
 * This device's reminder settings: whether system notifications are on, and when this device first ran the feature.
 * They are per device (a browser's permission is per device too) and shared by all profiles. Plain functions over a
 * tiny storage interface, so they can be tested with a fake.
 */
import type { KeyValueStorage } from './profiles.ts';

export const REMINDER_PREFS_KEY = 'todo-clone-reminder-prefs';

export interface ReminderPrefs {
  /** The person asked for system notifications on this device (the browser's permission is separate) */
  enabled: boolean;
  /**
   * When this device first ran reminders (ms). Reminders set for earlier times never alert, so updating the app does
   * not suddenly alert for tasks that were due yesterday.
   */
  since: number;
}

/** Reads the settings. Never throws; unreadable or missing settings give "off, starting now". */
export function readPrefs(storage: KeyValueStorage, now: number): { prefs: ReminderPrefs; found: boolean } {
  try {
    const text = storage.getItem(REMINDER_PREFS_KEY);
    if (text) {
      const raw: unknown = JSON.parse(text);
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const { enabled, since } = raw as { enabled?: unknown; since?: unknown };
        if (typeof since === 'number' && Number.isFinite(since)) return { prefs: { enabled: enabled === true, since }, found: true };
      }
    }
  } catch {
    // fall through to the default
  }
  return { prefs: { enabled: false, since: now }, found: false };
}

/** Saves the settings and reads them back; false when the browser did not keep them. */
export function writePrefs(storage: KeyValueStorage, prefs: ReminderPrefs): boolean {
  try {
    const text = JSON.stringify(prefs);
    storage.setItem(REMINDER_PREFS_KEY, text);
    return storage.getItem(REMINDER_PREFS_KEY) === text;
  } catch {
    return false;
  }
}

/**
 * The settings, written down on first use so the "since" time stays fixed for good.
 *
 * Robustness / pitfalls guarded against:
 * - Storage that can't be written: the settings still work for this session (in memory), but "since" would then be
 *   "now" at every start; that only means reminders from before this start don't alert, never a flood.
 */
export function loadPrefs(storage: KeyValueStorage, now: number): ReminderPrefs {
  const { prefs, found } = readPrefs(storage, now);
  if (!found) writePrefs(storage, prefs);
  return prefs;
}
