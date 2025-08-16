import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Sun, Moon } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore.ts';
import { Button } from './Button.tsx';
import { cn } from '../../utils/cn.ts';

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useTaskStore();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggleDarkMode = () => {
    toggleDarkMode();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-2 h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors',
          isOpen && 'bg-gray-100 dark:bg-gray-700'
        )}
        title="Menu"
      >
        <MoreHorizontal size={16} className="text-gray-500 dark:text-gray-400" />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 z-50">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
            <div className="p-1">
              <button
                onClick={handleToggleDarkMode}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                <span className="ml-3">
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
