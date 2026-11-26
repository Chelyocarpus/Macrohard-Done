import { describe, expect, it } from 'vitest';
import { contrastRatio } from './color.ts';
import { tagChipColors } from './tagColors.ts';

const CANVAS = { light: '#ffffff', dark: '#1b1b1f' };

/** The chip's tint (15% of the color) laid over the page background, as the browser draws it. */
function blend(tint: string, canvas: string): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const mix = (i: number) => Math.round(channel(canvas, i) * (1 - 0x26 / 255) + channel(tint, i) * (0x26 / 255));
  return `#${[0, 1, 2].map((i) => mix(i).toString(16).padStart(2, '0')).join('')}`;
}

// Colors people are likely to pick, including the extremes that are hardest to read
const COLORS = ['#16a34a', '#15803d', '#d97706', '#dc2626', '#fbbf24', '#f59e0b', '#7c3aed', '#0ea5e9', '#ffffff', '#000000', '#ffff00', '#000080'];

describe('tagChipColors', () => {
  for (const mode of ['light', 'dark'] as const) {
    it(`keeps the name readable (4.5:1) on the tint in the ${mode} theme for any picked color`, () => {
      for (const color of COLORS) {
        const { text } = tagChipColors(color, mode === 'dark');
        const background = blend(color, CANVAS[mode]);
        expect(contrastRatio(text, background), `${color} in ${mode}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it('falls back to gray for a missing or damaged color', () => {
    for (const bad of [undefined, '', 'red', '#12', '#gggggg']) {
      const { background, text } = tagChipColors(bad, false);
      expect(background).toBe('#6b728026');
      expect(text).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('uses a faint tint, not a solid fill', () => {
    expect(tagChipColors('#7c3aed', false).background).toBe('#7c3aed26');
  });
});
