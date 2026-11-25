import { Check } from 'lucide-react';
import { LIST_COLORS } from '../utils/listColors.ts';
import { onColor } from '../utils/color.ts';
import { cn } from '../utils/cn.ts';

interface ColorSwatchesProps {
  value: string;
  onChange: (color: string) => void;
}

/** Round color choices. The chosen one has a ring in its own color and a check that stays readable on any color. */
export function ColorSwatches({ value, onChange }: ColorSwatchesProps) {
  return (
    <div role="radiogroup" aria-label="Color" className="grid grid-cols-8 gap-2">
      {LIST_COLORS.map((color) => {
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Color ${color}`}
            onClick={() => onChange(color)}
            className={cn(
              'relative flex h-8 w-8 items-center justify-center rounded-full transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
              selected ? 'ring-2 ring-offset-2 ring-offset-canvas' : 'hover:scale-110'
            )}
            // The ring takes the color itself (Tailwind reads --tw-ring-color)
            style={{ backgroundColor: color, ['--tw-ring-color' as string]: selected ? color : undefined }}
          >
            {selected && <Check size={16} strokeWidth={3} aria-hidden="true" style={{ color: onColor(color) }} />}
          </button>
        );
      })}
    </div>
  );
}
