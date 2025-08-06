import { useState, useEffect } from 'react';
import { X, Smile, Trash2 } from 'lucide-react';
import type { TaskList } from '../types/index.ts';
import { useTaskStore } from '../stores/taskStore.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { EmojiPicker } from './EmojiPicker.tsx';
import { cn } from '../utils/cn.ts';

interface ListEditSidebarProps {
  list?: TaskList;
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
}

export function ListEditSidebar({ list, isOpen, onClose, mode }: ListEditSidebarProps) {
  const { addList, updateList, deleteList } = useTaskStore();
  
  // Form state
  const [name, setName] = useState(list?.name || '');
  const [emoji, setEmoji] = useState(list?.emoji || '');
  const [color, setColor] = useState(list?.color || '#3b82f6');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Color options
  const colors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#ec4899', // pink
    '#6b7280', // gray
  ];

  // Reset form when list changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName(list?.name || '');
      setEmoji(list?.emoji || '');
      setColor(list?.color || '#3b82f6');
      setShowEmojiPicker(false);
    }
  }, [isOpen, list]);

  const handleSave = () => {
    if (!name.trim()) return;

    if (mode === 'create') {
      addList(name.trim(), color, emoji);
    } else if (list) {
      updateList(list.id, {
        name: name.trim(),
        emoji,
        color,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (list && confirm('Are you sure you want to delete this list? All tasks in this list will also be deleted.')) {
      deleteList(list.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="flex-1 bg-black bg-opacity-25" 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="w-96 bg-white dark:bg-gray-800 shadow-xl flex flex-col relative overflow-hidden">
        {/* Color accent line */}
        {color && (
          <div 
            className="absolute top-0 left-0 right-0 h-1 z-10"
            style={{ backgroundColor: color }}
          />
        )}
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 relative">
          {color && (
            <div 
              className="absolute inset-0 opacity-5"
              style={{ 
                background: `linear-gradient(135deg, ${color} 0%, transparent 80%)`
              }}
            />
          )}
          <div className="flex items-center gap-3 relative z-10">
            {color && (
              <div 
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ 
                  backgroundColor: color,
                  boxShadow: `0 2px 8px ${color}40`
                }}
              />
            )}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {mode === 'create' ? 'New List' : 'Edit List'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 relative z-10"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* List Name and Emoji */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="h-12 w-12 p-0 text-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400"
                >
                  {emoji || <Smile size={20} className="text-gray-400" />}
                </Button>
                
                {showEmojiPicker && (
                  <EmojiPicker
                    value={emoji}
                    onChange={setEmoji}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>
              
              <div className="flex-1">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="List name"
                  className="text-lg font-medium"
                  autoFocus={mode === 'create'}
                />
              </div>
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Color Theme
            </label>
            <div className="grid grid-cols-5 gap-3">
              {colors.map((colorOption) => (
                <button
                  key={colorOption}
                  onClick={() => setColor(colorOption)}
                  className={cn(
                    'w-12 h-12 rounded-xl border-2 transition-all duration-200 relative overflow-hidden group',
                    color === colorOption
                      ? 'border-gray-900 dark:border-white scale-110 shadow-lg'
                      : 'border-gray-300 dark:border-gray-600 hover:scale-105 hover:border-gray-400'
                  )}
                  style={{ 
                    backgroundColor: colorOption,
                    boxShadow: color === colorOption 
                      ? `0 4px 12px ${colorOption}40` 
                      : `0 2px 4px ${colorOption}20`
                  }}
                >
                  {/* Inner highlight */}
                  <div 
                    className="absolute inset-1 rounded-lg bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  {/* Selection indicator */}
                  {color === colorOption && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview
            </label>
            <div 
              className="p-4 border rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 relative overflow-hidden"
              style={{
                borderLeft: `4px solid ${color}`,
                backgroundColor: `${color}08`
              }}
            >
              {/* Accent line */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: color }}
              />
              <div className="flex items-center gap-3 relative z-10">
                <div 
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ 
                    backgroundColor: color,
                    boxShadow: `0 2px 8px ${color}40`
                  }}
                />
                {emoji && <span className="text-lg">{emoji}</span>}
                <span className="font-medium text-gray-900 dark:text-white">
                  {name || 'List name'}
                </span>
                <span 
                  className="ml-auto text-xs px-2 py-1 rounded-full text-white font-medium shadow-sm"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 2px 4px ${color}40`
                  }}
                >
                  3
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              {mode === 'edit' && list && !list.isSystem && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-500 hover:text-red-700 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete list
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                disabled={!name.trim()}
              >
                {mode === 'create' ? 'Create list' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
