/**
 * Colors picked by the user (list and category colors) are used as text and as backgrounds. A fixed
 * color can't be readable in both themes, so these helpers adjust it for the theme it is shown in.
 *
 * Robustness / pitfalls guarded against:
 * - Invalid or non-#rrggbb input (damaged saved data): returned unchanged / a safe default is used
 *   instead of producing NaN colors.
 * - Bounded search: the lightening/darkening loop runs a fixed, small number of steps.
 * - Colors that are already readable are returned untouched, so the user's choice is kept whenever possible.
 */

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

type Rgb = [number, number, number];

export const isHexColor = (value: unknown): value is string => typeof value === 'string' && HEX_PATTERN.test(value);

const toRgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const toHex = ([r, g, b]: Rgb): string =>
  `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

const luminance = ([r, g, b]: Rgb): number => {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

export const contrastRatio = (a: string, b: string): number => {
  const la = luminance(toRgb(a));
  const lb = luminance(toRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

// Surface the colored text sits on: a card in each theme, plus the faint tint of the color itself.
// Slightly "worse" than the plain card on purpose, so text stays readable on the tinted chips too.
const LIGHT_SURFACE = '#dde3ee';
const DARK_SURFACE = '#2a3350';

/** White or near-black, whichever is readable on top of `background`. */
export function onColor(background: string): string {
  if (!isHexColor(background)) return '#ffffff';
  return contrastRatio(background, '#ffffff') >= contrastRatio(background, '#111827') ? '#ffffff' : '#111827';
}

/**
 * `color` adjusted so text in it is readable (4.5:1) on a card of the current theme: lightened in the
 * dark theme, darkened in the light theme. Colors that are readable already are returned unchanged.
 */
export function readableTextColor(color: string, isDark: boolean, minRatio = 4.5): string {
  if (!isHexColor(color)) return color;
  const surface = isDark ? DARK_SURFACE : LIGHT_SURFACE;
  if (contrastRatio(color, surface) >= minRatio) return color;

  const target: Rgb = isDark ? [255, 255, 255] : [0, 0, 0];
  const base = toRgb(color);
  for (let step = 1; step <= 20; step++) {
    const amount = step / 20;
    const mixed = toHex([
      base[0] + (target[0] - base[0]) * amount,
      base[1] + (target[1] - base[1]) * amount,
      base[2] + (target[2] - base[2]) * amount,
    ]);
    if (contrastRatio(mixed, surface) >= minRatio) return mixed;
  }
  return isDark ? '#ffffff' : '#000000';
}
