import type { Task, ListSortMode } from '../types/index.ts';

export const SORT_OPTIONS: { value: ListSortMode; label: string }[] = [
  { value: 'manual', label: 'Manual (drag to reorder)' },
  { value: 'importance', label: 'Importance' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'myDay', label: 'Added to My Day' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'created', label: 'Creation date' },
];

const time = (date: Date | string | undefined): number | null => {
  if (!date) return null;
  const t = new Date(date).getTime();
  return Number.isNaN(t) ? null : t;
};

/**
 * Sorts tasks for a list. Returns the SAME array for plain manual order (nothing to do), otherwise a
 * sorted copy; the input is never changed.
 *
 * Robustness / pitfalls guarded against:
 * - Ties (same importance, same day, ...) keep the manual order, so the result is stable and doesn't
 *   jump around between renders.
 * - Tasks without a due date go after the ones that have one (before reversing), instead of being
 *   treated as "date 0" and floating to the top.
 * - Invalid or damaged dates count as "no date" rather than producing NaN comparisons, which would
 *   make the order undefined.
 * - Titles compare without regard to case or accents, and numbers by value ("Task 2" before "Task 10").
 */
export function sortTasks(tasks: Task[], mode: ListSortMode = 'manual', reverse = false): Task[] {
  if (mode === 'manual' && !reverse) return tasks;

  const byOrder = (a: Task, b: Task) => a.order - b.order;

  const compare = (a: Task, b: Task): number => {
    switch (mode) {
      case 'importance':
        return Number(b.important) - Number(a.important);
      case 'myDay':
        return Number(b.myDay) - Number(a.myDay);
      case 'dueDate': {
        const ta = time(a.dueDate);
        const tb = time(b.dueDate);
        if (ta === null && tb === null) return 0;
        if (ta === null) return 1;
        if (tb === null) return -1;
        return ta - tb;
      }
      case 'alphabetical':
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true });
      case 'created':
        return (time(a.createdAt) ?? 0) - (time(b.createdAt) ?? 0);
      default:
        return 0;
    }
  };

  const sorted = [...tasks].sort((a, b) => compare(a, b) || byOrder(a, b));
  return reverse ? sorted.reverse() : sorted;
}
