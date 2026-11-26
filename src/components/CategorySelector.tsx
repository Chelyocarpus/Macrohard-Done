import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTaskStore } from '../stores/taskStore.ts';
import { useShallow } from 'zustand/react/shallow';
import { CategoryBadge } from './CategoryBadge.tsx';
import { cn } from '../utils/cn.ts';
import { Plus } from 'lucide-react';

// Utility function to deduplicate category IDs
const deduplicateCategoryIds = (categoryIds: string[]): string[] => {
  return Array.from(new Set(categoryIds.filter(id => id && id.trim() !== '')));
};

// Utility function to normalize category names for comparison
const normalizeCategoryName = (name: string): string => {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
};

interface CategorySelectorProps {
  selectedCategoryIds: string[];
  onChange: (categoryIds: string[]) => void;
  onCreateCategory?: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Makes the chosen tags clickable (e.g. "show only tasks with this tag") */
  onTagClick?: (categoryId: string) => void;
  className?: string;
}

export function CategorySelector({
  selectedCategoryIds,
  onChange,
  onCreateCategory,
  placeholder = 'Search or add tags...',
  disabled = false,
  onTagClick,
  className
}: CategorySelectorProps) {
  const { categories, addCategory } = useTaskStore(useShallow((state) => ({ categories: state.categories, addCategory: state.addCategory })));
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ensure selectedCategoryIds are deduplicated
  useEffect(() => {
    const deduplicated = deduplicateCategoryIds(selectedCategoryIds);
    if (deduplicated.length !== selectedCategoryIds.length || 
        deduplicated.some((id, index) => id !== selectedCategoryIds[index])) {
      onChange(deduplicated);
    }
  }, [selectedCategoryIds, onChange]);

  const selectedCategories = useMemo(() => 
    categories.filter(cat => selectedCategoryIds.includes(cat.id)), 
    [categories, selectedCategoryIds]
  );
  
  const filteredCategories = useMemo(() => 
    categories.filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase());
      const notSelected = !selectedCategoryIds.includes(category.id);
      return matchesSearch && notSelected;
    }),
    [categories, searchQuery, selectedCategoryIds]
  );

  const canCreateNew = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return false;
    
    const normalizedQuery = normalizeCategoryName(trimmedQuery);
    return !categories.some(cat => normalizeCategoryName(cat.name) === normalizedQuery);
  }, [searchQuery, categories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setHoveredIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault(); // used here: a panel around this field must not close as well
        setIsOpen(false);
        setSearchQuery('');
        setHoveredIndex(-1);
        break;
      case 'ArrowDown': {
        e.preventDefault();
        const maxIndex = filteredCategories.length + (canCreateNew ? 0 : -1);
        setHoveredIndex(prev => (prev < maxIndex ? prev + 1 : 0));
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const minIndex = canCreateNew ? -1 : 0;
        setHoveredIndex(prev => (prev > minIndex ? prev - 1 : filteredCategories.length + (canCreateNew ? 0 : -1)));
        break;
      }
      case 'Enter':
        e.preventDefault();
        if (hoveredIndex === -1 && canCreateNew) {
          handleCreateCategory();
        } else if (hoveredIndex >= 0 && hoveredIndex < filteredCategories.length) {
          handleSelectCategory(filteredCategories[hoveredIndex].id);
        }
        break;
    }
  };

  const handleSelectCategory = useCallback((categoryId: string) => {
    const newCategoryIds = deduplicateCategoryIds([...selectedCategoryIds, categoryId]);
    onChange(newCategoryIds);
    setSearchQuery('');
    setHoveredIndex(-1);
  }, [onChange, selectedCategoryIds]);

  const handleRemoveCategory = useCallback((categoryId: string) => {
    onChange(selectedCategoryIds.filter(id => id !== categoryId));
  }, [onChange, selectedCategoryIds]);

  const handleCreateCategory = useCallback(() => {
    if (!canCreateNew) return;
    
    const categoryName = searchQuery.trim();
    if (onCreateCategory) {
      onCreateCategory(categoryName);
    } else {
      try {
        // Create the category and automatically select it
        const newCategory = addCategory(categoryName);
        
        // Use setTimeout to prevent conflicts between state updates
        setTimeout(() => {
          const newCategoryIds = deduplicateCategoryIds([...selectedCategoryIds, newCategory.id]);
          onChange(newCategoryIds);
        }, 0);
      } catch (error) {
        // Error is already handled by the addCategory function with toast messages
        console.warn('Failed to create category:', error);
      }
    }
    setSearchQuery('');
    setHoveredIndex(-1);
  }, [canCreateNew, searchQuery, onCreateCategory, addCategory, onChange, selectedCategoryIds]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'min-h-10 w-full border border-line rounded-lg',
          'bg-canvas px-3 py-2 cursor-text',
          'focus-within:ring-2 focus-within:ring-accent focus-within:border-accent',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2 ring-accent border-accent'
        )}
        onClick={() => !disabled && setIsOpen(true)}
        // Keyboard access: the text input only exists while open, so the wrapper itself must be
        // focusable and open the picker on Enter / Space / ArrowDown.
        role="button"
        tabIndex={disabled || isOpen ? -1 : 0}
        aria-label="Select tags"
        aria-expanded={isOpen}
        aria-disabled={disabled || undefined}
        onKeyDown={(e) => {
          if (disabled || isOpen || e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <div className="flex flex-wrap gap-1.5">
          {selectedCategories.map((category) => (
            <CategoryBadge
              key={category.id}
              category={category}
              size="sm"
              showRemove={!disabled}
              onRemove={() => handleRemoveCategory(category.id)}
              onClick={onTagClick ? () => onTagClick(category.id) : undefined}
            />
          ))}
          
          {isOpen && (
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedCategories.length === 0 ? placeholder : ''}
              disabled={disabled}
              className="flex-1 min-w-32 bg-transparent border-none outline-none text-sm text-ink placeholder-gray-500"
            />
          )}
          
          {!isOpen && selectedCategories.length === 0 && (
            <span className="text-sm text-muted pointer-events-none">
              {placeholder}
            </span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-canvas border border-line rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredCategories.length === 0 && !canCreateNew && (
            <div className="px-3 py-2 text-sm text-muted text-center">
              {searchQuery ? 'No tags found' : 'No more tags available'}
            </div>
          )}

          {canCreateNew && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCreateCategory();
              }}
              onMouseEnter={() => setHoveredIndex(-1)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-hover',
                'flex items-center gap-2 border-b border-line',
                hoveredIndex === -1 && 'bg-hover'
              )}
            >
              <Plus className="h-4 w-4 text-accent" />
              <span>Create "{searchQuery}"</span>
            </button>
          )}

          {filteredCategories.map((category, index) => (
            <button
              key={category.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCategory(category.id);
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-hover',
                'flex items-center gap-2',
                hoveredIndex === index && 'bg-hover'
              )}
            >
              <CategoryBadge category={category} size="sm" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
