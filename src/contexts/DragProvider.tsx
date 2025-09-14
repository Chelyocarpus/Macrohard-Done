import { useState, useCallback } from 'react';
import { DragContext, type DragContextType, type DropTarget } from './DragContext.tsx';
import type { TaskList } from '../types';

interface DragProviderProps {
  children: React.ReactNode;
}

export function DragProvider({ children }: DragProviderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedList, setDraggedListState] = useState<TaskList | null>(null);
  const [dragOverlay, setDragOverlay] = useState<React.ReactNode | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const setDraggedList = useCallback((list: TaskList | null) => {
    setDraggedListState(list);
    setIsDragging(!!list);
  }, []);

  const contextValue: DragContextType = {
    isDragging,
    draggedTaskId: null, // Keep for backward compatibility, but not used for list drag
    draggedList,
    dragOverlay,
    dropTarget,
    setDraggedList,
    setDragOverlay,
    setDropTarget,
  };

  return (
    <DragContext.Provider value={contextValue}>
      {children}
    </DragContext.Provider>
  );
}