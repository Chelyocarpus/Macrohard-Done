import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTaskStore } from '../stores/taskStore.ts';
import { CategoryBadge } from './CategoryBadge.tsx';
import { cn } from '../utils/cn.ts';
import { Plus } from 'lucide-react';

interface CategorySelectorProps {
  selectedCategoryIds: string[];
  onChange: (categoryIds: string[]) => void;
  onCreateCategory?: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CategorySelector({
  selectedCategoryIds,
  onChange,
  onCreateCategory,
  placeholder = 'Search or add categories...',
  disabled = false,
  className
}: CategorySelectorProps) {
  const { categories, addCategory } = useTaskStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const canCreateNew = useMemo(() => 
    searchQuery.trim() && 
    !categories.some(cat => cat.name.toLowerCase() === searchQuery.toLowerCase()),
    [searchQuery, categories]
  );

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
    onChange([...selectedCategoryIds, categoryId]);
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
      // Create the category and automatically select it
      const newCategory = addCategory(categoryName);
      
      // Use setTimeout to prevent conflicts between state updates
      setTimeout(() => {
        onChange([...selectedCategoryIds, newCategory.id]);
      }, 0);
    }
    setSearchQuery('');
    setHoveredIndex(-1);
  }, [canCreateNew, searchQuery, onCreateCategory, addCategory, onChange, selectedCategoryIds]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'min-h-10 w-full border border-gray-300 dark:border-gray-600 rounded-lg',
          'bg-white dark:bg-gray-800 px-3 py-2 cursor-text',
          'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2 ring-blue-500 border-blue-500'
        )}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <div className="flex flex-wrap gap-1.5">
          {selectedCategories.map((category) => (
            <CategoryBadge
              key={category.id}
              category={category}
              size="sm"
              showRemove={!disabled}
              onRemove={() => handleRemoveCategory(category.id)}
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
              className="flex-1 min-w-32 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500"
            />
          )}
          
          {!isOpen && selectedCategories.length === 0 && (
            <span className="text-sm text-gray-500 pointer-events-none">
              {placeholder}
            </span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredCategories.length === 0 && !canCreateNew && (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              {searchQuery ? 'No categories found' : 'No more categories available'}
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
                'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700',
                'flex items-center gap-2 border-b border-gray-100 dark:border-gray-700',
                hoveredIndex === -1 && 'bg-gray-50 dark:bg-gray-700'
              )}
            >
              <Plus className="h-4 w-4 text-blue-500" />
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
                'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700',
                'flex items-center gap-2',
                hoveredIndex === index && 'bg-gray-50 dark:bg-gray-700'
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
