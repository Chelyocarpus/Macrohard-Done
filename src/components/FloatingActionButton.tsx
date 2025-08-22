import { useState, useRef, useEffect } from 'react';
import { Plus, List, Users, Edit3 } from 'lucide-react';
import { Button } from './ui/Button.tsx';
import { cn } from '../utils/cn.ts';
import { useTaskStore } from '../stores/taskStore.ts';

interface FloatingActionButtonProps {
  onQuickAdd: () => void;
  onFullTaskForm: () => void;
  onNewList: () => void;
  onNewGroup: () => void;
  onInlineTaskCreate?: (title: string) => void;
  className?: string;
  currentListColor?: string;
  isAnySidebarOpen?: boolean;
  rightSidebarWidth?: number; // Width of the right sidebar in pixels (if open)
}

interface ActionMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

export function FloatingActionButton({ 
  onQuickAdd, 
  onFullTaskForm, 
  onNewList, 
  onNewGroup,
  onInlineTaskCreate,
  className,
  currentListColor,
  isAnySidebarOpen = false,
  rightSidebarWidth = 400
}: FloatingActionButtonProps) {
  const { sidebarCollapsed } = useTaskStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [isQuickAddMode, setIsQuickAddMode] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const menuItems: ActionMenuItem[] = [
    {
      id: 'task',
      label: 'Full Task Form',
      icon: <Edit3 size={18} />,
      onClick: () => {
        onFullTaskForm();
        setIsMenuOpen(false);
      },
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'list',
      label: 'New List',
      icon: <List size={18} />,
      onClick: () => {
        onNewList();
        setIsMenuOpen(false);
      },
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'group',
      label: 'New Group',
      icon: <Users size={18} />,
      onClick: () => {
        onNewGroup();
        setIsMenuOpen(false);
      },
      color: 'from-purple-500 to-purple-600'
    }
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close if clicking outside the entire FAB container
      const fabContainer = document.querySelector('[data-fab-container]');
      if (fabContainer && !fabContainer.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsQuickAddMode(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when quick add mode is activated
  useEffect(() => {
    if (isQuickAddMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isQuickAddMode]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsMenuOpen(false);
      setIsQuickAddMode(false);
      setQuickAddText('');
    }
  };

  const handleMainButtonClick = () => {
    if (!isQuickAddMode) {
      setIsQuickAddMode(true);
    }
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleQuickAdd = () => {
    if (quickAddText.trim()) {
      // Create task directly inline if handler is provided
      if (onInlineTaskCreate) {
        onInlineTaskCreate(quickAddText.trim());
        setQuickAddText('');
        setIsQuickAddMode(false);
      } else {
        // Fallback to opening modal
        onQuickAdd();
        setQuickAddText('');
        setIsQuickAddMode(false);
      }
    }
  };

  const handleQuickAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd();
    } else if (e.key === 'Escape') {
      setIsQuickAddMode(false);
      setQuickAddText('');
    }
  };

  // Generate colors based on current list color or use default
  const getGradientColors = () => {
    if (currentListColor) {
      // Convert hex to RGB for gradient variations
      const lightenColor = (color: string, factor: number) => {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
        const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
        const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
        
        return `rgb(${newR}, ${newG}, ${newB})`;
      };
      
      const darkenColor = (color: string, factor: number) => {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const newR = Math.floor(r * (1 - factor));
        const newG = Math.floor(g * (1 - factor));
        const newB = Math.floor(b * (1 - factor));
        
        return `rgb(${newR}, ${newG}, ${newB})`;
      };

      const baseColor = currentListColor;
      const lightColor = lightenColor(baseColor, 0.1);
      const darkColor = darkenColor(baseColor, 0.2);
      
      return {
        background: `linear-gradient(to right, ${baseColor}, ${lightColor}, ${darkColor})`,
        hoverBackground: `linear-gradient(to right, ${darkenColor(baseColor, 0.1)}, ${baseColor}, ${darkenColor(baseColor, 0.3)})`
      };
    }
    
    // Default blue-purple gradient
    return {
      background: 'linear-gradient(to right, rgb(37, 99, 235), rgb(29, 78, 216), rgb(126, 34, 206))',
      hoverBackground: 'linear-gradient(to right, rgb(29, 78, 216), rgb(30, 64, 175), rgb(107, 33, 168))'
    };
  };

  const gradientColors = getGradientColors();

  // Calculate responsive positioning
  const getRightMargin = () => {
    if (isAnySidebarOpen) {
      // Add 24px margin to the sidebar width
      return `${rightSidebarWidth + 24}px`;
    }
    return '24px'; // Default 6 (1.5rem = 24px)
  };

  return (
    <div 
      className={cn(
        "fixed bottom-6 z-50 transition-all duration-150", // Reduced from duration-300 to duration-150 for faster animation that matches instant sidebars
        // Position FAB to respect left sidebar width with modern spacing
        sidebarCollapsed ? "left-24" : "left-72", // 24 = 6rem (96px) for collapsed + margin, 72 = 18rem (288px) for expanded + margin
        className
      )}
      style={{
        right: getRightMargin()
      }}
      onKeyDown={handleKeyDown}
      data-fab-container
    >
      {/* Menu Items */}
      {isMenuOpen && (
        <div 
          ref={menuRef}
          className="mb-4 flex justify-center gap-3 animate-in slide-in-from-bottom-2 duration-200"
        >
          {menuItems.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col items-center gap-2 animate-in slide-in-from-bottom-2 duration-200"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Button
                onClick={item.onClick}
                className={cn(
                  "h-12 w-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200",
                  "transform hover:scale-105 border-0 text-white",
                  `bg-gradient-to-r ${item.color} hover:brightness-110`
                )}
              >
                {item.icon}
              </Button>
              
              <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-2 py-1 rounded text-xs font-medium shadow-lg whitespace-nowrap">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB Bar */}
      <div className="relative">
        <div
          className={cn(
            "h-14 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-150", // Reduced from duration-300 to duration-150
            "transform hover:scale-[1.02] border-0 text-white relative overflow-hidden cursor-pointer",
            "flex items-center gap-3 px-6"
          )}
          style={{
            background: gradientColors.background,
            transition: 'all 0.15s ease' // Reduced from 0.3s to 0.15s
          }}
          onMouseEnter={(e) => {
            setIsHovered(true);
            e.currentTarget.style.background = gradientColors.hoverBackground;
          }}
          onMouseLeave={(e) => {
            setIsHovered(false);
            e.currentTarget.style.background = gradientColors.background;
          }}
          onClick={handleMainButtonClick}
        >
          <div className="flex-1">
            {isQuickAddMode ? (
              <input
                ref={inputRef}
                value={quickAddText}
                onChange={(e) => setQuickAddText(e.target.value)}
                onKeyDown={handleQuickAddKeyDown}
                placeholder="What needs to be done?"
                className="w-full bg-transparent text-white placeholder-white/70 border-none outline-none text-lg font-medium"
              />
            ) : (
              <div className="w-full text-left text-lg font-medium text-white/90">
                Add a task...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isQuickAddMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickAdd();
                }}
                disabled={!quickAddText.trim()}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMenuToggle(e);
              }}
              className={cn(
                "h-8 w-8 rounded-lg transition-all duration-200 flex items-center justify-center",
                "bg-white/20 hover:bg-white/30",
                isMenuOpen && "bg-red-500/80 hover:bg-red-500"
              )}
              title={isMenuOpen ? "Close menu" : "More options"}
            >
              <Plus 
                size={16} 
                className={cn(
                  "transition-transform duration-200",
                  isMenuOpen ? "rotate-45" : "rotate-0"
                )}
              />
            </button>
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 transform -skew-x-12" />
        </div>

        {isHovered && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/30 rounded-full animate-ping"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${30 + Math.random() * 40}%`,
                  animationDelay: `${Math.random() * 2000}ms`,
                  animationDuration: '3s'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
