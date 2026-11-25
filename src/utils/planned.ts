import type { Task } from '../types/index.ts';

type PlanningFields = Pick<Task, 'dueDate' | 'reminder'>;

const validDate = (value: Date | string | undefined): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/**
 * The day a task counts as "planned" for: its due date, or when it has none, its reminder.
 * A task with neither (or with only damaged dates) is not planned. Like in Microsoft To Do, a task
 * that only has "Remind me" set still shows up in Planned.
 */
export function getPlannedDate(task: PlanningFields): Date | undefined {
  return validDate(task.dueDate) ?? validDate(task.reminder);
}

export function isPlanned(task: PlanningFields): boolean {
  return getPlannedDate(task) !== undefined;
}

/**
 * Orders tasks by their planned date (see getPlannedDate), earliest first. Returns a sorted copy.
 * Ties keep the store's order (the sort is stable), so rows don't jump around between renders.
 */
export function sortByPlannedDate<T extends PlanningFields>(tasks: T[]): T[] {
  return tasks
    .map((task, index) => ({ task, index, time: getPlannedDate(task)?.getTime() ?? Infinity }))
    .sort((a, b) => (a.time === b.time ? a.index - b.index : a.time < b.time ? -1 : 1))
    .map((entry) => entry.task);
}
