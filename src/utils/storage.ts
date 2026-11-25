import type { AppState } from '../types/index.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { keysFor, readActiveProfileId } from './profiles.ts';

/**
 * The profile this tab works in. Read once when the app loads and never changed afterwards: switching profiles
 * reloads the page (see stores/profileStore.ts), so every save in this tab goes to the same profile's keys and can't
 * end up in another profile's data.
 */
export const ACTIVE_PROFILE_ID: string = readActiveProfileId(typeof localStorage === 'undefined' ? undefined : localStorage);

const PROFILE_KEYS = keysFor(ACTIVE_PROFILE_ID);

/** Where the active profile's data is saved (the first profile keeps the names from before profiles existed) */
export const STORAGE_KEY = PROFILE_KEYS.data;
export const CORRUPT_BACKUP_KEY = PROFILE_KEYS.corrupt;
/** The copy of the data kept just before an import replaced it (so the import can be undone) */
export const PREVIOUS_DATA_KEY = PROFILE_KEYS.backup;
/** What this device remembers about its last cloud sync (version and data fingerprint, never the data itself) */
export const SYNC_META_KEY = PROFILE_KEYS.syncMeta;
/** Which reminders this device has already alerted for the active profile (never synced: every device alerts for itself) */
export const REMINDERS_DELIVERED_KEY = PROFILE_KEYS.reminders;

/** Every key the app saves the active profile's data under (see utils/backup.ts) */
export const STORAGE_KEYS = { data: STORAGE_KEY, backup: PREVIOUS_DATA_KEY, extra: [CORRUPT_BACKUP_KEY, SYNC_META_KEY, REMINDERS_DELIVERED_KEY] as const };

// Minimum time between "could not save" toasts so a failing autosave can't flood the UI.
const SAVE_ERROR_TOAST_INTERVAL_MS = 30_000;
let lastSaveErrorToastAt = 0;

/**
 * Persist the app state to localStorage.
 *
 * Robustness / pitfalls guarded against:
 * - Dates: JSON.stringify calls Date.prototype.toJSON *before* any replacer runs, so dates are
 *   stored as ISO strings. They are turned back into Date objects explicitly in
 *   `reviveAppState` on load (a replacer/reviver pair can never round-trip them).
 * - Quota exceeded / storage disabled (private mode, blocked site data): the write is wrapped in
 *   try/catch, reports failure through the return value, and tells the user (rate limited) instead
 *   of failing silently in the console.
 * - A failed write never throws into the caller, so in-memory state stays usable.
 *
 * @returns true when the data was written, false otherwise.
 */
export function saveToStorage(data: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    const now = Date.now();
    if (now - lastSaveErrorToastAt > SAVE_ERROR_TOAST_INTERVAL_MS) {
      lastSaveErrorToastAt = now;
      useToastStore
        .getState()
        .showError('Could not save changes', 'Your latest changes may be lost if you close this tab.');
    }
    return false;
  }
}

/** Convert a stored value to a Date, or undefined when it is missing or not a valid date. */
export function toDate(value: unknown): Date | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  // Legacy tagged form: { __type: 'Date', value: '...' }
  if (typeof value === 'object' && !(value instanceof Date)) {
    const tagged = value as { __type?: unknown; value?: unknown };
    if (tagged.__type === 'Date') return toDate(tagged.value);
    return undefined;
  }
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Like toDate, but for required fields: falls back to "now" so the app never sees an invalid date. */
function toRequiredDate(value: unknown): Date {
  return toDate(value) ?? new Date();
}

type Raw = Record<string, unknown>;

function mapArray<T>(value: unknown, map: (item: Raw) => T): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is Raw => !!item && typeof item === 'object')
    .map(map);
}

/**
 * Turn the plain JSON read from storage back into state with real Date objects.
 * Only the fields that are dates are touched; everything else passes through unchanged.
 */
function reviveAppState(raw: Raw): Partial<AppState> {
  const state = { ...raw } as Raw;

  const tasks = mapArray(raw.tasks, (task) => ({
    ...task,
    dueDate: toDate(task.dueDate),
    reminder: toDate(task.reminder),
    createdAt: toRequiredDate(task.createdAt),
    updatedAt: toRequiredDate(task.updatedAt),
    steps: mapArray(task.steps, (step) => ({ ...step, createdAt: toRequiredDate(step.createdAt) })),
  }));
  if (tasks) state.tasks = tasks;

  for (const key of ['lists', 'listGroups', 'customTimePresets'] as const) {
    const items = mapArray(raw[key], (item) => ({ ...item, createdAt: toRequiredDate(item.createdAt) }));
    if (items) state[key] = items;
  }

  const categories = mapArray(raw.categories, (category) => ({
    ...category,
    createdAt: toRequiredDate(category.createdAt),
    updatedAt: toRequiredDate(category.updatedAt),
  }));
  if (categories) state.categories = categories;

  return state as Partial<AppState>;
}

/**
 * Load the persisted app state.
 *
 * Robustness / pitfalls guarded against:
 * - Corrupt or truncated JSON: the raw string is copied to a backup key *before* returning null,
 *   because the caller will start from defaults and the next autosave would otherwise overwrite it.
 * - Valid JSON that is not an object (e.g. `"x"` or `[]`) is treated as corrupt.
 * - Dates stored as strings are revived explicitly; invalid dates become undefined (optional
 *   fields) or "now" (required fields) instead of Invalid Date objects.
 * - Missing array fields stay missing so the caller's defaults apply.
 */
export function loadFromStorage(): Partial<AppState> | null {
  let serializedData: string | null = null;
  try {
    serializedData = localStorage.getItem(STORAGE_KEY);
    if (!serializedData) return null;

    const parsed: unknown = JSON.parse(serializedData);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Stored data is not an object');
    }
    return reviveAppState(parsed as Raw);
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    if (serializedData) {
      try {
        localStorage.setItem(CORRUPT_BACKUP_KEY, serializedData);
      } catch {
        // Backup is best effort; nothing more we can do if storage is full or unavailable.
      }
    }
    return null;
  }
}

// Kept here so existing imports keep working; the generator itself lives in utils/id.ts (toasts use it too)
export { generateId } from './id.ts';
