import { addDays, getDay, startOfDay } from 'date-fns';

/**
 * A due date typed into a task's title: "Call Mom tomorrow" becomes the task "Call Mom" due tomorrow.
 *
 * Only a phrase at the END of the title counts, and the rest of the title must not be empty, so "Tomorrow" on its own,
 * "Tomorrow's meeting" and "Friday night plans" stay plain titles. Understood (English only):
 *   today, tomorrow, a weekday name ("friday", "on friday", "by friday", "next friday"),
 *   "next week" (the coming Monday), "in 3 days", "in 2 weeks".
 * A weekday means the next one AFTER today (on a Friday, "friday" is a week away; use "today" for today).
 * No times ("at 5pm") and no month dates: those are set in the task details.
 */

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** "in 400 days" is far more likely a typo or a number in a name than a plan, so it stays text */
const MAX_OFFSET_DAYS = 365;

const PHRASE = new RegExp(
  '\\s+(' +
    `(?:(?:on|by|this|next)\\s+)?(?:today|tomorrow|${WEEKDAYS.join('|')})` +
    '|next\\s+week' +
    '|in\\s+\\d{1,3}\\s+(?:days?|weeks?)' +
  ')[\\s.!?]*$',
  'i',
);

export interface TitleDate {
  /** The title without the date phrase */
  title: string;
  /** Midnight of the day the phrase stands for */
  dueDate: Date;
  /** The words that were taken out of the title, as typed */
  phrase: string;
}

/** Days from `now` to the next `weekday` (0 = Sunday), never 0 */
function daysUntilWeekday(now: Date, weekday: number): number {
  return ((weekday - getDay(now) + 7) % 7) || 7;
}

/** Finds a due date at the end of `title`. Returns null when there is none (the title is then used as typed). */
export function parseTitleDate(title: string, now: Date = new Date()): TitleDate | null {
  const match = PHRASE.exec(title);
  if (!match) return null;

  const phrase = match[1].toLowerCase().replace(/\s+/g, ' ');
  let offset: number;

  const relative = /^in (\d+) (day|week)s?$/.exec(phrase);
  if (relative) {
    offset = Number(relative[1]) * (relative[2] === 'week' ? 7 : 1);
    if (offset < 1 || offset > MAX_OFFSET_DAYS) return null;
  } else if (phrase === 'next week') {
    offset = daysUntilWeekday(now, 1);
  } else {
    const word = phrase.replace(/^(on|by|this|next) /, '');
    if (word === 'today') offset = 0;
    else if (word === 'tomorrow') offset = 1;
    else offset = daysUntilWeekday(now, WEEKDAYS.indexOf(word));
  }

  // What is left of the title, without a dangling comma or dash ("Call Mom, tomorrow")
  const rest = title.slice(0, match.index).replace(/[\s,;:–—-]+$/, '').trim();
  // "by friday" would leave the title "by"; with nothing real left, the words are the title
  if (!rest || /^(?:on|by|this|next|in|at|for)$/i.test(rest)) return null;

  return { title: rest, dueDate: startOfDay(addDays(now, offset)), phrase: match[1].trim() };
}

/**
 * The title and options a new task is created with: a due date found in the title replaces the view's own default
 * (the Planned view starts tasks due today), and everything else is passed through untouched.
 */
export function applyTitleDate<T extends object>(title: string, options: T, now: Date = new Date()): { title: string; options: T & { dueDate?: Date } } {
  const found = parseTitleDate(title.trim(), now);
  if (!found) return { title, options };
  return { title: found.title, options: { ...options, dueDate: found.dueDate } };
}
