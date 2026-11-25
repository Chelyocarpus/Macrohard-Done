import { useState, useEffect } from 'react';
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
  '🏃', '🧘', '🧩', '🔧', '🧵', '📷', '🎡', '🎭'
];

export function EmojiPicker({ value, onChange, onClose }: EmojiPickerProps) {
  const [selectedEmoji, setSelectedEmoji] = useState(value || '');

  // Keep the highlighted emoji in sync when the parent changes `value`
  useEffect(() => {
    setSelectedEmoji(value || '');
  }, [value]);

  const handleSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    onChange(emoji);
  };

  return (
    <div className="relative mt-2 p-4 bg-canvas border border-line rounded-lg shadow-lg w-full max-w-md">
      <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
        {COMMON_EMOJIS.map((emoji, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            onClick={() => handleSelect(emoji)}
            className={`h-8 w-8 p-0 text-lg hover:bg-hover ${
              selectedEmoji === emoji ? 'bg-accent/10' : ''
            }`}
          >
            {emoji}
          </Button>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-line flex justify-between">
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
          Close
        </Button>
      </div>
    </div>
  );
}
