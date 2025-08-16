import { createContext } from 'react';
import type { ContextMenuData } from './ContextMenu.tsx';

// Context Menu Context
export interface ContextMenuContextType {
  show: (data: ContextMenuData) => void;
  hide: () => void;
  isVisible: boolean;
}

export const ContextMenuContext = createContext<ContextMenuContextType | null>(null);
