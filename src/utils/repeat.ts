import { startOfDay, addDays, addWeeks, addMonths, addYears, differenceInCalendarDays, differenceInCalendarMonths, differenceInCalendarYears } from 'date-fns';
import type { Task } from '../types/index.ts';

// Upper bound on how many intervals a repeating task is advanced in one pass
export const MAX_REPEAT_CATCH_UP_STEPS = 1000;

// "Every N days/weeks/months/years": N is kept between 1 and this value
export const MAX_REPEAT_INTERVAL = 999;

// Utility function to coerce an untrusted interval into a whole number from 1 to MAX_REPEAT_INTERVAL
export const normalizeInterval = (value: unknown): number => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_REPEAT_INTERVAL) : 1;
};

/**
 * The due date of the next occurrence of a repeating task that is being completed `now`.
 *
 * Robustness / pitfalls guarded against:
 * - Completed late: the result is never in the past, so finishing a task that was weeks overdue
 *   doesn't create a next task that is already overdue.
 * - Completed early: the next date still counts from the due date (the "due date" anchor), so
 *   finishing Friday's task on Wednesday doesn't pull next week's task forward.
 * - Month ends: dates are computed from the original date (Jan 31 + 1 month, + 2 months, ...) and not
 *   by chaining, otherwise Jan 31 -> Feb 28 -> Mar 28 would drift for good.
 * - No due date: counted from the completion day, so a repeating task without a date still repeats.
 * - Very old due dates: the search starts near the answer, so a task untouched for years is not stepped
 *   through one interval at a time; the search itself is bounded by MAX_REPEAT_CATCH_UP_STEPS, then falls
 *   back to one step from the anchor.
 * - Time of day is ignored (dates only); the result is the start of a day.
 * - Weekday choice with an interval above 1 is ignored: "every 2 days" and "on Mon/Wed" can't both hold.
 */
export const computeNextDueDate = (
  task: Pick<Task, 'repeat' | 'repeatDays' | 'repeatInterval' | 'repeatAnchor' | 'dueDate'>,
  now: Date = new Date()
): Date => {
  const today = startOfDay(now);
  const interval = normalizeInterval(task.repeatInterval);
  const fromCompletion = task.repeatAnchor === 'completion' || !task.dueDate;
  const base = startOfDay(fromCompletion ? now : new Date(task.dueDate as Date));

  if (task.repeat === 'daily' && interval === 1 && task.repeatDays && task.repeatDays.length > 0) {
    // First allowed weekday after the anchor, and not before today
    let candidate = addDays(base < today ? addDays(today, -1) : base, 1);
    for (let i = 0; i < 7; i++) {
      if (task.repeatDays.includes(candidate.getDay())) return candidate;
      candidate = addDays(candidate, 1);
    }
    return addDays(base, 1);
  }

  const advance = (steps: number): Date => {
    const n = steps * interval;
    switch (task.repeat) {
      case 'daily': return addDays(base, n);
      case 'weekly': return addWeeks(base, n);
      case 'monthly': return addMonths(base, n);
      case 'yearly': return addYears(base, n);
      default: return base;
    }
  };

  // Jump close to the answer instead of stepping one interval at a time from a date years ago
  // (a daily task untouched for 10 years would need more steps than the loop bound below allows).
  // One step less than the estimate is safe: the loop only accepts a candidate that is today or later.
  const unitsToToday = (() => {
    switch (task.repeat) {
      case 'daily': return differenceInCalendarDays(today, base);
      case 'weekly': return Math.floor(differenceInCalendarDays(today, base) / 7);
      case 'monthly': return differenceInCalendarMonths(today, base);
      case 'yearly': return differenceInCalendarYears(today, base);
      default: return 0;
    }
  })();
  const firstStep = Math.max(1, Math.floor(unitsToToday / interval) - 1);

  for (let step = firstStep; step < firstStep + MAX_REPEAT_CATCH_UP_STEPS; step++) {
    const candidate = advance(step);
    if (candidate >= today && candidate > base) return candidate;
  }
  return advance(1);
};
