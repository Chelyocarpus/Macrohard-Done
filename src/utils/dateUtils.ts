import { format, isToday, isTomorrow, isYesterday, isPast, isThisWeek, startOfDay } from 'date-fns';

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
  
  if (isThisWeek(date)) {
    return format(date, 'EEEE'); // Day of week
  }
  
  return format(date, 'MMM d, yyyy');
}

export function formatTime(date: Date): string {
  return format(date, 'h:mm a');
}

export function isOverdue(date: Date): boolean {
  return isPast(startOfDay(date)) && !isToday(date);
}

export function getDaysUntilDue(date: Date): number {
  const today = startOfDay(new Date());
  const dueDate = startOfDay(date);
  return Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
