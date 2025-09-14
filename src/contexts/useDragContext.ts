import { useContext } from 'react';
import { DragContext, type DragContextType } from './DragContext.tsx';

export const useDragContext = (): DragContextType => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDragContext must be used within a DragProvider');
  }
  return context;
};
