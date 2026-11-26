import { useEffect } from 'react';
import { useTaskStore } from '../stores/taskStore.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { useReminderStore } from '../stores/reminderStore.ts';
import { REMINDERS_DELIVERED_KEY } from '../utils/storage.ts';
import { createReminderEngine } from '../utils/reminderEngine.ts';
import { currentPermission, showSystemNotification } from '../utils/reminderNotify.ts';
import { nextDelay } from '../utils/reminders.ts';
import { openTaskFromReminder } from '../utils/openTask.ts';

/** The page opened by a clicked notification names its task like this (and the address is cleaned straight away) */
const TASK_PARAM = 'task';

/** The task named in the address when the page was opened (undefined = not looked at yet, null = none) */
let pendingTaskId: string | null | undefined;

/** Reads `?task=` from the address once and removes it, so a reload or a bookmark doesn't open it again. */
function takeTaskFromAddress(): string | null {
  try {
    const url = new URL(window.location.href);
    const taskId = url.searchParams.get(TASK_PARAM);
    if (!taskId) return null;
    url.searchParams.delete(TASK_PARAM);
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    return taskId.slice(0, 200);
  } catch {
    return null; // an address we can't read: nothing to open
  }
}

/**
 * Makes reminders alert. While the app is open (also in a background tab or a running installed app) it looks at the
 * tasks, on a timer that wakes up at the next reminder, and again whenever the app comes back to the front, the
 * network returns, or the tasks change. See utils/reminders.ts for what counts as due and utils/reminderEngine.ts for
 * how it is delivered.
 *
 * Robustness / pitfalls guarded against:
 * - Timers in background tabs run late or are paused: every look works from the current clock, and the wait is never
 *   longer than 30 seconds, so a late timer only means a late alert, never a lost one.
 * - Waking the tab or the device, or the app coming to the front, looks at once (the timer may have slept through
 *   the reminder).
 * - A look that is slow or fails never stacks: the next look is only planned after the last one ended, and an error
 *   is caught so the loop keeps going.
 * - Closing the app, or React running the effect twice in development: timers and listeners are removed again.
 * - A clicked notification opens its task, whether the app was open (a message from the service worker) or was closed
 *   (the address carries `?task=`), and a task that is gone says so instead of doing nothing.
 */
export function useReminders(): void {
  useEffect(() => {
    const engine = createReminderEngine({
      now: () => Date.now(),
      getTasks: () => useTaskStore.getState().tasks,
      storage: localStorage,
      ledgerKey: REMINDERS_DELIVERED_KEY,
      since: useReminderStore.getState().since,
      inFront: () => document.visibilityState === 'visible' && document.hasFocus(),
      systemAlertsOn: () => useReminderStore.getState().enabled && currentPermission() === 'granted',
      showSystem: showSystemNotification,
      showInApp: (message) => {
        const taskId = message.taskId;
        const toasts = useToastStore.getState();
        let toastId: string | null = null;
        toasts.addToast({
          title: message.title,
          description: message.body,
          variant: 'info',
          duration: 0, // stays until it is closed: a reminder must not vanish while you look away
          action: taskId
            ? {
                label: 'Open',
                onClick: () => {
                  if (toastId) useToastStore.getState().removeToast(toastId); // it has done its job
                  openTaskFromReminder(taskId);
                },
              }
            : undefined,
        });
        toastId = useToastStore.getState().toasts.at(-1)?.id ?? null;
      },
    });

    let timer = 0;
    let stopped = false;

    const schedule = () => {
      window.clearTimeout(timer);
      if (stopped) return;
      timer = window.setTimeout(() => { void run(); }, nextDelay(useTaskStore.getState().tasks, {}, Date.now()));
    };

    const run = async () => {
      window.clearTimeout(timer);
      try {
        await engine.tick();
      } catch (error) {
        console.error('Reminder check failed:', error);
      }
      schedule();
    };

    const onWake = () => {
      if (document.visibilityState === 'visible') {
        useReminderStore.getState().refreshPermission();
        void run();
      }
    };

    // A short wait after start-up so the page is drawn first; then reminders that came due while the app was closed alert
    const first = window.setTimeout(() => { void run(); }, 1500);
    const unsubscribe = useTaskStore.subscribe((state, previous) => {
      if (state.tasks !== previous.tasks) schedule(); // a reminder was added or moved: wake up for the new one
    });
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('online', onWake);
    window.addEventListener('pageshow', onWake);

    // A click on a notification while the app is open
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown; taskId?: unknown } | null;
      if (data && data.type === 'open-task' && typeof data.taskId === 'string') openTaskFromReminder(data.taskId);
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    // A click on a notification while the app was closed. The task waits in `pendingTaskId` until it has really been
    // opened, so an effect that runs twice (React in development) or is cancelled can't lose it after the address is cleaned.
    if (pendingTaskId === undefined) pendingTaskId = takeTaskFromAddress();
    let opening = 0;
    if (pendingTaskId) {
      opening = window.setTimeout(() => {
        const taskId = pendingTaskId;
        pendingTaskId = null;
        if (taskId) openTaskFromReminder(taskId);
      }, 600);
    }

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      window.clearTimeout(first);
      window.clearTimeout(opening);
      unsubscribe();
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('online', onWake);
      window.removeEventListener('pageshow', onWake);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);
}
