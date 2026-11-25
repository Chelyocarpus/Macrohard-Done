import { create } from 'zustand';
import { askPermission, currentPermission, showSystemNotification, type Permission } from '../utils/reminderNotify.ts';
import { loadPrefs, writePrefs } from '../utils/reminderPrefs.ts';

/**
 * This device's reminder settings, as the Settings page and the reminder loop see them: is "system notifications" on,
 * what does the browser allow, and since when do reminders count (see utils/reminderPrefs.ts).
 */
interface ReminderState {
  enabled: boolean;
  /** What the browser allows right now (it can change in the browser's own settings at any time) */
  permission: Permission;
  /** The time (ms) this device first ran reminders */
  since: number;
  /** A question to the browser or a test notification is under way */
  busy: boolean;
  /** The result of the last button press, in plain words */
  notice: { kind: 'ok' | 'warning' | 'error'; text: string } | null;
  refreshPermission: () => void;
  turnOn: () => Promise<void>;
  turnOff: () => void;
  sendTest: () => Promise<void>;
}

const storage = () => (typeof localStorage === 'undefined' ? null : localStorage);

const initial = (() => {
  const store = storage();
  const prefs = store ? loadPrefs(store, Date.now()) : { enabled: false, since: Date.now() };
  return prefs;
})();

export const useReminderStore = create<ReminderState>()((set, get) => ({
  enabled: initial.enabled,
  permission: currentPermission(),
  since: initial.since,
  busy: false,
  notice: null,

  refreshPermission: () => {
    const permission = currentPermission();
    if (permission !== get().permission) set({ permission });
  },

  /**
   * Asks the browser for permission and, if it is given, turns notifications on.
   *
   * Robustness / pitfalls guarded against:
   * - A second press while the browser's question is open does nothing (`busy`).
   * - Permission refused or blocked: the setting stays off and the message says how to change it in the browser.
   * - The setting could not be saved: it works for this session only, and the message says so.
   */
  turnOn: async () => {
    if (get().busy) return;
    set({ busy: true, notice: null });
    try {
      const permission = await askPermission();
      if (permission !== 'granted') {
        set({
          permission,
          enabled: false,
          notice: permission === 'denied'
            ? { kind: 'error', text: 'Your browser blocks notifications for this site. Allow them in the site settings of your browser (the lock icon next to the address), then try again.' }
            : permission === 'unsupported'
              ? { kind: 'error', text: 'This browser cannot show notifications here. Reminders still appear inside the app while it is open.' }
              : { kind: 'warning', text: 'Notifications were not allowed. You can try again whenever you like.' },
        });
        return;
      }
      const store = storage();
      const saved = store ? writePrefs(store, { enabled: true, since: get().since }) : false;
      set({
        permission,
        enabled: true,
        notice: saved
          ? { kind: 'ok', text: 'Notifications are on. Reminders alert you while the app is open, also in the background.' }
          : { kind: 'warning', text: 'Notifications are on, but this browser did not keep the setting, so they may be off again after a reload.' },
      });
    } finally {
      set({ busy: false });
    }
  },

  turnOff: () => {
    const store = storage();
    const saved = store ? writePrefs(store, { enabled: false, since: get().since }) : false;
    set({
      enabled: false,
      notice: saved
        ? { kind: 'ok', text: 'Notifications are off. Reminders still appear inside the app while it is open.' }
        : { kind: 'warning', text: 'Notifications are off for now, but this browser did not keep the setting.' },
    });
  },

  /** Shows a real notification, so the person can see what a reminder will look like and that it works */
  sendTest: async () => {
    if (get().busy) return;
    set({ busy: true, notice: null });
    try {
      await showSystemNotification({ tag: 'reminder-test', title: 'Test reminder', body: 'This is how a reminder will look.' });
      set({ notice: { kind: 'ok', text: 'A test notification was sent. If you did not see it, check that notifications are allowed for your browser in your device settings and that Do Not Disturb is off.' } });
    } catch {
      set({ notice: { kind: 'error', text: 'The test notification could not be shown. Check that notifications are allowed for this site and for your browser.' } });
    } finally {
      set({ busy: false, permission: currentPermission() });
    }
  },
}));
