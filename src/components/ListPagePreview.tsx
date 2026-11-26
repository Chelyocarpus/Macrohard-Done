import { List, Plus } from 'lucide-react';
import { onColor } from '../utils/color.ts';

interface ListPagePreviewProps {
  name: string;
  emoji: string;
  color: string;
}

/**
 * A small picture of the list's page in its color: the header with the icon tile, two task rows, and the add button.
 * It uses the same tints as the real page (a faint wash, a tinted tile, a filled add button), so what you see is what you get.
 */
export function ListPagePreview({ name, emoji, color }: ListPagePreviewProps) {
  return (
    <div
      role="img"
      aria-label={`Preview of the page for ${name.trim() || 'the list'}`}
      className="overflow-hidden rounded-xl border border-line"
      style={{ backgroundColor: `${color}09` }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line p-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl leading-none"
          style={{ backgroundColor: `${color}24` }}
        >
          {emoji || <List size={20} style={{ color }} />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">{name.trim() || 'List name'}</p>
          <p className="text-xs text-muted">2 open tasks</p>
        </div>
      </div>

      {/* Two sample task rows */}
      <div aria-hidden="true">
        {[64, 44].map((width) => (
          <div key={width} className="flex items-center gap-3 border-b border-line px-3 py-2.5">
            <span className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-muted/60" />
            <span className="h-2 rounded-full bg-line" style={{ width: `${width}%` }} />
          </div>
        ))}
      </div>

      {/* The add button */}
      <div aria-hidden="true" className="p-3">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas p-1.5 shadow-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: color, color: onColor(color) }}>
            <Plus size={14} strokeWidth={2.5} />
          </span>
          <span className="text-xs text-muted">Add a task</span>
        </div>
      </div>
    </div>
  );
}
