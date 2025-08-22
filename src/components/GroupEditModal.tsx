import { useState, useEffect } from 'react';
import { X, Smile, Eye, EyeOff } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { EmojiPicker } from './EmojiPicker.tsx';
import { extractFirstEmoji, removeFirstEmoji } from '../utils/emojiUtils.ts';
import { cn } from '../utils/cn.ts';

interface GroupEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GroupEditModal({ isOpen, onClose }: GroupEditModalProps) {
  const { addGroup } = useTaskStore();
  
  // Form state
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [overrideListIcons, setOverrideListIcons] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmoji('');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
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
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              List Icon Override
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {overrideListIcons ? (
                      <Eye size={16} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <EyeOff size={16} className="text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900 dark:text-white">
                      Use group icon for all lists
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {overrideListIcons 
                      ? "All lists in this group will display the group icon instead of their individual icons"
                      : "Lists will display their individual icons as normal"
                    }
                  </p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideListIcons}
                    onChange={(e) => setOverrideListIcons(e.target.checked)}
                    className="sr-only"
                  />
                  <div 
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors duration-200",
                      overrideListIcons 
                        ? "bg-blue-600" 
                        : "bg-gray-300 dark:bg-gray-600"
                    )}
                  >
                    <div 
                      className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200",
                        overrideListIcons ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </div>
                </label>
              </div>
              
              {overrideListIcons && !emoji && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    💡 Add a group icon above to see it applied to all lists in this group
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Icon Override Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {overrideListIcons ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span className="text-sm font-medium">Icon Override</span>
              </div>
              <button
                type="button"
                onClick={() => setOverrideListIcons(!overrideListIcons)}
                className={cn(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  overrideListIcons ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"
                )}
                role="switch"
                aria-checked={overrideListIcons}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    overrideListIcons ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              When enabled, this group's icon will override individual list icons within the group
            </p>
          </div>

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
