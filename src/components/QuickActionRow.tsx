import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn.ts';
import { Tooltip } from './ui/Tooltip.tsx';

interface QuickActionRowProps {
  icon: ReactNode;
  /** Short name of the action ("Due date", "Reminder", ...). It stays the same whether or not the action is set. */
  label: string;
  /** Value shown under the label while the action is set (a date, "Weekly", ...). */
  detail?: ReactNode;
  /** The action is set: the tile is tinted blue and the icon turns blue. */
  active?: boolean;
  onClick: () => void;
  /** When given and the tile is active, a small clear (X) button is shown in its corner. */
  onClear?: () => void;
  clearLabel?: string;
  /** For tiles that open a picker. */
  expanded?: boolean;
  /** For tiles that switch something on and off (My Day). */
  pressed?: boolean;
}

/**
 * One tile of the "Quick actions" grid in the task details (two tiles per row). Every tile has the same
 * height, icon and "set" look, so due date, reminder, repeat and My Day read as one set. When an action is set
 * its value is written under the label and a small X in the corner clears it.
 *
 * Pitfalls guarded against: the label is short so it is never cut off beside the X; the value may wrap
 * instead of being cut (a date and time must be readable in full); the X is its own button next to, not
 * inside, the main button.
 */
export function QuickActionRow({ icon, label, detail, active = false, onClick, onClear, clearLabel, expanded, pressed }: QuickActionRowProps) {
  const showClear = active && !!onClear;
  return (
    <div
      className={cn(
        'relative flex rounded-xl border transition-colors duration-150',
        active
          ? 'bg-accent/10 border-accent/30'
          : 'bg-canvas border-line hover:border-muted'
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-expanded={expanded}
        aria-pressed={pressed}
        className={cn(
          'flex w-full min-w-0 items-center gap-2 min-h-14 px-2.5 py-2 text-left rounded-xl transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
          !active && 'hover:bg-hover'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors',
            active ? 'bg-accent/15 text-accent' : 'bg-hover text-muted'
          )}
        >
          {icon}
        </span>
        <span className="flex-1 min-w-0">
          <span className={cn('block truncate text-sm font-medium leading-5 text-ink', showClear && 'pr-5')}>{label}</span>
          {active && detail && (
            <span className="block break-words text-xs leading-4 text-accent mt-0.5">{detail}</span>
          )}
        </span>
      </button>

      {showClear && (
        <Tooltip label={clearLabel ?? 'Remove'} side="bottom">
          <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel ?? 'Remove'}
            className="absolute right-1 top-1 w-6 h-6 [@media(pointer:coarse)]:w-8 [@media(pointer:coarse)]:h-8 flex items-center justify-center rounded-full text-accent hover:bg-accent/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
