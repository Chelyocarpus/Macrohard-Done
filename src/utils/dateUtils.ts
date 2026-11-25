import { format, isToday, isTomorrow, isYesterday, isPast, isThisWeek, isSameWeek, startOfDay, differenceInCalendarDays } from 'date-fns';

export function formatDate(date: Date): string {
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
  
  return format(date, 'MMM d, yyyy');
}

export function formatTime(date: Date): string {
  return format(date, 'h:mm a');
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
