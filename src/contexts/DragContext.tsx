import { createContext } from 'react';

export interface DragContextType {
  isDragging: boolean;
  draggedTaskId: string | null;
}

export const DragContext = createContext<DragContextType | null>(null);
