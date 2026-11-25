import { useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey.ts';
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
  // Escape closes the emoji picker first (the picker is the top layer, so the manager around the form stays put)
  useEscapeKey(showEmojiPicker, () => setShowEmojiPicker(false));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Tag name is required';
    } else if (name.trim().length > 50) {
      newErrors.name = 'Tag name must be 50 characters or less';
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
        <label htmlFor="category-name" className="block text-sm font-medium text-ink mb-2">
          Name *
        </label>
        <Input
          id="category-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter tag name"
          disabled={isSubmitting}
          className={cn(errors.name && 'border-overdue focus:border-overdue focus:ring-overdue')}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-overdue">{errors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="category-description" className="block text-sm font-medium text-ink mb-2">
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
            'w-full px-3 py-2 border border-line rounded-lg',
            'bg-canvas text-ink',
            'focus:ring-2 focus:ring-accent focus:border-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'resize-none',
            errors.description && 'border-overdue focus:border-overdue focus:ring-overdue'
          )}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-overdue">{errors.description}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-2">
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
                  ? 'border-ink scale-110' 
                  : 'border-line hover:scale-105'
              )}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-2">
          Icon (Emoji)
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={isSubmitting}
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-lg border-2 border-dashed',
              'border-line hover:border-muted',
              'transition-colors text-2xl bg-sidebar',
              selectedEmoji && 'border-solid bg-canvas'
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
          {isSubmitting ? 'Saving...' : category ? 'Update tag' : 'Create tag'}
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
