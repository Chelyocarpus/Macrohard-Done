import { Fragment, type ReactNode } from 'react';
import { AlertTriangle, Bell, Calendar, ChevronDown, FileText, Repeat } from 'lucide-react';
import { isToday, isTomorrow } from 'date-fns';
import type { Category, RowDensity, Task, TaskList } from '../types/index.ts';
import { formatLongDate, formatLongDateTime, isOverdue } from '../utils/dateUtils.ts';
import { useDateTimePrefs } from '../stores/dateFormatStore.ts';
import { dueLabel, noteExcerpt, reminderLabel, repeatLabel, splitTags, stepSegments } from '../utils/taskMeta.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { useTaskStore } from '../stores/taskStore.ts';
import { cn } from '../utils/cn.ts';
import { CategoryBadge } from './CategoryBadge.tsx';

/**
 * The details under a task's title, grouped by the question each answers (see design/task-metadata-concept.html):
 *   When      due date (a filled, tinted pill), reminder and repeat (outlined pills)
 *   Progress  steps (a small segmented bar, opens the step list)
 * The note is not here: it is the description under the title (TaskDescription, below).
 *   Where     (TaskFooter, below) tags on the left, the list on the right, in a footer line across the card
 * Empty groups are left out, so a card with no details is just its title. Colour only where it means something:
 * overdue red, today in the accent; everything else stays muted.
 */
interface TaskMetaProps {
  task: Task;
  density: RowDensity;
  stepsOpen: boolean;
  onToggleSteps: () => void;
}

const MAX_TAGS: Record<RowDensity, number> = { compact: 2, comfortable: 3, minimal: 2 };

export function TaskMeta({ task, density, stepsOpen, onToggleSteps }: TaskMetaProps) {
  useDateTimePrefs(); // dates here follow the chosen style, so draw again when it changes
  const { completed, dueDate, reminder, steps } = task;
  const comfortable = density === 'comfortable';

  const overdue = !!dueDate && !completed && isOverdue(dueDate);
  const stepsDone = steps.filter((step) => step.completed).length;
  const repeat = repeatLabel(task);

  // Due, reminder and repeat are three pills of the same shape, each with its own icon and a word that says what
  // it is ("Due Friday", "Remind at 4:00 PM", "Weekly"), so a time next to a date is never taken for the due time.
  // Due is the filled one and the only one with colour: overdue red, today accent, the rest neutral. The word
  // "Overdue" and the warning icon are always shown too, so the meaning never rests on colour alone.
  const dueTone = completed
    ? 'bg-ink/[0.06] text-muted'
    : overdue ? 'bg-overdue/10 text-overdue font-medium'
    : dueDate && isToday(dueDate) ? 'bg-accent/10 text-accent'
    : dueDate && isTomorrow(dueDate) ? 'bg-ink/[0.06] text-ink'
    : 'bg-ink/[0.06] text-muted';
  const PILL = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full py-0.5 pl-1.5 pr-2';
  const OUTLINE_PILL = cn(PILL, 'border border-line py-px');

  const when: ReactNode[] = [
    dueDate ? (
      <span key="due" className={cn(PILL, dueTone)} title={`Due date: ${formatLongDate(dueDate)}`}>
        {overdue ? <AlertTriangle size={12} className="flex-shrink-0" aria-hidden="true" /> : <Calendar size={12} className="flex-shrink-0" aria-hidden="true" />}
        {dueLabel(dueDate, overdue)}
      </span>
    ) : null,
    reminder ? (
      <span key="reminder" className={OUTLINE_PILL} title={`Reminder: ${formatLongDateTime(reminder)}`}>
        <Bell size={12} className="flex-shrink-0" aria-hidden="true" />
        {reminderLabel(task)}
      </span>
    ) : null,
    repeat ? (
      <span key="repeat" className={OUTLINE_PILL} title={`Repeats: ${repeatLabel(task, true)}`}>
        <Repeat size={12} className="flex-shrink-0" aria-hidden="true" />
        <span className="sr-only">Repeats </span>
        {repeat}
      </span>
    ) : null,
  ].filter(Boolean);

  const { segments, filled } = stepSegments(stepsDone, steps.length);
  const allDone = steps.length > 0 && stepsDone === steps.length;
  const progress: ReactNode[] = [
    steps.length > 0 ? (
      <button
        key="steps"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSteps();
        }}
        aria-expanded={stepsOpen}
        title={`${stepsDone} of ${steps.length} steps done`}
        className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded transition-colors hover:text-ink', allDone && 'text-done hover:text-done')}
      >
        <span className="inline-flex gap-0.5" aria-hidden="true">
          {Array.from({ length: segments }, (_, index) => (
            <i key={index} className={cn('h-1 w-2 rounded-sm', index < filled ? 'bg-done' : 'bg-line')} />
          ))}
        </span>
        {stepsDone} of {steps.length}
        {comfortable && ' steps'}
        <span className="sr-only"> steps done</span>
        <ChevronDown size={12} className={cn('flex-shrink-0 transition-transform', stepsOpen && 'rotate-180')} aria-hidden="true" />
      </button>
    ) : null,
  ].filter(Boolean);

  // A line of details: items separated by a gap, wrapping when the card is narrow
  const line = (items: ReactNode[]) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((item, index) => <Fragment key={index}>{item}</Fragment>)}
    </div>
  );

  if (when.length === 0 && progress.length === 0) return null;

  return (
    <div className={cn('mt-1.5 space-y-1 text-xs leading-5 text-muted', completed && 'opacity-70')}>
      {when.length > 0 && line(when)}
      {progress.length > 0 && line(progress)}
    </div>
  );
}

/**
 * The note as a description under the title, like a subheader: smaller, muted, cut to one line (two in the
 * comfortable density), with the Markdown marks left out. The whole note is in the details panel and in the
 * tooltip. Renders nothing for an empty note.
 */
export function TaskDescription({ task, density }: { task: Pick<Task, 'notes' | 'completed'>; density: RowDensity }) {
  const text = noteExcerpt(task.notes);
  if (!text) return null;
  return (
    <p
      className={cn(
        'mt-0.5 text-[0.8125rem] leading-[1.35] text-muted',
        density === 'comfortable' ? 'line-clamp-2' : 'line-clamp-1',
        task.completed && 'opacity-70'
      )}
      title={task.notes}
    >
      <span className="sr-only">Note: </span>
      {text}
    </p>
  );
}

/** Opens a task's list, as the sidebar does (the default "Tasks" list is the "all" view) and clears any tag filter */
function openList(list: TaskList) {
  useUiStore.getState().setTagFilter(null);
  const { setView } = useTaskStore.getState();
  if (list.isSystem) setView('all');
  else setView('list', list.id);
}

interface TaskMinimalMetaProps {
  task: Task;
  list?: TaskList;
  listEmoji?: string;
  showList: boolean;
  categories: readonly Category[];
  stepsOpen: boolean;
  onToggleSteps: () => void;
}

/**
 * The minimal density's details: one muted line under the title, like Microsoft To Do. Steps ("Steps 1 of 3"), the
 * due date, small icons for a reminder, repeat and note, the first tags, and in views that mix lists the list's
 * name, separated by dots. No pills, no description and no footer rule, so a row stays one or two lines tall.
 * Only an overdue date gets colour (red, with the word "Overdue"). Renders nothing when there is nothing to show.
 */
export function TaskMinimalMeta({ task, list, listEmoji, showList, categories, stepsOpen, onToggleSteps }: TaskMinimalMetaProps) {
  useDateTimePrefs(); // dates here follow the chosen style, so draw again when it changes
  const { completed, dueDate, reminder, steps } = task;
  const overdue = !!dueDate && !completed && isOverdue(dueDate);
  const stepsDone = steps.filter((step) => step.completed).length;
  const repeat = repeatLabel(task);
  const hasNote = noteExcerpt(task.notes) !== '';
  const { shown, hidden } = splitTags(task.categoryIds, categories, MAX_TAGS.minimal);
  const listLabel = showList && list ? list : undefined;

  const items: ReactNode[] = [];

  if (steps.length > 0) {
    items.push(
      <button
        key="steps"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSteps();
        }}
        aria-expanded={stepsOpen}
        title={`${stepsDone} of ${steps.length} steps done`}
        className={cn('inline-flex items-center gap-0.5 whitespace-nowrap rounded transition-colors hover:text-ink', stepsDone === steps.length && 'text-done hover:text-done')}
      >
        Steps {stepsDone} of {steps.length}
        <ChevronDown size={12} className={cn('flex-shrink-0 transition-transform', stepsOpen && 'rotate-180')} aria-hidden="true" />
      </button>
    );
  }

  if (dueDate) {
    items.push(
      <span
        key="due"
        className={cn('inline-flex items-center gap-1 whitespace-nowrap', overdue && 'font-medium text-overdue')}
        title={`Due date: ${formatLongDate(dueDate)}`}
      >
        {overdue && <AlertTriangle size={12} className="flex-shrink-0" aria-hidden="true" />}
        {dueLabel(dueDate, overdue)}
      </span>
    );
  }

  if (reminder) {
    items.push(
      <span key="reminder" className="inline-flex items-center" title={`Reminder: ${formatLongDateTime(reminder)}`}>
        <Bell size={12} className="flex-shrink-0" aria-hidden="true" />
        <span className="sr-only">{reminderLabel(task)}</span>
      </span>
    );
  }

  if (repeat) {
    items.push(
      <span key="repeat" className="inline-flex items-center" title={`Repeats: ${repeatLabel(task, true)}`}>
        <Repeat size={12} className="flex-shrink-0" aria-hidden="true" />
        <span className="sr-only">Repeats {repeat}</span>
      </span>
    );
  }

  if (hasNote) {
    items.push(
      <span key="note" className="inline-flex items-center" title={task.notes}>
        <FileText size={12} className="flex-shrink-0" aria-hidden="true" />
        <span className="sr-only">Has a note</span>
      </span>
    );
  }

  if (shown.length > 0) {
    items.push(
      <span key="tags" className="inline-flex min-w-0 items-center gap-1.5">
        {shown.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              useUiStore.getState().setTagFilter(category.id);
            }}
            title={`Show tasks tagged ${category.name}`}
            className="max-w-[10rem] truncate rounded transition-colors hover:text-ink"
          >
            #{category.name}
          </button>
        ))}
        {hidden.length > 0 && (
          <span title={hidden.map((category) => `#${category.name}`).join(', ')}>
            +{hidden.length}
            <span className="sr-only"> more tags: {hidden.map((category) => category.name).join(', ')}</span>
          </span>
        )}
      </span>
    );
  }

  if (listLabel) {
    items.push(
      <button
        key="list"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openList(listLabel);
        }}
        title={`Open the list ${listLabel.name}`}
        aria-label={`Open list: ${listLabel.name}`}
        className="inline-flex min-w-0 max-w-[12rem] items-center gap-1 rounded transition-colors hover:text-ink"
      >
        {listEmoji && <span aria-hidden="true">{listEmoji}</span>}
        <span className="truncate">{listLabel.name}</span>
      </button>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className={cn('mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-5 text-muted', completed && 'opacity-70')}>
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && <span aria-hidden="true">·</span>}
          {item}
        </Fragment>
      ))}
    </div>
  );
}

interface TaskFooterProps {
  task: Task;
  list?: TaskList;
  listEmoji?: string;
  showList: boolean;
  categories: readonly Category[];
  density: RowDensity;
}

/**
 * Where: the card's footer line, across the full width of the card, under the title. Tags on the left (a click
 * shows only the tasks with that tag), and in views that mix lists the task's list on the right. Renders
 * nothing when there is neither.
 */
export function TaskFooter({ task, list, listEmoji, showList, categories, density }: TaskFooterProps) {
  const { shown, hidden } = splitTags(task.categoryIds, categories, MAX_TAGS[density]);
  const showListTag = showList && !!list;
  if (shown.length === 0 && !showListTag) return null;

  return (
    <div className={cn('mt-2 flex items-center gap-x-3 gap-y-1.5 border-t border-line pt-2 text-xs text-muted', task.completed && 'opacity-70')}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {shown.map((category) => (
          <CategoryBadge
            key={category.id}
            category={category}
            size="sm"
            onClick={() => useUiStore.getState().setTagFilter(category.id)}
          />
        ))}
        {hidden.length > 0 && (
          <span
            className="inline-flex items-center rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted"
            title={hidden.map((category) => `#${category.name}`).join(', ')}
          >
            +{hidden.length}
            <span className="sr-only"> more tags: {hidden.map((category) => category.name).join(', ')}</span>
          </span>
        )}
      </div>
      {showListTag && list && (
        // A link to the list: opens it, as the sidebar does (the default "Tasks" list is the "all" view)
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openList(list);
          }}
          title={`Open the list ${list.name}`}
          aria-label={`Open list: ${list.name}`}
          className="ml-auto inline-flex min-w-0 max-w-[50%] flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 -mr-1.5 transition-colors hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-0"
        >
          {/* A small dot in the list's colour (when it has one), so tasks from different lists tell apart at a glance */}
          {list.color && <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: list.color }} />}
          {listEmoji && <span aria-hidden="true">{listEmoji}</span>}
          <span className="truncate">{list.name}</span>
        </button>
      )}
    </div>
  );
}
