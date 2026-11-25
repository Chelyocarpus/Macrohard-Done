/**
 * Delivers due reminders. One `tick()` looks at the tasks, decides what is due (see reminders.ts), writes down that it
 * is being delivered, and then shows it: as an in-app message when the app is in front, as a system notification when
 * it is not and the person turned notifications on, or not at all (it waits) when neither is possible.
 *
 * Everything the outside world does is passed in (`EngineDeps`), so the failure paths can be tested with fakes: storage
 * that refuses to save, a notification that fails, two tabs, a lost acknowledgement.
 */
import { format, isSameDay } from 'date-fns';
import type { KeyValueStorage } from './profiles.ts';
import {
  MAX_DELIVERY_ATTEMPTS,
  dueReminders,
  parseLedger,
  planDelivery,
  withDelivered,
  withoutDelivered,
  type DueReminder,
  type Ledger,
  type ReminderTask,
} from './reminders.ts';

/** What the person sees */
export interface ReminderMessage {
  /** Same tag = the browser shows it once (two tabs delivering the same reminder replace each other) */
  tag: string;
  title: string;
  body: string;
  /** The task to open when the message is clicked; absent for a summary */
  taskId?: string;
}

export interface EngineDeps {
  now: () => number;
  getTasks: () => ReminderTask[];
  storage: KeyValueStorage;
  /** Where the ledger of delivered reminders is kept (one per profile) */
  ledgerKey: string;
  /** Reminders from before this (ms) never alert: the time this device first ran this feature */
  since: number;
  /** The app is visible and has focus: the person is looking at it */
  inFront: () => boolean;
  /** The person turned system notifications on and the browser allows them */
  systemAlertsOn: () => boolean;
  /** Shows a system notification. Must reject when it could not be shown. */
  showSystem: (message: ReminderMessage) => Promise<void>;
  /** Shows an in-app message. Must throw when it could not be shown. */
  showInApp: (message: ReminderMessage) => void;
}

export interface TickResult {
  /** Reminders that were shown */
  delivered: number;
  /** Reminders that are due but could not be shown now (app in the background and notifications off); they wait */
  deferred: number;
  /** Reminders whose delivery failed; they are tried again (a few times) */
  failed: number;
  /** false when the record of delivered reminders could not be saved to storage (kept in memory for this session) */
  saved: boolean;
}

/** A reminder that is late by more than this is called "missed" instead of "reminder" */
const LATE_AFTER_MS = 5 * 60 * 1000;

const idOf = (item: DueReminder) => `${item.taskId}:${item.time}`;

function whenLabel(time: number, now: number): string {
  const date = new Date(time);
  return format(date, isSameDay(date, new Date(now)) ? 'h:mm a' : 'EEE h:mm a');
}

/** The message for one reminder */
export function messageFor(item: DueReminder, now: number): ReminderMessage {
  const late = now - item.time > LATE_AFTER_MS;
  return {
    tag: `reminder:${idOf(item)}`,
    title: item.title.trim() || 'Untitled task',
    body: `${late ? 'Missed reminder' : 'Reminder'} · ${whenLabel(item.time, now)}`,
    taskId: item.taskId,
  };
}

/** The one message for many reminders that came due together */
export function summaryMessage(items: readonly DueReminder[]): ReminderMessage {
  const names = items.slice(0, 3).map((item) => item.title.trim() || 'Untitled task');
  const more = items.length - names.length;
  return {
    tag: `reminder-summary:${items[items.length - 1].time}:${items.length}`,
    title: `${items.length} reminders`,
    body: `${names.join(', ')}${more > 0 ? ` and ${more} more` : ''}`,
  };
}

export function createReminderEngine(deps: EngineDeps) {
  /** Everything claimed in this session. It backs up the saved ledger when storage fails, so a full disk can't repeat alerts. */
  let memory: Ledger = {};
  const attempts = new Map<string, number>();
  /** Claims taken back after a failed delivery. Applied on every read, so a saved copy that could not be corrected still can't hide a reminder. */
  const released = new Set<string>();
  let busy = false;

  const readStored = (): Ledger => {
    try {
      return parseLedger(deps.storage.getItem(deps.ledgerKey));
    } catch {
      return {};
    }
  };

  /** Writes the ledger and reads it back; a value that does not read back the same is a failure */
  const writeStored = (ledger: Ledger): boolean => {
    try {
      const text = JSON.stringify(ledger);
      deps.storage.setItem(deps.ledgerKey, text);
      return deps.storage.getItem(deps.ledgerKey) === text;
    } catch {
      return false;
    }
  };

  /**
   * Looks at the tasks once and delivers what is due.
   *
   * Robustness / pitfalls guarded against:
   * - Delivered twice (a timer firing again, a slow notification, a second tab): the reminders are written into the
   *   ledger BEFORE anything is shown, from a fresh read of storage, and `busy` stops a tick starting while another is
   *   still showing. A second tab then finds them already written; the browser also shows one message per tag.
   * - Storage full or blocked: the claim is also kept in memory, so the alert is not repeated every tick for the rest
   *   of the session. `saved` is false so the caller knows it may repeat after a reload.
   * - A delivery that fails (the browser refuses the notification): the claim is taken back, so the reminder is tried
   *   again, at most MAX_DELIVERY_ATTEMPTS times per reminder, so a permanent failure can't loop for ever.
   * - Nothing can show it right now (in the background, notifications off): nothing is claimed and nothing is lost; it
   *   alerts when the app comes to the front, as long as it is within the catch-up window.
   * - Many at once: more than MAX_INDIVIDUAL become one summary, so a long absence doesn't produce a wall of alerts.
   * - A reminder changed, completed or deleted while a notification was being shown does not matter: the claim is for
   *   that exact time of that task, so a new time alerts again and a finished task is simply not due on the next look.
   */
  const tick = async (): Promise<TickResult> => {
    const result: TickResult = { delivered: 0, deferred: 0, failed: 0, saved: true };
    if (busy) return result;
    busy = true;
    try {
      const now = deps.now();
      const tasks = deps.getTasks();
      const ledger: Ledger = { ...readStored(), ...memory };
      for (const [taskId, time] of Object.entries(ledger)) if (released.has(`${taskId}:${time}`)) delete ledger[taskId];
      const due = dueReminders(tasks, ledger, now, deps.since).filter((item) => (attempts.get(idOf(item)) ?? 0) < MAX_DELIVERY_ATTEMPTS);
      if (due.length === 0) return result;

      const front = deps.inFront();
      const system = !front && deps.systemAlertsOn();
      if (!front && !system) {
        result.deferred = due.length;
        return result;
      }

      const plan = planDelivery(due);
      const groups: { message: ReminderMessage; items: DueReminder[] }[] = plan.summary.length > 0
        ? [{ message: summaryMessage(plan.summary), items: plan.summary }]
        : plan.individual.map((item) => ({ message: messageFor(item, now), items: [item] }));

      // Claim first (read-back checked), then show
      for (const item of due) released.delete(idOf(item));
      memory = withDelivered(memory, due, tasks);
      result.saved = writeStored(withDelivered(readStored(), due, tasks));

      const outcomes = await Promise.all(groups.map(async (group) => {
        try {
          if (system) await deps.showSystem(group.message);
          else deps.showInApp(group.message);
          return true;
        } catch {
          return false;
        }
      }));

      const failedItems: DueReminder[] = [];
      groups.forEach((group, index) => {
        if (outcomes[index]) {
          result.delivered += group.items.length;
        } else {
          result.failed += group.items.length;
          failedItems.push(...group.items);
        }
      });
      if (failedItems.length > 0) {
        for (const item of failedItems) {
          attempts.set(idOf(item), (attempts.get(idOf(item)) ?? 0) + 1);
          released.add(idOf(item));
        }
        memory = withoutDelivered(memory, failedItems);
        const stored = readStored();
        // Take the claim back only if the saved copy actually has it (it may never have been written)
        if (failedItems.some((item) => stored[item.taskId] === item.time)) writeStored(withoutDelivered(stored, failedItems));
      }
      return result;
    } finally {
      busy = false;
    }
  };

  return { tick };
}
