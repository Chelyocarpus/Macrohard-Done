import { useMemo, useState } from 'react';
import { Lightbulb, ChevronDown, ChevronRight, Plus, Star, AlertTriangle } from 'lucide-react';
import { startOfDay } from 'date-fns';
import { useTaskStore } from '../stores/taskStore.ts';
import { formatDate } from '../utils/dateUtils.ts';
import { useDateTimePrefs } from '../stores/dateFormatStore.ts';
import { cn } from '../utils/cn.ts';

// A long backlog must not turn the panel into a second task list
const MAX_SUGGESTIONS = 20;

/**
 * "Suggestions" at the top of My Day: open tasks that are overdue or important and not in My Day yet,
 * each with a button that adds it. Tasks due today are not listed here because My Day already
 * shows them on its own. The panel is collapsed until opened.
 */
export function MyDaySuggestions() {
  useDateTimePrefs(); // dates here follow the chosen style, so draw again when it changes
  const tasks = useTaskStore((state) => state.tasks);
  const toggleMyDay = useTaskStore((state) => state.toggleMyDay);
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const today = startOfDay(new Date()).getTime();
    const dueTime = (task: (typeof tasks)[number]) => (task.dueDate ? new Date(task.dueDate).getTime() : NaN);
    const isOverdue = (task: (typeof tasks)[number]) => dueTime(task) < today; // NaN (no date) is never overdue

    return tasks
      .filter((task) => !task.completed && !task.myDay && (isOverdue(task) || task.important))
      .sort((a, b) => {
        // Overdue first (oldest first), then the important ones
        const overdueDiff = Number(isOverdue(b)) - Number(isOverdue(a));
        if (overdueDiff !== 0) return overdueDiff;
        if (isOverdue(a) && isOverdue(b)) return dueTime(a) - dueTime(b);
        return a.order - b.order;
      })
      .slice(0, MAX_SUGGESTIONS)
      .map((task) => ({ task, overdue: isOverdue(task) }));
  }, [tasks]);

  if (suggestions.length === 0) return null;

  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <section aria-label="Suggestions" className="px-3 sm:px-0 mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl border border-line bg-canvas px-3 sm:px-4 py-3 text-left text-sm font-medium text-ink shadow-sm hover:bg-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Lightbulb size={18} className="text-accent" aria-hidden="true" />
        <span className="flex-1">Suggestions</span>
        <span className="text-xs font-normal text-muted">{suggestions.length}</span>
        <Chevron size={18} className="text-muted" aria-hidden="true" />
      </button>

      {open && (
        <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-canvas shadow-sm overflow-hidden">
          {suggestions.map(({ task, overdue }) => (
            <li key={task.id} className="flex items-center gap-3 pl-3 sm:pl-4 pr-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{task.title}</div>
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    overdue ? 'text-overdue' : 'text-muted'
                  )}
                >
                  {overdue ? (
                    <>
                      <AlertTriangle size={12} aria-hidden="true" />
                      Overdue{task.dueDate ? `: ${formatDate(new Date(task.dueDate))}` : ''}
                    </>
                  ) : (
                    <>
                      <Star size={12} className="fill-current text-important" aria-hidden="true" />
                      Important
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleMyDay(task.id)}
                aria-label={`Add "${task.title}" to My Day`}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-accent hover:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
              >
                <Plus size={20} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
