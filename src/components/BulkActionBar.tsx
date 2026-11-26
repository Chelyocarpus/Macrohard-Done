import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { addDays, nextMonday, startOfDay } from 'date-fns';
import { CheckCircle2, Circle, Star, Sun, Calendar, Tag, FolderInput, Trash2, X, Check } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { useContextMenu } from './ui/useContextMenu.ts';
import type { ContextMenuItem } from './ui/ContextMenu.tsx';
import { bulkChange, bulkComplete, bulkDelete, bulkToggleFlag, checkAllVisible } from '../utils/bulkTasks.ts';
import { getVisibleTaskIds } from '../utils/taskDom.ts';
import { cn } from '../utils/cn.ts';

const BUTTON = 'flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-md px-2 text-sm text-ink transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-11';

interface BarButtonProps {
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  icon: ReactNode;
  /** Shown beside the icon on wider screens; the icon alone on a phone */
  text?: string;
  pressed?: boolean;
  menu?: boolean;
  destructive?: boolean;
}

function BarButton({ label, onClick, icon, text, pressed, menu, destructive }: BarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      aria-haspopup={menu ? 'menu' : undefined}
      title={label}
      onClick={onClick}
      className={cn(BUTTON, destructive && 'text-overdue hover:bg-overdue/10', pressed && 'bg-accent/10 text-accent')}
    >
      {icon}
      {text && <span className="hidden md:inline">{text}</span>}
    </button>
  );
}

/**
 * The bar that appears while tasks are selected (Ctrl/Shift+click, X, Ctrl+A): complete, important, My Day, due date,
 * tag, move, delete. It takes the place of the add bar. Everything goes through utils/bulkTasks.ts and the store's bulk
 * actions, so there is one Undo message per action, the same as for the keyboard.
 */
export function BulkActionBar() {
  const checkedIds = useUiStore((state) => state.checkedTaskIds);
  const tasks = useTaskStore((state) => state.tasks);
  const categories = useTaskStore((state) => state.categories);
  const lists = useTaskStore((state) => state.lists);
  const { show } = useContextMenu();
  const barRef = useRef<HTMLDivElement>(null);

  const checked = tasks.filter((task) => checkedIds.includes(task.id));
  const count = checked.length;
  const allDone = count > 0 && checked.every((task) => task.completed);
  const allImportant = count > 0 && checked.every((task) => task.important);
  const allMyDay = count > 0 && checked.every((task) => task.myDay);

  // Messages (Undo) sit above this bar instead of behind it, like they do above the add bar and the phone's bottom sheet
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || count === 0) return;
    let written = 0;
    const report = () => {
      written = Math.round(bar.getBoundingClientRect().height) + 16;
      useUiStore.getState().setBottomSheetFooterHeight(written);
    };
    report();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(report);
    observer?.observe(bar);
    return () => {
      observer?.disconnect();
      // Only undo what this bar wrote, so a bottom sheet that opened meanwhile keeps its own value
      if (useUiStore.getState().bottomSheetFooterHeight === written) useUiStore.getState().setBottomSheetFooterHeight(0);
    };
  }, [count > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (count === 0) return null;

  // A menu above the button (the bar is at the bottom of the screen): the menu is placed by its top-left corner
  const openMenu = (event: MouseEvent<HTMLButtonElement>, items: ContextMenuItem[]) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const height = Math.min(items.length * 40 + 16, window.innerHeight * 0.7);
    show({ x: rect.left, y: Math.max(8, rect.top - height - 8), sections: [{ items }] });
  };

  const dueMenu = (event: MouseEvent<HTMLButtonElement>) => {
    const today = startOfDay(new Date());
    openMenu(event, [
      { id: 'today', label: 'Today', icon: <Calendar size={16} />, onClick: () => bulkChange({ dueDate: today }) },
      { id: 'tomorrow', label: 'Tomorrow', icon: <Calendar size={16} />, onClick: () => bulkChange({ dueDate: addDays(today, 1) }) },
      { id: 'next-week', label: 'Next Monday', icon: <Calendar size={16} />, onClick: () => bulkChange({ dueDate: nextMonday(today) }) },
      { id: 'clear', label: 'Clear the due date', icon: <X size={16} />, onClick: () => bulkChange({ dueDate: null }) },
    ]);
  };

  const tagMenu = (event: MouseEvent<HTMLButtonElement>) => {
    if (categories.length === 0) {
      openMenu(event, [{ id: 'none', label: 'No tags yet. Create one in the task details.', onClick: () => {}, disabled: true }]);
      return;
    }
    openMenu(event, categories.map((category) => {
      const hasAll = checked.every((task) => task.categoryIds.includes(category.id));
      return {
        id: category.id,
        label: hasAll ? `Remove #${category.name}` : `Tag with #${category.name}`,
        icon: hasAll ? <Check size={16} /> : <Tag size={16} />,
        onClick: () => bulkChange(hasAll ? { removeTagIds: [category.id] } : { addTagIds: [category.id] }),
      };
    }));
  };

  const moveMenu = (event: MouseEvent<HTMLButtonElement>) => {
    const targets = [{ id: 'all', name: 'Tasks', emoji: undefined as string | undefined }, ...lists.filter((list) => !list.isSystem)];
    openMenu(event, targets.map((list) => ({
      id: list.id,
      label: list.name,
      icon: list.emoji ? <span aria-hidden="true">{list.emoji}</span> : <FolderInput size={16} />,
      // Nothing to move when they are all in that list already
      disabled: checked.every((task) => task.listId === list.id),
      onClick: () => bulkChange({ listId: list.id }),
    })));
  };

  const allShown = getVisibleTaskIds().length;

  return (
    <div className="pointer-events-none absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-50 flex justify-center">
      <div
        ref={barRef}
        role="toolbar"
        aria-label="Actions for the selected tasks"
        className="pointer-events-auto flex w-full flex-wrap items-center gap-0.5 rounded-[10px] border border-accent bg-canvas px-2 py-1.5 shadow-lg sm:w-auto"
      >
        <span role="status" aria-live="polite" className="px-2 text-sm font-semibold text-ink">
          {count} selected
        </span>
        <BarButton
          label={allDone ? 'Reopen the selected tasks' : 'Complete the selected tasks'}
          text={allDone ? 'Reopen' : 'Complete'}
          icon={allDone ? <Circle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
          onClick={() => bulkComplete()}
        />
        <BarButton
          label={allImportant ? 'Remove importance from the selected tasks' : 'Mark the selected tasks as important'}
          icon={<Star size={18} aria-hidden="true" className={allImportant ? 'fill-current' : ''} />}
          pressed={allImportant}
          onClick={() => bulkToggleFlag('important')}
        />
        <BarButton
          label={allMyDay ? 'Remove the selected tasks from My Day' : 'Add the selected tasks to My Day'}
          icon={<Sun size={18} aria-hidden="true" className={allMyDay ? 'fill-current' : ''} />}
          pressed={allMyDay}
          onClick={() => bulkToggleFlag('myDay')}
        />
        <BarButton label="Set the due date of the selected tasks" text="Due" icon={<Calendar size={18} aria-hidden="true" />} menu onClick={dueMenu} />
        <BarButton label="Tag the selected tasks" text="Tag" icon={<Tag size={18} aria-hidden="true" />} menu onClick={tagMenu} />
        <BarButton label="Move the selected tasks to a list" text="Move" icon={<FolderInput size={18} aria-hidden="true" />} menu onClick={moveMenu} />
        <BarButton label="Delete the selected tasks" text="Delete" icon={<Trash2 size={18} aria-hidden="true" />} destructive onClick={() => bulkDelete()} />
        <span className="mx-1 hidden h-6 w-px bg-line sm:inline-block" aria-hidden="true" />
        {count < allShown && (
          <button type="button" onClick={() => checkAllVisible()} className={cn(BUTTON, 'text-accent')}>
            Select all
          </button>
        )}
        <button type="button" onClick={() => useUiStore.getState().clearChecked()} className={cn(BUTTON, 'ml-auto sm:ml-0')} aria-label="Clear the selection" title="Clear the selection (Esc)">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
