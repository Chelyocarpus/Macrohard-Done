import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn.ts';
import { ContextMenuContext } from './ContextMenuContext.ts';
import { useEscapeKey } from '../../hooks/useEscapeKey.ts';

// Context Menu Types
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  divider?: boolean;
}

export interface ContextMenuSection {
  items: ContextMenuItem[];
}

export interface ContextMenuData {
  x: number;
  y: number;
  sections: ContextMenuSection[];
}

// Context Menu Provider
interface ContextMenuProviderProps {
  children: ReactNode;
}

export function ContextMenuProvider({ children }: ContextMenuProviderProps) {
  const [menuData, setMenuData] = useState<ContextMenuData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const show = (data: ContextMenuData) => {
    setMenuData(data);
    setIsVisible(true);
  };

  const hide = () => {
    setIsVisible(false);
    setMenuData(null);
  };

  // Escape closes the menu first: as the newest layer it is asked before a panel or dialog behind it
  useEscapeKey(isVisible, hide);

  // Handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        hide();
      }
    };

    // Named handler so the exact same function can be removed on cleanup
    // (an inline arrow would never match and the listener would leak on every open).
    const preventNativeContextMenu = (event: MouseEvent) => event.preventDefault();

    if (isVisible) {
      // pointerdown (not mousedown): iOS Safari only synthesizes mouse events for elements that
      // look clickable, so a tap on empty space would otherwise never close the menu.
      document.addEventListener('pointerdown', handleClickOutside);
      // Prevent default context menu
      document.addEventListener('contextmenu', preventNativeContextMenu);
    }

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('contextmenu', preventNativeContextMenu);
    };
  }, [isVisible]);

  // Adjust menu position to stay within viewport
  const getAdjustedPosition = (x: number, y: number) => {
    if (!menuRef.current) return { x, y };

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let adjustedX = x;
    let adjustedY = y;

    // Adjust horizontal position
    if (x + menuRect.width > viewport.width) {
      adjustedX = viewport.width - menuRect.width - 8;
    }

    // Adjust vertical position
    if (y + menuRect.height > viewport.height) {
      adjustedY = viewport.height - menuRect.height - 8;
    }

    return { x: Math.max(8, adjustedX), y: Math.max(8, adjustedY) };
  };

  const value = {
    show,
    hide,
    isVisible,
  };

  return (
    <ContextMenuContext.Provider value={value}>
      {children}
      {isVisible && menuData && createPortal(
        <ContextMenu
          ref={menuRef}
          data={menuData}
          onClose={hide}
          getAdjustedPosition={getAdjustedPosition}
        />,
        document.body
      )}
    </ContextMenuContext.Provider>
  );
}

// Context Menu Component
interface ContextMenuProps {
  data: ContextMenuData;
  onClose: () => void;
  getAdjustedPosition: (x: number, y: number) => { x: number; y: number };
}

const ContextMenu = React.forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ data, onClose, getAdjustedPosition }, ref) => {
    const [position, setPosition] = useState({ x: data.x, y: data.y });

    useEffect(() => {
      // Update position after render to ensure proper positioning
      const timer = setTimeout(() => {
        setPosition(getAdjustedPosition(data.x, data.y));
      }, 0);
      return () => clearTimeout(timer);
    }, [data.x, data.y, getAdjustedPosition]);

    const handleItemClick = (item: ContextMenuItem) => {
      if (!item.disabled) {
        item.onClick();
        onClose();
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Above the floating "Add a task" bar (z-50), which otherwise covers the bottom of the menu
          `fixed z-[70] min-w-[200px] bg-canvas rounded-lg shadow-lg border border-line`,
          "animate-in fade-in-0 zoom-in-95 duration-100"
        )}
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {/* Long menus (many lists or tags) scroll instead of running off the screen */}
        <div className="py-1 max-h-[min(70vh,28rem)] overflow-y-auto">
          {data.sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {section.items.map((item, itemIndex) => (
                <div key={item.id}>
                  {item.divider && itemIndex > 0 && (
                    <div className="my-1 h-px bg-line" />
                  )}
                  <button
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors",
                      "hover:bg-hover",
                      "focus:bg-hover focus:outline-none",
                      item.disabled && "opacity-50 cursor-not-allowed",
                      item.destructive && "text-overdue",
                      item.destructive && !item.disabled && "hover:bg-overdue/10"
                    )}
                  >
                    {item.icon && (
                      <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                        {item.icon}
                      </span>
                    )}
                    <span className="flex-1">{item.label}</span>
                  </button>
                </div>
              ))}
              {sectionIndex < data.sections.length - 1 && (
                <div className="my-1 h-px bg-line" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

ContextMenu.displayName = 'ContextMenu';
