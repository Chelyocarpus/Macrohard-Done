import { isHexColor, readableTextColor } from './color.ts';

const DEFAULT_TAG_COLOR = '#6b7280';

/**
 * Colors of a tag chip: a faint tint of the tag's color behind text that is readable on it in the
 * current theme (the same adjustment lists use, see `readableTextColor`).
 *
 * Robustness / pitfalls guarded against:
 * - A missing or damaged color (not #rrggbb) falls back to gray, so the chip never gets an invalid
 *   `#undefined26` color string.
 * - Very light colors (yellow) are darkened in the light theme and very dark ones (navy) are lightened
 *   in the dark theme, so the name stays readable whatever the user picked.
 */
export function tagChipColors(color: string | undefined, isDark: boolean): { background: string; text: string; border: string } {
  const base = isHexColor(color) ? color : DEFAULT_TAG_COLOR;
  return {
    background: `${base}26`, // about 15% opacity
    border: `${base}55`,
    text: readableTextColor(base, isDark),
  };
}
