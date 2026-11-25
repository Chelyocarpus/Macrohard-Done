import { useDroppable } from '@dnd-kit/core';
import { FolderOutput } from 'lucide-react';
import { cn } from '../utils/cn.ts';
import { UNGROUP_TARGET_ID } from '../utils/listDnd.ts';

/**
 * Shows while a list that is in a group is being dragged: a big, always-visible place to drop it to take it out of the group.
 * Sticks to the top of the scrolling sidebar so it stays in reach however far down the list is.
 */
export function UngroupDropTarget() {
  const { isOver, setNodeRef } = useDroppable({ id: UNGROUP_TARGET_ID });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'sticky top-0 z-10 mb-2 flex items-center justify-center gap-2 rounded-md border-2 border-dashed px-3 py-3 text-sm transition-colors',
        isOver ? 'border-accent bg-accent/10 text-ink' : 'border-line bg-canvas text-muted'
      )}
    >
      <FolderOutput size={16} aria-hidden="true" />
      <span>{isOver ? 'Release to take out of the group' : 'Drop here to take out of the group'}</span>
    </div>
  );
}
