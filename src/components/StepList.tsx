import { useState } from 'react';
import { Plus, MoreVertical, Trash2, ArrowUpRight, Check, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../utils/cn.ts';
import { Tooltip } from './ui/Tooltip.tsx';
import { useContextMenuButtonHandler } from './ui/useContextMenu.ts';
import type { ContextMenuData } from './ui/ContextMenu.tsx';

export interface StepListItem {
  id: string;
  title: string;
  completed: boolean;
}

interface StepListProps {
  steps: StepListItem[];
  onAdd: (title: string) => void;
  onDelete: (stepId: string) => void;
  /** Omit when steps can't be ticked yet (a task that hasn't been created). */
  onToggle?: (stepId: string) => void;
  /** Omit when a step can't become a task yet. */
  onConvertToTask?: (stepId: string) => void;
  /** Moves a step one place up (-1) or down (1). Omit to hide the "Move" items. */
  onMove?: (stepId: string, direction: -1 | 1) => void;
}

/**
 * The steps of a task as a flat list (round checkbox, text, "more" menu) with a blue "Next step"
 * row at the end, the way Microsoft To Do shows them. It sits inside the task's title card.
 */
export function StepList({ steps, onAdd, onDelete, onToggle, onConvertToTask, onMove }: StepListProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  // Adds the typed step. Keeps the field open and empty so several steps can be typed in a row.
  const commit = () => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft('');
  };

  const close = () => {
    setAdding(false);
    setDraft('');
  };

  return (
    <div className="divide-y divide-line">
      {steps.map((step, index) => (
        <StepRow
          key={step.id}
          step={step}
          onToggle={onToggle}
          onDelete={onDelete}
          onConvertToTask={onConvertToTask}
          onMove={onMove}
          isFirst={index === 0}
          isLast={index === steps.length - 1}
        />
      ))}

      {adding ? (
        <div className="flex items-center gap-3 px-3 sm:px-4 min-h-11">
          <span aria-hidden="true" className="w-5 h-5 rounded-full border-2 border-line flex-shrink-0" />
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close();
              }
            }}
            // Leaving the field with text in it keeps that text as a step instead of throwing it away
            onBlur={() => {
              commit();
              close();
            }}
            placeholder="Add a step"
            aria-label="New step"
            className="flex-1 min-w-0 bg-transparent py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full flex items-center gap-3 px-3 sm:px-4 min-h-11 text-left text-sm font-medium text-accent hover:bg-accent/10 rounded-b-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        >
          <Plus size={20} className="flex-shrink-0" aria-hidden="true" />
          {steps.length > 0 ? 'Next step' : 'Add step'}
        </button>
      )}
    </div>
  );
}

interface StepRowProps {
  step: StepListItem;
  onToggle?: (stepId: string) => void;
  onDelete: (stepId: string) => void;
  onConvertToTask?: (stepId: string) => void;
  onMove?: (stepId: string, direction: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}

function StepRow({ step, onToggle, onDelete, onConvertToTask, onMove, isFirst, isLast }: StepRowProps) {
  const getMenu = (): ContextMenuData => ({
    x: 0,
    y: 0,
    sections: [
      ...(onMove && !(isFirst && isLast)
        ? [{
            items: [
              {
                id: 'move-up',
                label: 'Move up',
                icon: <ArrowUp size={16} />,
                disabled: isFirst,
                onClick: () => onMove(step.id, -1),
              },
              {
                id: 'move-down',
                label: 'Move down',
                icon: <ArrowDown size={16} />,
                disabled: isLast,
                onClick: () => onMove(step.id, 1),
              },
            ],
          }]
        : []),
      {
        items: [
          ...(onConvertToTask
            ? [{
                id: 'convert',
                label: 'Convert to task',
                icon: <ArrowUpRight size={16} />,
                onClick: () => onConvertToTask(step.id),
              }]
            : []),
          {
            id: 'delete',
            label: 'Delete step',
            icon: <Trash2 size={16} />,
            destructive: true,
            onClick: () => onDelete(step.id),
          },
        ],
      },
    ],
  });
  const handleMenuClick = useContextMenuButtonHandler(getMenu);

  return (
    <div className="flex items-start gap-3 pl-3 sm:pl-4 pr-1 min-h-11">
      <button
        type="button"
        onClick={onToggle ? () => onToggle(step.id) : undefined}
        disabled={!onToggle}
        role="checkbox"
        aria-checked={step.completed}
        aria-label={step.completed ? `Mark step "${step.title}" as not done` : `Mark step "${step.title}" as done`}
        className={cn(
          'mt-3 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
          step.completed
            ? 'bg-accent border-accent text-on-accent'
            : 'border-line',
          onToggle && !step.completed && 'hover:border-accent',
          !onToggle && 'cursor-default'
        )}
      >
        {step.completed && <Check size={12} strokeWidth={3} aria-hidden="true" />}
      </button>

      <div
        className={cn(
          'flex-1 min-w-0 py-2.5 text-sm leading-snug whitespace-pre-wrap [overflow-wrap:anywhere]',
          step.completed ? 'line-through text-muted' : 'text-ink'
        )}
      >
        {step.title}
      </div>

      <Tooltip label="More actions" side="bottom">
        <button
          type="button"
          onClick={handleMenuClick}
          aria-label={`More actions for step "${step.title}"`}
          aria-haspopup="menu"
          className="mt-1 w-9 h-9 flex items-center justify-center rounded-full text-muted hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent flex-shrink-0 transition-colors"
        >
          <MoreVertical size={18} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
}
