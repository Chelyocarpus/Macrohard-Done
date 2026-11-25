import { DragOverlay } from '@dnd-kit/core';
import { List } from 'lucide-react';
import { cn } from '../utils/cn';
import { getListDisplayInfo, groupIconOverride } from '../utils/emojiUtils';
import { useTaskStore } from '../stores/taskStore';
import type { TaskList } from '../types';

interface ListDragOverlayProps {
  activeId: string | null;
  lists: TaskList[];
}

export function ListDragOverlay({ activeId, lists }: ListDragOverlayProps) {
  const listGroups = useTaskStore((state) => state.listGroups);
  const activeList = activeId ? lists.find(list => list.id === activeId) : null;

  if (!activeList) return null;

  const info = getListDisplayInfo(activeList);
  const displayName = info.displayName;
  const icon = groupIconOverride(listGroups.find((group) => group.id === activeList.groupId)) ?? info.icon;

  return (
    <DragOverlay>
      <div className={cn(
        'flex items-center px-3 py-1.5 text-sm bg-canvas border-2 border-accent rounded-lg shadow-xl',
        'transform rotate-1 scale-110 opacity-95',
        'backdrop-blur-sm bg-canvas/95'
      )}>
        {activeList.color && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
            style={{ backgroundColor: activeList.color }}
          />
        )}
        <div className={`flex items-center gap-2 flex-1 min-w-0 ${activeList.color ? 'ml-2' : ''}`}>
          {icon ? (
            <span className="text-sm">{icon}</span>
          ) : (
            <List size={14} className="text-accent" />
          )}
          <span className="flex-1 truncate text-ink font-medium">
            {displayName}
          </span>
          {/* Drag indicator */}
          <div className="flex flex-col gap-0.5 opacity-50">
            <div className="w-1 h-1 bg-muted rounded-full" />
            <div className="w-1 h-1 bg-muted rounded-full" />
            <div className="w-1 h-1 bg-muted rounded-full" />
          </div>
        </div>
      </div>
    </DragOverlay>
  );
}