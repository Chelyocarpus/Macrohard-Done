/**
 * Reminders: deciding WHICH reminders are due and WHEN to look again. No React, no browser APIs, no storage:
 * plain functions over plain data, so every rule below can be tested with fake tasks and a fake clock.
 * Delivering them (a system notification or an in-app message) lives in reminderEngine.ts.
 *
 * What the app promises: while it is open (also in a background tab or an installed app that is running), a reminder
 * is delivered once, at its time. A reminder that came due while the app was closed is delivered when it opens again,
 * if that is within CATCH_UP_WINDOW_MS. Older ones are left alone (they still show in Planned). The app does not wake
 * a closed browser: that needs a push service, which this app does not have.
 */

/** The part of a task this module needs */
export interface ReminderTask {
  id: string;
  title: string;
  completed: boolean;
  reminder?: Date;
  /** When the task was last changed. A reminder set (or a task edited) after the reminder's time is not alerted. */
  updatedAt?: Date;
}

/** A reminder that is due now */
export interface DueReminder {
  taskId: string;
  title: string;
  /** When it was set for (ms since 1970) */
  time: number;
}

/** What has been delivered: task id -> the reminder time (ms) that was delivered for it */
export type Ledger = Record<string, number>;

/** A reminder that came due while the app was closed still alerts when the app opens within this long */
export const CATCH_UP_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Up to this many reminders due together alert one by one; more become one summary (no flood of alerts) */
export const MAX_INDIVIDUAL = 3;
/** The longest wait between looks. Browsers slow timers in background tabs, so a precise timer is never trusted alone. */
export const MAX_POLL_MS = 30_000;
/** The shortest wait between looks, so a reminder that is "now" can never make a tight loop */
export const MIN_DELAY_MS = 500;
/** The ledger never holds more than this many entries (the oldest go first) */
export const MAX_LEDGER_ENTRIES = 500;
/** A reminder that failed to deliver is tried this many times in one session, then left alone */
export const MAX_DELIVERY_ATTEMPTS = 3;

const isFiniteTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** The reminder's time in ms, or null when the task has none or it is not a real date */
export function reminderTime(task: Pick<ReminderTask, 'reminder'>): number | null {
  const time = task.reminder instanceof Date ? task.reminder.getTime() : NaN;
  return Number.isNaN(time) ? null : time;
}

/** Reads the saved ledger. Anything unreadable gives an empty one, never a throw. */
export function parseLedger(text: string | null): Ledger {
  if (!text) return {};
  try {
    const raw: unknown = JSON.parse(text);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const ledger: Ledger = {};
    for (const [id, time] of Object.entries(raw)) if (isFiniteTime(time)) ledger[id] = time;
    return ledger;
  } catch {
    return {};
  }
}

/**
 * The reminders that are due: their time has come, and none of the following holds.
 *
 * Robustness / pitfalls guarded against:
 * - Delivered twice: a task whose ledger entry equals its current reminder time is skipped. A changed reminder has a
 *   different time, so it can alert again.
 * - A flood after a long absence: only reminders from the last CATCH_UP_WINDOW_MS count.
 * - A flood the first time the app runs this: reminders from before `since` (when this device first ran it) never count.
 * - Finished tasks and invalid dates never alert.
 * - Setting a reminder to a time that has already passed does not alert at once: the task was changed after that time,
 *   so the person knows about it. (A reminder that came due while the app was closed has not been changed since, so it
 *   still alerts when the app opens.)
 * - A reminder in the future is not due, however the clock moves (the check uses the time it is given every time).
 * - Oldest first, so the order of alerts is the order of the reminders.
 */
export function dueReminders(tasks: readonly ReminderTask[], ledger: Ledger, now: number, since: number): DueReminder[] {
  const due: DueReminder[] = [];
  for (const task of tasks) {
    if (task.completed) continue;
    const time = reminderTime(task);
    if (time === null || time < since || time > now || now - time > CATCH_UP_WINDOW_MS) continue;
    if (ledger[task.id] === time) continue;
    if (task.updatedAt instanceof Date && task.updatedAt.getTime() > time) continue;
    due.push({ taskId: task.id, title: task.title, time });
  }
  return due.sort((a, b) => a.time - b.time || a.taskId.localeCompare(b.taskId));
}

/**
 * How long to wait before looking again: until the next reminder, but never longer than MAX_POLL_MS (a timer in a
 * background tab can run late; looking again by wall-clock time is what keeps reminders right) and never shorter than
 * MIN_DELAY_MS.
 *
 * Robustness / pitfalls guarded against:
 * - A reminder far in the future (or a huge number) never produces a delay a timer can't hold: the result is clamped.
 * - Reminders that are already due are not counted: they are handled by the look that found them, so a reminder that
 *   can't be delivered right now never turns this into a fast loop.
 */
export function nextDelay(tasks: readonly ReminderTask[], ledger: Ledger, now: number): number {
  let soonest = Infinity;
  for (const task of tasks) {
    if (task.completed) continue;
    const time = reminderTime(task);
    if (time === null || time <= now || ledger[task.id] === time) continue;
    if (time < soonest) soonest = time;
  }
  const wait = soonest === Infinity ? MAX_POLL_MS : soonest - now;
  return Math.min(MAX_POLL_MS, Math.max(MIN_DELAY_MS, wait));
}

export interface DeliveryPlan {
  /** Alert each of these on its own */
  individual: DueReminder[];
  /** More than MAX_INDIVIDUAL were due together: one alert for all of these instead */
  summary: DueReminder[];
}

/** Splits what is due into single alerts, or one summary when there are too many to show one by one. */
export function planDelivery(due: readonly DueReminder[]): DeliveryPlan {
  return due.length <= MAX_INDIVIDUAL ? { individual: [...due], summary: [] } : { individual: [], summary: [...due] };
}

/**
 * Notes that these reminders were delivered, and tidies the ledger. Returns a new ledger.
 *
 * Robustness / pitfalls guarded against:
 * - Entries for tasks that no longer exist, or whose reminder has since changed, are removed (they can never match
 *   again), so the ledger follows the data instead of growing for ever.
 * - The size is capped at MAX_LEDGER_ENTRIES; when it is over, the entries with the oldest reminder times go first
 *   (a reminder that old is outside the catch-up window anyway).
 * - The input ledger is never changed.
 */
export function withDelivered(ledger: Ledger, delivered: readonly DueReminder[], tasks: readonly ReminderTask[]): Ledger {
  const current = new Map<string, number | null>(tasks.map((task) => [task.id, reminderTime(task)]));
  const next: Ledger = {};
  for (const [id, time] of Object.entries(ledger)) if (current.get(id) === time) next[id] = time;
  for (const item of delivered) next[item.taskId] = item.time;
  const entries = Object.entries(next);
  if (entries.length <= MAX_LEDGER_ENTRIES) return next;
  entries.sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(entries.slice(0, MAX_LEDGER_ENTRIES));
}

/** Takes the given reminders back out of the ledger (a delivery that failed), so they can be tried again. */
export function withoutDelivered(ledger: Ledger, undo: readonly DueReminder[]): Ledger {
  const next = { ...ledger };
  for (const item of undo) if (next[item.taskId] === item.time) delete next[item.taskId];
  return next;
}
