import { useContext } from 'react';
import { DragContext } from './DragContext.tsx';

export const useDragContext = () => {
  return useContext(DragContext);
};
