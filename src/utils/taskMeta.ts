import { isSameDay } from 'date-fns';
import type { Category, Task } from '../types/index.ts';
import { formatDate, formatTime } from './dateUtils.ts';

/**
 * Small pure helpers for the details shown on a task card (see TaskMeta.tsx): the words for repeat and
 * reminder, the steps progress bar, which tags fit, and a one-line note preview. Nothing here changes
 * any data.
 */

const UNIT: Record<'daily' | 'weekly' | 'monthly' | 'yearly', string> = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };
const SHORT: Record<'daily' | 'weekly' | 'monthly' | 'yearly', string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Weekly", "Every 2 weeks"; with `long` also the weekdays ("Every week on Tue, Sat"). Empty when the task does not repeat. */
export function repeatLabel(task: Pick<Task, 'repeat' | 'repeatInterval' | 'repeatDays'>, long = false): string {
  const repeat = task.repeat;
  if (!repeat || repeat === 'none') return '';
  // A damaged interval (0, negative, NaN) counts as 1, so the label never says "Every 0 days"
  const interval = Number.isFinite(task.repeatInterval) && (task.repeatInterval as number) >= 1 ? Math.floor(task.repeatInterval as number) : 1;
  const unit = UNIT[repeat];
  if (!unit) return '';
  if (!long) return interval === 1 ? SHORT[repeat] : `Every ${interval} ${unit}s`;
  const days = repeat === 'weekly' && task.repeatDays?.length
    ? ` on ${[...task.repeatDays].sort((a, b) => a - b).map((d) => DAY_NAMES[d]).filter(Boolean).join(', ')}`
    : '';
  return `${interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`}${days}`;
}

/**
 * The reminder as a short phrase that cannot be mistaken for the due date: "Remind at 4:00 PM" when it is on
 * the due day, otherwise "Remind Dec 1, 2026, 9:00 AM".
 */
export function reminderLabel(task: Pick<Task, 'reminder' | 'dueDate'>): string {
  const { reminder, dueDate } = task;
  if (!reminder) return '';
  if (dueDate && isSameDay(reminder, dueDate)) return `Remind at ${formatTime(reminder)}`;
  return `Remind ${formatDate(reminder)}, ${formatTime(reminder)}`;
}

/** The due date as a short phrase: "Due Today", "Due Friday", "Due Dec 12, 2026"; overdue ones say "Overdue: ..." instead. */
export function dueLabel(dueDate: Date, overdue: boolean): string {
  return overdue ? `Overdue: ${formatDate(dueDate)}` : `Due ${formatDate(dueDate)}`;
}

/**
 * The steps progress bar: at most `max` small segments (10 steps or fewer: one each), and how many of them are filled.
 * Pitfalls guarded against: some progress always shows at least one filled segment, and "all filled" only
 * when every step is done, so a bar never reads as finished (or as untouched) when it is not.
 */
export function stepSegments(done: number, total: number, max = 10): { segments: number; filled: number } {
  if (total <= 0) return { segments: 0, filled: 0 };
  const segments = Math.min(total, max);
  const safeDone = Math.min(Math.max(done, 0), total);
  if (safeDone >= total) return { segments, filled: segments };
  if (safeDone === 0) return { segments, filled: 0 };
  return { segments, filled: Math.min(segments - 1, Math.max(1, Math.round((safeDone / total) * segments))) };
}

/**
 * The tags of a task that fit on its card (`max`), and the rest. Tag ids that no longer exist are skipped. When
 * only one tag would be left over it is shown as well, since a "+1" chip is no smaller than the tag itself.
 */
export function splitTags(categoryIds: readonly string[], categories: readonly Category[], max: number): { shown: Category[]; hidden: Category[] } {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const all = categoryIds.flatMap((id) => {
    const category = byId.get(id);
    return category ? [category] : [];
  });
  const limit = Math.max(0, max);
  if (all.length <= limit + 1) return { shown: all, hidden: [] };
  return { shown: all.slice(0, limit), hidden: all.slice(limit) };
}

/**
 * A short description from a note: its first lines with Markdown marks removed (headings, bullets, quotes,
 * bold), joined into one piece of text, for the line under a task's title. The CSS cuts it to 1 or 2 lines;
 * the text is capped here so a huge note is never put on the page whole.
 */
export function noteExcerpt(notes: string | undefined, maxLength = 240): string {
  if (!notes) return '';
  const lines = notes
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^(?:[#>*+-]+\s*|\d+[.)]\s+|\[[ xX]\]\s*)+/, '').replace(/[*_`~]/g, '').trim())
    .filter((line) => line.length > 0);
  const text = lines.join(' · ');
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}
