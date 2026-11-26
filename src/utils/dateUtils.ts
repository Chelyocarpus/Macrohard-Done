import { format, isToday, isTomorrow, isYesterday, isPast, isThisWeek, isSameWeek, isValid, startOfDay, differenceInCalendarDays } from 'date-fns';
import { currentDateTimePrefs } from '../stores/dateFormatStore.ts';
import { dateOption, timeOption, type DateTimePrefs } from './dateFormat.ts';

// How a date or time is written follows the style chosen in Settings > Date and time (`prefs` defaults to the current
// choice; pass one to format with a specific style). The words "Today", "Tomorrow" and weekday names never change.
// The three functions below that write several parts at once give '' for an invalid date instead of throwing.

/** "Today", "Tomorrow", "Yesterday", a weekday for this week, otherwise the date in the chosen style */
export function formatDate(date: Date, prefs: DateTimePrefs = currentDateTimePrefs()): string {
  if (isToday(date)) {
    return 'Today';
  }

  if (isTomorrow(date)) {
    return 'Tomorrow';
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  // Monday starts the week, as in the Planned view (getPlannedBucket)
  if (isThisWeek(date, { weekStartsOn: 1 })) {
    return format(date, 'EEEE'); // Day of week
  }

  return format(date, dateOption(prefs.dateFormat).pattern);
}

/** "4:30 PM" or "16:30" */
export function formatTime(date: Date, prefs: DateTimePrefs = currentDateTimePrefs()): string {
  return format(date, timeOption(prefs.timeFormat).pattern);
}

/** A time of day given as numbers (a time preset): "4:30 PM" or "16:30" */
export function formatClock(hour: number, minute: number, prefs: DateTimePrefs = currentDateTimePrefs()): string {
  return formatTime(new Date(2000, 0, 1, hour, minute), prefs);
}

/** Just the hour, for a list of hours: "4 PM" or "16" */
export function formatHour(hour: number, prefs: DateTimePrefs = currentDateTimePrefs()): string {
  return prefs.timeFormat === '24h' ? String(hour).padStart(2, '0') : format(new Date(2000, 0, 1, hour), 'h a');
}

/** The date in the chosen style, never "Today" or a weekday: "Nov 26, 2026", "2026-11-26" */
export function formatFullDate(date: Date, prefs: DateTimePrefs = currentDateTimePrefs()): string {
  return isValid(date) ? format(date, dateOption(prefs.dateFormat).pattern) : '';
}

/** Date and time together, never "Today": "Nov 26, 2026, 4:30 PM", "2026-11-26, 16:30" */
export function formatDateTime(date: Date, prefs: DateTimePrefs = currentDateTimePrefs()): string {
  return isValid(date) ? `${formatFullDate(date, prefs)}, ${formatTime(date, prefs)}` : '';
}

/** With the weekday, for tooltips: "Thursday, Nov 26, 2026" */
export function formatLongDate(date: Date, prefs: DateTimePrefs = currentDateTimePrefs()): string {
  return isValid(date) ? `${format(date, 'EEEE')}, ${formatFullDate(date, prefs)}` : '';
}

/** With the weekday and the time, for tooltips: "Thursday, Nov 26, 2026, 4:30 PM" */
export function formatLongDateTime(date: Date, prefs: DateTimePrefs = currentDateTimePrefs()): string {
  return isValid(date) ? `${formatLongDate(date, prefs)}, ${formatTime(date, prefs)}` : '';
}

/** A short day for a line of text: "Fri, Nov 27" (the numeric styles keep the year, as "Fri, 2026-11-27") */
export function formatShortDate(date: Date, prefs: DateTimePrefs = currentDateTimePrefs()): string {
  return isValid(date) ? format(date, dateOption(prefs.dateFormat).short) : '';
}

export type PlannedBucket = 'earlier' | 'today' | 'tomorrow' | 'this-week' | 'later';

export const PLANNED_BUCKETS: { id: PlannedBucket; label: string }[] = [
  { id: 'earlier', label: 'Earlier' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'this-week', label: 'This week' },
  { id: 'later', label: 'Later' },
];

/**
 * Which part of the Planned view a due date belongs to.
 * - Days are compared as calendar days, so a task due today at 23:59 is "Today", not "Earlier".
 * - "This week" is the rest of the current week (Monday to Sunday) after tomorrow; a day that falls into
 *   next week is "Later". When tomorrow is already next week, it is still "Tomorrow".
 * - An invalid date goes to "Later" instead of throwing.
 */
export function getPlannedBucket(date: Date, now: Date = new Date()): PlannedBucket {
  const day = startOfDay(new Date(date));
  if (Number.isNaN(day.getTime())) return 'later';
  const today = startOfDay(now);
  const diff = differenceInCalendarDays(day, today);
  if (diff < 0) return 'earlier';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return isSameWeek(day, today, { weekStartsOn: 1 }) ? 'this-week' : 'later';
}

export function isOverdue(date: Date): boolean {
  return isPast(startOfDay(date)) && !isToday(date);
}
