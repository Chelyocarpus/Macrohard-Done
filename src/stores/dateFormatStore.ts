import { create } from 'zustand';
import { useToastStore } from './toastStore.ts';
import {
  DATE_TIME_PREFS_KEY,
  DEFAULT_DATE_TIME_PREFS,
  parseDateTimePrefs,
  readDateTimePrefs,
  writeDateTimePrefs,
  type DateFormatId,
  type DateTimePrefs,
  type TimeFormatId,
} from '../utils/dateFormat.ts';

/**
 * This device's date and time style, as the formatters (utils/dateUtils.ts) and the Settings page see them.
 * Components that write a date while rendering call `useDateTimePrefs()` so they draw again when it changes.
 */
interface DateFormatState extends DateTimePrefs {
  setDateFormat: (format: DateFormatId) => void;
  setTimeFormat: (format: TimeFormatId) => void;
}

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // some browsers throw when site data is blocked
  }
};

const initial: DateTimePrefs = (() => {
  const store = storage();
  return store ? readDateTimePrefs(store) : { ...DEFAULT_DATE_TIME_PREFS };
})();

export const useDateFormatStore = create<DateFormatState>()((set, get) => {
  /**
   * Shows the new style at once, then saves it.
   *
   * Robustness / pitfalls guarded against:
   * - A choice that is already in effect does nothing (no write, no redraw).
   * - Storage that fails or drops the write: the style still changes for this session, and a message says it will not
   *   be remembered (the outcome is never reported as saved when it was not).
   * - The other setting is taken from the latest state, which other tabs keep current through the "storage" event
   *   below, so changing one setting cannot undo a change just made to the other in another tab.
   */
  const change = (changes: Partial<DateTimePrefs>) => {
    const current = get();
    const next = parseDateTimePrefs({ dateFormat: current.dateFormat, timeFormat: current.timeFormat, ...changes });
    if (next.dateFormat === current.dateFormat && next.timeFormat === current.timeFormat) return;
    set(next);
    const store = storage();
    if (!store || !writeDateTimePrefs(store, next)) {
      useToastStore.getState().showWarning('Not saved', 'This browser did not keep the date and time style, so it may be back to the default after a reload.');
    }
  };

  return {
    ...initial,
    setDateFormat: (dateFormat) => change({ dateFormat }),
    setTimeFormat: (timeFormat) => change({ timeFormat }),
  };
});

// Another tab changed the style: follow it
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== DATE_TIME_PREFS_KEY) return;
    const store = storage();
    if (!store) return;
    const next = readDateTimePrefs(store);
    const current = useDateFormatStore.getState();
    if (next.dateFormat !== current.dateFormat || next.timeFormat !== current.timeFormat) useDateFormatStore.setState(next);
  });
}

/** The current date and time style. Call it in a component that writes dates, so it updates when the style changes. */
export function useDateTimePrefs(): DateTimePrefs {
  const dateFormat = useDateFormatStore((state) => state.dateFormat);
  const timeFormat = useDateFormatStore((state) => state.timeFormat);
  return { dateFormat, timeFormat };
}

/** The current style, for code that is not a component */
export function currentDateTimePrefs(): DateTimePrefs {
  const { dateFormat, timeFormat } = useDateFormatStore.getState();
  return { dateFormat, timeFormat };
}
