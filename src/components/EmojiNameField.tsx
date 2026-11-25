import { Smile } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker.tsx';
import { Input } from './ui/Input.tsx';
import { cn } from '../utils/cn.ts';
import { extractFirstEmoji, removeFirstEmoji } from '../utils/emojiUtils.ts';

interface EmojiNameFieldProps {
  name: string;
  emoji: string;
  /** The list's color: tints the icon tile, as the page header does (none: a neutral tile) */
  color?: string;
  placeholder: string;
  onNameChange: (name: string) => void;
  onEmojiChange: (emoji: string) => void;
  /** Whether the emoji picker is open: owned by the form, which closes it first on Escape */
  pickerOpen: boolean;
  onPickerOpenChange: (open: boolean) => void;
  autoFocus?: boolean;
  /** Called on Enter (making a new one) */
  onEnter?: () => void;
}

/** The icon tile (opens the emoji picker) and the name field. An emoji typed at the start of the name moves into the tile. */
export function EmojiNameField({
  name, emoji, color, placeholder, onNameChange, onEmojiChange, pickerOpen, onPickerOpenChange, autoFocus, onEnter,
}: EmojiNameFieldProps) {
  const handleNameChange = (value: string) => {
    const typedEmoji = extractFirstEmoji(value);
    if (typedEmoji && !emoji) {
      onEmojiChange(typedEmoji);
      onNameChange(removeFirstEmoji(value));
    } else {
      onNameChange(value);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => onPickerOpenChange(!pickerOpen)}
          aria-label={emoji ? 'Change icon' : 'Choose an icon'}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            emoji ? 'hover:brightness-95' : 'border-2 border-dashed border-line text-muted hover:border-muted',
            emoji && !color && 'bg-hover'
          )}
          style={color ? { backgroundColor: `${color}24` } : undefined}
        >
          {emoji || <Smile size={20} aria-hidden="true" />}
        </button>
        {pickerOpen && <EmojiPicker value={emoji} onChange={onEmojiChange} onClose={() => onPickerOpenChange(false)} />}
      </div>
      <div className="min-w-0 flex-1">
        <Input
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && onEnter) onEnter(); }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="text-lg font-medium"
          autoFocus={autoFocus}
        />
      </div>
    </div>
  );
}
