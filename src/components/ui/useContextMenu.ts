import { useContext, type MouseEvent } from 'react';
import { ContextMenuContext } from './ContextMenuContext.ts';
import type { ContextMenuData } from './ContextMenu.tsx';

// Hook to access context menu functionality
export function useContextMenu() {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within a ContextMenuProvider');
  }
  return context;
}

// Hook for handling context menu on elements
export function useContextMenuHandler(getMenuData: (event: MouseEvent) => ContextMenuData | null) {
  const { show } = useContextMenu();

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const menuData = getMenuData(event);
    if (menuData) {
      show({
        ...menuData,
        x: event.clientX,
        y: event.clientY,
      });
    }
  };

  return handleContextMenu;
}
