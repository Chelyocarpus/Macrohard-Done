import { DragOverlay } from '@dnd-kit/core';
import { List } from 'lucide-react';
import { cn } from '../utils/cn';
import { getListDisplayInfo } from '../utils/emojiUtils';
import type { TaskList } from '../types';

interface ListDragOverlayProps {
  activeId: string | null;
  lists: TaskList[];
}

export function ListDragOverlay({ activeId, lists }: ListDragOverlayProps) {
  const activeList = activeId ? lists.find(list => list.id === activeId) : null;

  if (!activeList) return null;

  const { displayName, icon } = getListDisplayInfo(activeList);

  return (
    <DragOverlay>
      <div className={cn(
        'flex items-center px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-600 rounded-lg shadow-xl',
        'transform rotate-1 scale-110 opacity-95',
        'backdrop-blur-sm bg-white/95 dark:bg-gray-800/95'
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
            <List size={14} className="text-blue-500" />
          )}
          <span className="flex-1 truncate text-gray-900 dark:text-gray-100 font-medium">
            {displayName}
          </span>
          {/* Drag indicator */}
          <div className="flex flex-col gap-0.5 opacity-50">
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
          </div>
        </div>
      </div>
    </DragOverlay>
  );
}