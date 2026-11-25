/**
 * The browser side of reminders: asking for permission and showing system notifications.
 *
 * A notification is shown through the service worker when there is one (the only way on Android, and it lets a click
 * reach the app even when it was closed), otherwise directly (desktop browsers, development).
 */
import { openTaskFromReminder } from './openTask.ts';
import type { ReminderMessage } from './reminderEngine.ts';

/** `unsupported` = this browser has no notifications at all (or the page is not on a secure address) */
export type Permission = 'unsupported' | NotificationPermission;

export function currentPermission(): Permission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

/**
 * Asks the browser for permission. Must run from a click or key press, or the browser may refuse to ask.
 *
 * Robustness / pitfalls guarded against:
 * - No notification support: reported as `unsupported`, nothing thrown.
 * - Already decided (allowed or blocked): the browser is not asked again, the current answer is returned.
 * - A browser that throws or never answers: reported as the current permission, so the caller never hangs.
 */
export async function askPermission(): Promise<Permission> {
  const now = currentPermission();
  if (now !== 'default') return now;
  try {
    const answer = await Promise.race([
      Notification.requestPermission(),
      new Promise<NotificationPermission>((resolve) => window.setTimeout(() => resolve(Notification.permission), 120_000)),
    ]);
    return answer;
  } catch {
    return currentPermission();
  }
}

const iconUrl = () => `${import.meta.env.BASE_URL}icon-192.png`;

/**
 * Shows one system notification. Rejects when it could not be shown, so the caller can try again.
 *
 * Robustness / pitfalls guarded against:
 * - Permission taken away since the setting was turned on: rejects instead of pretending (the caller then keeps the
 *   reminder for later).
 * - A service worker that exists but is not active yet, or a browser that only allows one of the two ways: the other
 *   way is tried before giving up.
 * - The same tag replaces an earlier message instead of stacking, so a repeated delivery is not a second alert.
 */
export async function showSystemNotification(message: ReminderMessage): Promise<void> {
  if (currentPermission() !== 'granted') throw new Error('Notifications are not allowed.');
  const options: NotificationOptions = {
    body: message.body,
    tag: message.tag,
    icon: iconUrl(),
    badge: iconUrl(),
    lang: 'en',
    data: { taskId: message.taskId ?? null },
  };

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(message.title, options);
        return;
      }
    } catch {
      // try the direct way below
    }
  }

  const notification = new Notification(message.title, options);
  notification.onclick = () => {
    window.focus();
    notification.close();
    if (message.taskId) openTaskFromReminder(message.taskId);
  };
}
