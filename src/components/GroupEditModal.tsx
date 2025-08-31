import React, { useState, useEffect } from 'react';
import { X, Smile } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { EmojiPicker } from './EmojiPicker.tsx';
import { IconOverrideControl } from './ui/IconOverrideControl.tsx';
import { extractFirstEmoji, removeFirstEmoji } from '../utils/emojiUtils.ts';

interface GroupEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GroupEditModal({ isOpen, onClose }: GroupEditModalProps) {
  const { addGroup } = useTaskStore();
  
  // Form state
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [overrideListIcons, setOverrideListIcons] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmoji('');
      setColor('#3b82f6');
      setOverrideListIcons(false);
      setShowEmojiPicker(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!name.trim()) return;

    addGroup(name.trim(), color, emoji || undefined, overrideListIcons);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-40 flex items-center justify-center`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-25" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            New Group
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
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
                  onKeyDown={handleKeyDown}
                  placeholder="Group name"
                  className="text-lg font-medium"
                  autoFocus
                />
              </div>
            </div>
          </div>          {/* Icon Override Setting */}
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
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {emoji && <span className="text-lg">{emoji}</span>}
                <span className="font-medium text-gray-900 dark:text-white">
                  {name || 'Group name'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
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
            Create Group
          </Button>
        </div>
      </div>
    </div>
  );
}

// Lazy-loaded wrapper component
export const LazyGroupEditModal = React.lazy(() => 
  import('./GroupEditModal.tsx').then(module => ({ 
    default: module.GroupEditModal 
  }))
);
