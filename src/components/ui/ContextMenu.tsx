import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn.ts';
import { ContextMenuContext } from './ContextMenuContext.ts';

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

  // Handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        hide();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hide();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      // Prevent default context menu
      document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('contextmenu', (e) => e.preventDefault());
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
          "fixed z-40 min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700",
          "animate-in fade-in-0 zoom-in-95 duration-100"
        )}
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <div className="py-1">
          {data.sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {section.items.map((item, itemIndex) => (
                <div key={item.id}>
                  {item.divider && itemIndex > 0 && (
                    <div className="my-1 h-px bg-gray-200 dark:bg-gray-600" />
                  )}
                  <button
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors",
                      "hover:bg-gray-100 dark:hover:bg-gray-700",
                      "focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none",
                      item.disabled && "opacity-50 cursor-not-allowed",
                      item.destructive && "text-red-600 dark:text-red-400",
                      item.destructive && !item.disabled && "hover:bg-red-50 dark:hover:bg-red-900/20"
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
                <div className="my-1 h-px bg-gray-200 dark:bg-gray-600" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

ContextMenu.displayName = 'ContextMenu';
