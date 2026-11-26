import type { ReactNode } from 'react';
import { Star, Sun } from 'lucide-react';

interface EmptyViewMessageProps {
  view: string;
  /** Name of the tag that is filtering the page, when one is */
  tagName?: string;
}

const kbd = <kbd className="px-2 py-1 bg-hover rounded text-xs font-mono">N</kbd>;

/**
 * What the page says when it has no tasks. The smart pages (My Day, Important, Planned) say what they are for and
 * how a task gets into them, because their names alone don't: nobody can guess what "My Day" is.
 */
export function EmptyViewMessage({ view, tagName }: EmptyViewMessageProps) {
  let title = 'No tasks yet';
  let body: ReactNode = <>Use the "Add a task" bar below or press {kbd} to create your first task</>;

  if (tagName) {
    title = `Nothing tagged #${tagName} here`;
    body = 'Clear the filter above to see the other tasks in this view.';
  } else if (view === 'my-day') {
    title = 'Your plan for today';
    body = (
      <>
        My Day is a short list of what you want to get done today. Tasks due today show up here by themselves.
        To add any other task, tap its <Sun size={14} className="inline -mt-0.5" aria-hidden="true" /> sun button, or type one below.
        Tomorrow it starts empty again.
      </>
    );
  } else if (view === 'important') {
    title = 'No important tasks';
    body = (
      <>
        Tap the <Star size={14} className="inline -mt-0.5" aria-hidden="true" /> star on a task to mark it important and it appears here.
      </>
    );
  } else if (view === 'planned') {
    title = 'Nothing planned';
    body = 'Tasks with a due date or a reminder appear here, sorted by when they are due. Type a day at the end of a task, like "Call Mom tomorrow", to set one.';
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-48 py-6 text-muted">
      <div className="text-center max-w-md px-4">
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-sm">{body}</p>
      </div>
    </div>
  );
}
