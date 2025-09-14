import { createContext } from 'react';
import type { TaskList } from '../types';

export interface DragContextType {
  isDragging: boolean;
  draggedTaskId: string | null;
  draggedList: TaskList | null;
  dragOverlay: React.ReactNode | null;
  dropTarget: DropTarget | null;
  setDraggedList: (list: TaskList | null) => void;
  setDragOverlay: (overlay: React.ReactNode | null) => void;
  setDropTarget: (target: DropTarget | null) => void;
}

export interface DropTarget {
  type: 'group' | 'position' | 'ungroup';
  groupId?: string | null;
  position?: number;
  beforeListId?: string;
  afterListId?: string;
}

export const DragContext = createContext<DragContextType | null>(null);
