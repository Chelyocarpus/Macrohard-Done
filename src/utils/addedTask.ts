import { formatDate } from './dateUtils.ts';

export interface AddedTaskInfo {
  /** Name of the list the task was stored in ("Tasks" for the default list) */
  listName: string;
  myDay?: boolean;
  important?: boolean;
  dueDate?: Date;
  /** Names of the tags the task starts with */
  tagNames?: readonly string[];
}

/** A due date for the middle of a sentence: "tomorrow", but "Friday" and "Nov 27, 2026" (only the relative words are lower-cased) */
export function dueWords(date: Date): string {
  const text = formatDate(date);
  return ['Today', 'Tomorrow', 'Yesterday'].includes(text) ? text.toLowerCase() : text;
}

/**
 * The message shown after a task is added. It says what the person cannot see for sure: WHERE the task went (a task
 * added in My Day, Important or Planned is stored in "Tasks", and one added from a list stays in that list) and what
 * it started with (a due date taken from the title, My Day, important, tags). The text they typed is not repeated.
 */
export function describeAddedTask(info: AddedTaskInfo): { title: string; description?: string } {
  const details: string[] = [];

  if (info.dueDate && !Number.isNaN(info.dueDate.getTime())) details.push(`Due ${dueWords(info.dueDate)}`);
  if (info.important) details.push('Marked important');
  if (info.tagNames && info.tagNames.length > 0) details.push(`Tagged ${info.tagNames.map((name) => `#${name}`).join(' ')}`);

  return {
    title: `Added to ${info.myDay ? 'My Day' : info.listName}`,
    description: details.length > 0 ? details.join(' · ') : undefined,
  };
}
