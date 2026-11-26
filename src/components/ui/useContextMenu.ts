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

/**
 * Same menu as `useContextMenuHandler`, but opened from a visible "more" button.
 *
 * Right-click does not exist on phones and tablets (and long-press is unreliable on iOS Safari), so
 * every right-click menu also needs a button. The menu is anchored under the button rather than at
 * the pointer, which also makes it work for keyboard activation (where the pointer position is 0,0).
 */
export function useContextMenuButtonHandler(getMenuData: (event: MouseEvent<HTMLElement>) => ContextMenuData | null) {
  const { show } = useContextMenu();

  return (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const menuData = getMenuData(event);
    if (!menuData) return;

    const rect = event.currentTarget.getBoundingClientRect();
    show({
      ...menuData,
      // Right edge of the button; the provider shifts the menu back inside the viewport if needed
      x: rect.right - 200,
      y: rect.bottom + 4,
    });
  };
}
