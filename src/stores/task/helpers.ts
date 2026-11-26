import { addDays, differenceInCalendarDays, format } from 'date-fns';
import type { Task, TaskList } from '../../types/index.ts';
import { generateId } from '../../utils/storage.ts';
import { computeNextDueDate } from '../../utils/repeat.ts';

/**
 * The next occurrence a repeating task creates when it is completed, or undefined when it does not repeat.
 * It starts with all steps open, no My Day, and a reminder moved by the same number of days as the due date.
 */
export const buildNextOccurrence = (task: Task, now: Date): Task | undefined => {
  if (!task.repeat || task.repeat === 'none') return undefined;
  const nextDueDate = computeNextDueDate(task, now);
  const shiftDays = task.dueDate ? differenceInCalendarDays(nextDueDate, new Date(task.dueDate)) : 0;
  return {
    ...task,
    id: generateId(),
    completed: false,
    myDay: false,
    myDayDate: undefined,
    dueDate: nextDueDate,
    reminder: task.reminder && task.dueDate ? addDays(new Date(task.reminder), shiftDays) : undefined,
    repeatSpawnedId: undefined,
    steps: task.steps.map((step) => ({ ...step, id: generateId(), completed: false })),
    createdAt: now,
    updatedAt: now,
  };
};

// Utility function to deduplicate category IDs
export const deduplicateCategoryIds = (categoryIds: string[]): string[] => {
  return Array.from(new Set(categoryIds.filter(id => id && id.trim() !== '')));
};

// Utility function to normalize category names for comparison
export const normalizeCategoryName = (name: string): string => {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
};

export const REPEAT_VALUES: readonly NonNullable<Task['repeat']>[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

// Utility function to coerce an untrusted repeat value into a valid one
export const normalizeRepeat = (value: unknown): NonNullable<Task['repeat']> =>
  REPEAT_VALUES.find(v => v === value) ?? 'none';

export const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Local calendar day as "yyyy-MM-dd". Plain strings sort chronologically and survive JSON storage
// unchanged (dates would have to be revived on load).
export const toDayKey = (date: Date = new Date()): string => format(date, 'yyyy-MM-dd');

/**
 * Empty My Day when its day is over, like Microsoft To Do: tasks added on an earlier day are
 * removed from My Day (completed ones included) but stay in their lists. Returns the SAME array
 * when nothing changed so callers can skip a state/storage write.
 *
 * Robustness / pitfalls guarded against:
 * - Tasks saved before the day stamp existed (or with a damaged stamp): they are stamped with today
 *   instead of being dropped, so no one loses their My Day on the first launch after updating.
 * - Clock or time zone moved backwards (stamp is in the future): such tasks are kept, only stamps
 *   strictly before today expire.
 * - Local time, not UTC: the day key uses the local calendar day, so the reset happens at the
 *   user's midnight and not at some other hour.
 * - Absent for several days: a single pass expires everything older than today, no per-day loop.
 * - Repeated passes are no-ops (same array returned), so they cost no re-render and no write.
 */
export const rollOverMyDay = (tasks: Task[], todayKey: string = toDayKey()): Task[] => {
  let changed = false;
  const result = tasks.map((task) => {
    if (!task.myDay) return task;
    if (typeof task.myDayDate !== 'string' || !DAY_KEY_PATTERN.test(task.myDayDate)) {
      changed = true;
      return { ...task, myDayDate: todayKey };
    }
    if (task.myDayDate < todayKey) {
      changed = true;
      return { ...task, myDay: false, myDayDate: undefined };
    }
    return task;
  });
  return changed ? result : tasks;
};

// Default system lists
export const defaultLists: TaskList[] = [
  {
    id: 'my-day',
    name: 'My Day',
    isSystem: true,
    taskCount: 0,
    order: 0,
    createdAt: new Date(),
  },
  {
    id: 'important',
    name: 'Important',
    isSystem: true,
    taskCount: 0,
    order: 1,
    createdAt: new Date(),
  },
  {
    id: 'planned',
    name: 'Planned',
    isSystem: true,
    taskCount: 0,
    order: 2,
    createdAt: new Date(),
  },
  {
    id: 'all',
    name: 'Tasks',
    isSystem: true,
    taskCount: 0,
    order: 3,
    createdAt: new Date(),
  },
];

// True when the device/browser is set to a dark theme. Guarded because `matchMedia` is missing in
// some environments (tests, very old browsers).
export function prefersDarkTheme(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
