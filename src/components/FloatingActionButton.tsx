import { useState, useRef, useEffect } from 'react';
import { cn } from '../utils/cn.ts';

interface FloatingActionButtonProps {
  onQuickAdd: () => void;
  onInlineTaskCreate?: (title: string) => void;
  className?: string;
  currentListColor?: string;
  // Immediate state-based positioning (not waiting for DOM)
  isAnySidebarOpening?: boolean;
}

export function FloatingActionButton({ 
  onQuickAdd, 
  onInlineTaskCreate,
  className,
  currentListColor,
  isAnySidebarOpening = false
}: FloatingActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [isQuickAddMode, setIsQuickAddMode] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fabContainerRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Use component ref instead of global query selector for robustness
      if (fabContainerRef.current && !fabContainerRef.current.contains(event.target as Node)) {
        setIsQuickAddMode(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ref callback to focus input when it's mounted
  const inputRefCallback = (element: HTMLInputElement | null) => {
    inputRef.current = element;
    // Focus the input immediately when it's mounted in quick add mode
    if (element && isQuickAddMode) {
      element.focus();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsQuickAddMode(false);
      setQuickAddText('');
    }
  };

  const handleMainButtonClick = () => {
    console.log('Main FAB clicked', { isQuickAddMode });
    if (!isQuickAddMode) {
      setIsQuickAddMode(true);
    }
  };

  const handleQuickAdd = () => {
    console.log('Quick add clicked', { quickAddText });
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
      // Validate hex color format
      const isValidHex = (color: string): boolean => {
        return /^#[0-9A-Fa-f]{6}$/.test(color);
      };

      // Convert hex to RGB with validation
      const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
        if (!isValidHex(hex)) {
          return null;
        }
        
        const cleanHex = hex.replace('#', '');
        const r = parseInt(cleanHex.substr(0, 2), 16);
        const g = parseInt(cleanHex.substr(2, 2), 16);
        const b = parseInt(cleanHex.substr(4, 2), 16);
        
        // Check for NaN values
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
          return null;
        }
        
        return { r, g, b };
      };

      // Convert hex to RGB for gradient variations
      const lightenColor = (color: string, factor: number) => {
        const rgb = hexToRgb(color);
        if (!rgb) {
          console.warn(`Invalid hex color format: ${color}. Using fallback color.`);
          return 'rgb(59, 130, 246)'; // Default blue
        }
        
        const { r, g, b } = rgb;
        const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
        const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
        const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
        
        return `rgb(${newR}, ${newG}, ${newB})`;
      };
      
      const darkenColor = (color: string, factor: number) => {
        const rgb = hexToRgb(color);
        if (!rgb) {
          console.warn(`Invalid hex color format: ${color}. Using fallback color.`);
          return 'rgb(29, 78, 216)'; // Default dark blue
        }
        
        const { r, g, b } = rgb;
        const newR = Math.floor(r * (1 - factor));
        const newG = Math.floor(g * (1 - factor));
        const newB = Math.floor(b * (1 - factor));
        
        return `rgb(${newR}, ${newG}, ${newB})`;
      };

      // Validate the base color before processing
      if (!isValidHex(currentListColor)) {
        console.warn(`Invalid hex color format: ${currentListColor}. Using default gradient.`);
        // Fall through to default gradient
      } else {
        const baseColor = currentListColor;
        const lightColor = lightenColor(baseColor, 0.1);
        const darkColor = darkenColor(baseColor, 0.2);
        
        return {
          background: `linear-gradient(to right, ${baseColor}, ${lightColor}, ${darkColor})`,
          hoverBackground: `linear-gradient(to right, ${darkenColor(baseColor, 0.1)}, ${baseColor}, ${darkenColor(baseColor, 0.3)})`
        };
      }
    }
    
    // Default blue-purple gradient
    return {
      background: 'linear-gradient(to right, rgb(37, 99, 235), rgb(29, 78, 216), rgb(126, 34, 206))',
      hoverBackground: 'linear-gradient(to right, rgb(29, 78, 216), rgb(30, 64, 175), rgb(107, 33, 168))'
    };
  };

  const gradientColors = getGradientColors();

  // Detect right sidebars by checking DOM
  useEffect(() => {
    const checkRightSidebars = () => {
      // Look for common sidebar selectors in the DOM
      const rightSidebars = document.querySelectorAll('div[class*="w-96"], div[class*="w-[400px]"]');
      let maxWidth = 0;
      
      rightSidebars.forEach((sidebar) => {
        const rect = sidebar.getBoundingClientRect();
        // Check if it's positioned on the right side of the screen
        if (rect.right > window.innerWidth - 100 && rect.width > maxWidth) {
          maxWidth = rect.width;
        }
      });
      
      setRightSidebarWidth(maxWidth);
    };

    // Initial check
    checkRightSidebars();
    
    // Use MutationObserver for instant detection of DOM changes
    const observer = new MutationObserver(() => {
      checkRightSidebars();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    // Fallback interval for edge cases (much faster)
    const interval = setInterval(checkRightSidebars, 50); // Very fast: 50ms
    
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Calculate right margin based on immediate state and detected sidebar width
  const getRightMargin = () => {
    // Immediate response to sidebar opening (before DOM is updated)
    if (isAnySidebarOpening) {
      return 'right-[424px]'; // 400px sidebar + 24px margin for better spacing
    }
    
    // DOM-based detection for precise sizing when available
    if (rightSidebarWidth >= 400) {
      return 'right-[424px]'; // For 400px sidebars + 24px margin
    }
    if (rightSidebarWidth >= 384) {
      return 'right-[408px]'; // For 384px sidebars + 24px margin
    }
    if (rightSidebarWidth > 0) {
      return 'right-24'; // Generic margin for smaller sidebars
    }
    return 'right-4'; // Default margin when no sidebar is detected
  };

  // Debug: Log both immediate state and detected width
  console.log('FAB States:', { 
    isAnySidebarOpening, 
    rightSidebarWidth, 
    rightClass: getRightMargin() 
  });

  return (
    <div 
      ref={fabContainerRef}
      className={cn(
        "absolute bottom-4 left-4 z-50 transition-all duration-75", // Super fast transition: 75ms
        getRightMargin(), // Dynamic right positioning based on open sidebars
        "flex", // Always visible, spans full available width
        className
      )}
      onKeyDown={handleKeyDown}
    >
      {/* Main FAB Bar */}
      <div className="relative w-full">
        <div
          className={cn(
            "h-12 sm:h-14 rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-150",
            "transform hover:scale-[1.01] border-0 text-white relative overflow-hidden cursor-pointer",
            "flex items-center gap-2 sm:gap-3 px-3 sm:px-6 w-full" // Full width
          )}
          style={{
            background: gradientColors.background,
            transition: 'all 0.15s ease'
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
          <div className="flex-1 min-w-0"> {/* Added min-w-0 for proper text truncation */}
            {isQuickAddMode ? (
              <input
                ref={inputRefCallback}
                value={quickAddText}
                onChange={(e) => setQuickAddText(e.target.value)}
                onKeyDown={handleQuickAddKeyDown}
                placeholder="What needs to be done?"
                className="w-full bg-transparent text-white placeholder-white/70 border-none outline-none text-sm sm:text-lg font-medium"
              />
            ) : (
              <div className="w-full text-left text-sm sm:text-lg font-medium text-white/90 truncate">
                Add a task...
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {isQuickAddMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickAdd();
                }}
                disabled={!quickAddText.trim()}
                className="px-2 sm:px-4 py-1 sm:py-2 bg-white/20 hover:bg-white/30 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            )}
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 transform -skew-x-12 pointer-events-none" />
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
