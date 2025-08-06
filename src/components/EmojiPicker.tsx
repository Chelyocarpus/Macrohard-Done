import { useState } from 'react';
import { Button } from './ui/Button.tsx';

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string) => void;
  onClose: () => void;
}

const COMMON_EMOJIS = [
  '📝', '✅', '📋', '📌', '🎯', '💡', '🔥', '⭐', '❤️', '🎉',
  '🏠', '💼', '🛒', '🍕', '🚗', '✈️', '🏋️', '📚', '🎵', '🎨',
  '🌟', '💪', '🎪', '🎁', '📱', '💻', '🔑', '🌱', '🍎', '☕',
  '🎲', '🎮', '📺', '🍳', '🧹', '💰', '📊', '🎤', '🎬', '📖',
  '🏃', '🧘', '🎯', '🔧', '🎨', '📷', '🎪', '🎭'
];

export function EmojiPicker({ value, onChange, onClose }: EmojiPickerProps) {
  const [selectedEmoji, setSelectedEmoji] = useState(value || '');

  const handleSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    onChange(emoji);
    onClose();
  };

  return (
    <div className="absolute top-full left-0 mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 w-64">
      <div className="grid grid-cols-8 gap-2 max-h-40 overflow-y-auto">
        {COMMON_EMOJIS.map((emoji, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            onClick={() => handleSelect(emoji)}
            className={`h-8 w-8 p-0 text-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
              selectedEmoji === emoji ? 'bg-blue-100 dark:bg-blue-900' : ''
            }`}
          >
            {emoji}
          </Button>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedEmoji('');
            onChange('');
            onClose();
          }}
        >
          None
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
