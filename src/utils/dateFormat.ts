/**
 * How dates and times are written (Settings > Date and time). The choices are per device and shared by all profiles,
 * like the theme. Plain functions over a tiny storage interface, so they can be tested with a fake.
 *
 * The words "Today", "Tomorrow" and weekday names are not affected: only the way a date or time is written out.
 */
import type { KeyValueStorage } from './profiles.ts';

export const DATE_TIME_PREFS_KEY = 'todo-clone-date-time-format';

export type DateFormatId = 'text-us' | 'text-eu' | 'iso' | 'dmy-dash' | 'mdy-slash' | 'dmy-dot';
export type TimeFormatId = '12h' | '24h';

export interface DateTimePrefs {
  dateFormat: DateFormatId;
  timeFormat: TimeFormatId;
}

/** What the app has always shown: "Nov 26, 2026" and "4:30 PM" */
export const DEFAULT_DATE_TIME_PREFS: DateTimePrefs = { dateFormat: 'text-us', timeFormat: '12h' };

interface DateFormatOption {
  id: DateFormatId;
  /** The pattern as people write it ("YYYY-MM-DD"), shown in Settings */
  label: string;
  /** date-fns pattern for a full date */
  pattern: string;
  /** date-fns pattern for a short date with the weekday and (for the text styles) no year, e.g. "Fri, Nov 27" */
  short: string;
}

/** Every date style, in the order Settings shows them */
export const DATE_FORMATS: readonly DateFormatOption[] = [
  { id: 'text-us', label: 'Mon D, YYYY', pattern: 'MMM d, yyyy', short: 'EEE, MMM d' },
  { id: 'text-eu', label: 'D Mon YYYY', pattern: 'd MMM yyyy', short: 'EEE, d MMM' },
  { id: 'iso', label: 'YYYY-MM-DD', pattern: 'yyyy-MM-dd', short: 'EEE, yyyy-MM-dd' },
  { id: 'dmy-dash', label: 'DD-MM-YYYY', pattern: 'dd-MM-yyyy', short: 'EEE, dd-MM-yyyy' },
  { id: 'mdy-slash', label: 'MM/DD/YYYY', pattern: 'MM/dd/yyyy', short: 'EEE, MM/dd/yyyy' },
  { id: 'dmy-dot', label: 'DD.MM.YYYY', pattern: 'dd.MM.yyyy', short: 'EEE, dd.MM.yyyy' },
];

interface TimeFormatOption {
  id: TimeFormatId;
  label: string;
  pattern: string;
}

/** Every time style, in the order Settings shows them */
export const TIME_FORMATS: readonly TimeFormatOption[] = [
  { id: '12h', label: '12-hour', pattern: 'h:mm a' },
  { id: '24h', label: '24-hour', pattern: 'HH:mm' },
];

export const dateOption = (id: DateFormatId): DateFormatOption =>
  DATE_FORMATS.find((option) => option.id === id) ?? DATE_FORMATS[0];

export const timeOption = (id: TimeFormatId): TimeFormatOption =>
  TIME_FORMATS.find((option) => option.id === id) ?? TIME_FORMATS[0];

/**
 * Turns saved settings into preferences. Anything that is not a known choice (a damaged value, a choice from a newer
 * version of the app) becomes the default for that one setting, so a bad value can never reach the page.
 */
export function parseDateTimePrefs(value: unknown): DateTimePrefs {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    dateFormat: DATE_FORMATS.find((option) => option.id === raw.dateFormat)?.id ?? DEFAULT_DATE_TIME_PREFS.dateFormat,
    timeFormat: TIME_FORMATS.find((option) => option.id === raw.timeFormat)?.id ?? DEFAULT_DATE_TIME_PREFS.timeFormat,
  };
}

/** Reads the settings. Never throws; unreadable or missing settings give the defaults. */
export function readDateTimePrefs(storage: KeyValueStorage): DateTimePrefs {
  try {
    const text = storage.getItem(DATE_TIME_PREFS_KEY);
    if (text) return parseDateTimePrefs(JSON.parse(text));
  } catch {
    // fall through to the defaults
  }
  return { ...DEFAULT_DATE_TIME_PREFS };
}

/**
 * Saves the settings and reads them back.
 *
 * Robustness / pitfalls guarded against:
 * - Storage that is full, blocked or switched off (private mode): the write is wrapped in try/catch and the function
 *   returns false instead of throwing, so the caller can say the choice will not be kept.
 * - A browser that accepts the write but drops it: the value is read back and compared, so `true` means it is really
 *   there, not just that nothing threw.
 * - A bad value never reaches storage: the settings are cleaned with `parseDateTimePrefs` first.
 */
export function writeDateTimePrefs(storage: KeyValueStorage, prefs: DateTimePrefs): boolean {
  try {
    const text = JSON.stringify(parseDateTimePrefs(prefs));
    storage.setItem(DATE_TIME_PREFS_KEY, text);
    return storage.getItem(DATE_TIME_PREFS_KEY) === text;
  } catch {
    return false;
  }
}
