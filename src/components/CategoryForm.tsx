import { useState } from 'react';
import type { Category } from '../types/index.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { EmojiPicker } from './EmojiPicker.tsx';
import { cn } from '../utils/cn.ts';

interface CategoryFormProps {
  category?: Category;
  onSave: (data: { name: string; color?: string; emoji?: string; description?: string }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const colorOptions = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#64748b', // slate
  '#78716c', // stone
];

export function CategoryForm({ category, onSave, onCancel, isSubmitting = false }: CategoryFormProps) {
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [selectedColor, setSelectedColor] = useState(category?.color || colorOptions[0]);
  const [selectedEmoji, setSelectedEmoji] = useState(category?.emoji || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (name.trim().length > 50) {
      newErrors.name = 'Category name must be 50 characters or less';
    }
    
    if (description && description.length > 200) {
      newErrors.description = 'Description must be 200 characters or less';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color: selectedColor,
      emoji: selectedEmoji || undefined,
    });
  };

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    setShowEmojiPicker(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="category-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Name *
        </label>
        <Input
          id="category-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter category name"
          disabled={isSubmitting}
          className={cn(errors.name && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="category-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          id="category-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          disabled={isSubmitting}
          rows={3}
          className={cn(
            'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'resize-none',
            errors.description && 'border-red-500 focus:border-red-500 focus:ring-red-500'
          )}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {colorOptions.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              disabled={isSubmitting}
              className={cn(
                'w-8 h-8 rounded-full border-2 transition-all',
                selectedColor === color 
                  ? 'border-gray-900 dark:border-gray-100 scale-110' 
                  : 'border-gray-300 dark:border-gray-600 hover:scale-105'
              )}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Icon (Emoji)
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={isSubmitting}
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-lg border-2 border-dashed',
              'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
              'transition-colors text-2xl bg-gray-50 dark:bg-gray-800',
              selectedEmoji && 'border-solid bg-white dark:bg-gray-700'
            )}
          >
            {selectedEmoji || '😊'}
          </button>
          {selectedEmoji && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedEmoji('')}
              disabled={isSubmitting}
            >
              Remove
            </Button>
          )}
        </div>
        
        {showEmojiPicker && (
          <div className="mt-2">
            <EmojiPicker
              value={selectedEmoji}
              onChange={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="flex-1"
        >
          {isSubmitting ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
