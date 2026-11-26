import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { SORT_OPTIONS } from '../utils/taskSort.ts';
import { Tooltip } from './ui/Tooltip.tsx';
import { cn } from '../utils/cn.ts';
import type { TaskList } from '../types/index.ts';

interface ListOptionsMenuProps {
  list: TaskList;
}

/**
 * The "Sort and view options" button of a list: how its tasks are ordered, whether completed tasks
 * are shown, and whether new tasks are added at the top or the bottom. The choices are kept per list.
 */
export function ListOptionsMenu({ list }: ListOptionsMenuProps) {
  const updateList = useTaskStore((state) => state.updateList);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on a click outside or Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  const sortMode = list.sortMode ?? 'manual';
  const sortReverse = list.sortReverse === true;
  const showCompleted = list.showCompleted !== false;
  const addToTop = list.addToTop === true;

  const toggles = [
    { id: 'reverse', label: 'Reverse order', checked: sortReverse, onChange: () => updateList(list.id, { sortReverse: !sortReverse }) },
    { id: 'completed', label: 'Show completed tasks', checked: showCompleted, onChange: () => updateList(list.id, { showCompleted: !showCompleted }) },
    { id: 'top', label: 'Add new tasks to the top', checked: addToTop, onChange: () => updateList(list.id, { addToTop: !addToTop }) },
  ];

  return (
    <div ref={rootRef} className="relative">
      <Tooltip label="Sort and view options" side="bottom">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Sort and view options"
          aria-haspopup="true"
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
        >
          <SlidersHorizontal size={20} aria-hidden="true" />
        </button>
      </Tooltip>

      {open && (
        <div
          role="group"
          aria-label="Sort and view options"
          className="absolute right-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-canvas py-2 shadow-xl"
        >
          <div className="px-4 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted">Sort by</div>
          <div role="radiogroup" aria-label="Sort by">
            {SORT_OPTIONS.map((option) => {
              const selected = sortMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => updateList(list.id, { sortMode: option.value })}
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:bg-hover',
                    selected
                      ? 'font-medium text-accent'
                      : 'text-ink hover:bg-hover'
                  )}
                >
                  <span className="w-4 flex-shrink-0">{selected && <Check size={16} aria-hidden="true" />}</span>
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="my-2 border-t border-line" />

          {toggles.map((toggle) => (
            <button
              key={toggle.id}
              type="button"
              role="checkbox"
              aria-checked={toggle.checked}
              onClick={toggle.onChange}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink hover:bg-hover transition-colors focus:outline-none focus-visible:bg-hover"
            >
              <span className="w-4 flex-shrink-0">{toggle.checked && <Check size={16} aria-hidden="true" />}</span>
              {toggle.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
