import type { CSSProperties } from 'react';
import { contrastRatio, isHexColor, onColor, readableTextColor } from './color.ts';

/** Text on a filled colour: the usual white or near-black, or pure white/black for the few mid tones where those fall short of 4.5:1 */
function textOnFill(color: string): string {
  const preferred = onColor(color);
  if (contrastRatio(preferred, color) >= 4.5) return preferred;
  return contrastRatio('#ffffff', color) >= contrastRatio('#000000', color) ? '#ffffff' : '#000000';
}

/**
 * A list or tag brings its own colour to the page that shows it. This turns that colour into the CSS variables
 * the page's pieces read (see tailwind.config.js and index.css; they fall back to the blue accent when no
 * list or tag colour is set):
 *   --c-list       the colour itself: bars, the add button, a soft wash. Never used for small text.
 *   --c-list-text  the colour made readable on the page in the current theme, for icons and text.
 *   --c-on-list    text that is readable ON the colour (white or near-black), for filled buttons. *   --list-wash    how strongly the page background is tinted (a whisper in light mode, a little more in dark).
 *
 * Robustness / pitfalls guarded against:
 * - A missing or damaged colour (not #rrggbb) returns nothing, so the page keeps the normal blue accent and
 *   no invalid `rgb(NaN ...)` is ever written.
 * - A colour that is too light or too dark to read as text is adjusted per theme (`readableTextColor`), and
 *   the text on a filled button is picked for contrast (`onColor`), so any colour a person picks stays usable.
 * - The tint is a fixed, small strength regardless of the colour, so a vivid colour can't make the page loud.
 */
export const LIST_WASH_LIGHT = 0.035;
export const LIST_WASH_DARK = 0.07;

// Strength of the tint behind a hovered / selected row on a coloured page (dark mode needs a little more to show)
// Capped so the grey secondary text (dates, counts) keeps 4.5:1 even on the darkest or lightest colour a person can pick
export const ROW_HOVER_LIGHT = 0.07;
export const ROW_HOVER_DARK = 0.10;
export const ROW_SELECTED_LIGHT = 0.12;
export const ROW_SELECTED_DARK = 0.14;

/** "22 163 74" for "#16a34a" (the form the colour variables use, so Tailwind can add opacity) */
export function hexToChannels(hex: string): string {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');
}

export function accentVars(color: string | undefined | null, isDark: boolean): CSSProperties | undefined {
  if (!isHexColor(color)) return undefined;
  return {
    '--c-list': hexToChannels(color),
    '--c-list-text': hexToChannels(readableTextColor(color, isDark)),
    '--c-on-list': hexToChannels(textOnFill(color)),    '--list-wash': String(isDark ? LIST_WASH_DARK : LIST_WASH_LIGHT),
    '--row-hover': `rgb(${hexToChannels(color)} / ${isDark ? ROW_HOVER_DARK : ROW_HOVER_LIGHT})`,
    '--row-selected': `rgb(${hexToChannels(color)} / ${isDark ? ROW_SELECTED_DARK : ROW_SELECTED_LIGHT})`,
  } as CSSProperties;
}

/**
 * The look of the selected item in a sidebar list: a soft tint of its colour behind it and a bar on the left edge.
 * Nothing (so the normal blue bar stays) when the item has no valid colour.
 */
export function selectionStyle(color: string | undefined | null): CSSProperties | undefined {
  if (!isHexColor(color)) return undefined;
  return { backgroundColor: `${color}14`, boxShadow: `inset 3px 0 0 ${color}` }; // 14 = about 8% (sidebar grey text stays readable even on black)
}

/**
 * Sets `--hover-tint` on an item so `hover:bg-[var(--hover-tint,rgb(var(--c-hover)))]` tints it with its own colour when
 * hovered (a sidebar list or tag), and falls back to the normal soft grey when it has none.
 */
export function hoverTintStyle(color: string | undefined | null): CSSProperties | undefined {
  if (!isHexColor(color)) return undefined;
  return { '--hover-tint': `${color}0f` } as CSSProperties; // 0f = about 6%
}

/** Class that uses the variable above (kept in one place so the string stays identical everywhere) */
export const HOVER_TINT_CLASS = 'hover:bg-[var(--hover-tint,rgb(var(--c-hover)))]';
