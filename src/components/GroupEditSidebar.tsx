import { useState, useEffect } from 'react';
import { X, Smile, Trash2 } from 'lucide-react';
import type { ListGroup } from '../types/index.ts';
import { useTaskStore } from '../stores/taskStore.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { EmojiPicker } from './EmojiPicker.tsx';
import { IconOverrideControl } from './ui/IconOverrideControl.tsx';
import { cn } from '../utils/cn.ts';
import { extractFirstEmoji, removeFirstEmoji } from '../utils/emojiUtils.ts';
import { Z_INDEX_CLASSES } from '../utils/zIndex.ts';

interface GroupEditSidebarProps {
  group?: ListGroup;
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
}

export function GroupEditSidebar({ group, isOpen, onClose, mode }: GroupEditSidebarProps) {
  const { addGroup, updateGroup, deleteGroup, getListsInGroup } = useTaskStore();
  
  // Form state
  const [name, setName] = useState(group?.name || '');
  const [emoji, setEmoji] = useState(group?.emoji || '');
  const [color, setColor] = useState(group?.color || '#3b82f6');
  const [overrideListIcons, setOverrideListIcons] = useState(group?.overrideListIcons || false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Color options
  const colors = [
    // Primary blues
    '#3b82f6', // blue
    '#1e40af', // blue-800
    '#0ea5e9', // sky-500
    '#0284c7', // sky-600
    
    // Greens
    '#10b981', // emerald
    '#059669', // emerald-600
    '#84cc16', // lime
    '#65a30d', // lime-600
    '#16a34a', // green-600
    '#15803d', // green-700
    
    // Warm colors
    '#f59e0b', // amber
    '#d97706', // amber-600
    '#f97316', // orange
    '#ea580c', // orange-600
    '#dc2626', // red-600
    '#ef4444', // red
    
    // Purples & Magentas
    '#8b5cf6', // violet
    '#7c3aed', // violet-600
    '#a855f7', // purple-500
    '#9333ea', // purple-600
    '#ec4899', // pink
    '#db2777', // pink-600
    '#be185d', // pink-700
    
    // Cyans & Teals
    '#06b6d4', // cyan
    '#0891b2', // cyan-600
    '#14b8a6', // teal-500
    '#0d9488', // teal-600
    
    // Neutrals & Earth tones
    '#6b7280', // gray
    '#4b5563', // gray-600
    '#374151', // gray-700
    '#78716c', // stone-500
    '#57534e', // stone-600
    
    // Additional vibrant colors
    '#fbbf24', // amber-400
    '#fb7185', // rose-400
    '#a78bfa', // violet-400
    '#34d399', // emerald-400
    '#60a5fa', // blue-400
    '#f472b6', // pink-400
  ];

  // Get lists in this group for preview
  const groupLists = group ? getListsInGroup(group.id) : [];

  // Reset form when group changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (group) {
        setName(group.name);
        setEmoji(group.emoji || '');
        setColor(group.color || '#3b82f6');
        setOverrideListIcons(group.overrideListIcons || false);
      } else {
        setName('');
        setEmoji('');
        setColor('#3b82f6');
        setOverrideListIcons(false);
      }
      setShowEmojiPicker(false);
    }
  }, [isOpen, group]);

  const handleSave = () => {
    if (!name.trim()) return;

    if (mode === 'create') {
      addGroup(name.trim(), color, emoji, overrideListIcons);
    } else if (group) {
      updateGroup(group.id, {
        name: name.trim(),
        emoji,
        color,
        overrideListIcons,
      });
    }

    onClose();
  };

  const handleNameChange = (value: string) => {
    const extractedEmoji = extractFirstEmoji(value);
    if (extractedEmoji && !emoji) {
      // If user types an emoji and we don't have one set, extract it
      setEmoji(extractedEmoji);
      setName(removeFirstEmoji(value));
    } else {
      setName(value);
    }
  };

  const handleDelete = () => {
    if (group && confirm('Are you sure you want to delete this group? Lists will be moved to ungrouped.')) {
      deleteGroup(group.id, null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${Z_INDEX_CLASSES.MODAL} flex`}>
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
            className={`absolute top-0 left-0 right-0 h-1 ${Z_INDEX_CLASSES.RELATIVE}`}
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
          <div className={`flex items-center gap-3 relative ${Z_INDEX_CLASSES.RELATIVE}`}>
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
              {mode === 'create' ? 'New Group' : 'Edit Group'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={`p-2 relative ${Z_INDEX_CLASSES.RELATIVE}`}
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Group Name and Emoji */}
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
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Group name"
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
            <div className="grid grid-cols-8 gap-2">
              {colors.map((colorOption) => (
                <button
                  key={colorOption}
                  onClick={() => setColor(colorOption)}
                  className={cn(
                    'w-10 h-10 rounded-lg border-2 transition-all duration-200 relative overflow-hidden group',
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
                    className="absolute inset-1 rounded-md bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  {/* Selection indicator */}
                  {color === colorOption && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full shadow-sm flex items-center justify-center">
                        <svg className="w-2 h-2 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Override Setting */}
          <IconOverrideControl
            value={overrideListIcons}
            onChange={setOverrideListIcons}
            emoji={emoji}
          />

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
              <div className={`space-y-3 relative ${Z_INDEX_CLASSES.RELATIVE}`}>
                {/* Group header */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ 
                      backgroundColor: color,
                      boxShadow: `0 2px 8px ${color}40`
                    }}
                  />
                  {emoji && <span className="text-lg">{emoji}</span>}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {name || 'Group name'}
                  </span>
                </div>
                
                {/* Sample lists in group */}
                {groupLists.length > 0 && (
                  <div className="ml-7 space-y-2">
                    {groupLists.slice(0, 3).map((list) => (
                      <div key={list.id} className="flex items-center gap-2 text-sm">
                        <span className="text-xs">
                          {overrideListIcons && emoji ? emoji : (list.emoji || '📝')}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {list.name}
                        </span>
                      </div>
                    ))}
                    {groupLists.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                        +{groupLists.length - 3} more lists
                      </div>
                    )}
                  </div>
                )}
                
                {/* Show sample lists if creating new group */}
                {mode === 'create' && (
                  <div className="ml-7 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xs">
                        {overrideListIcons && emoji ? emoji : '📝'}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        Sample List 1
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xs">
                        {overrideListIcons && emoji ? emoji : '✅'}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        Sample List 2
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              {mode === 'edit' && group && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-500 hover:text-red-700 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete group
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
                {mode === 'create' ? 'Create group' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
