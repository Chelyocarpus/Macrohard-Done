import { describe, expect, it } from 'vitest';
import {
  LIST_WASH_DARK, LIST_WASH_LIGHT, ROW_HOVER_DARK, ROW_HOVER_LIGHT, ROW_SELECTED_DARK, ROW_SELECTED_LIGHT,
  accentVars, hexToChannels, hoverTintStyle, selectionStyle,
} from './accentTheme.ts';
import { contrastRatio } from './color.ts';

const toHex = (channels: string) => `#${channels.split(' ').map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
const COLORS = ['#16a34a', '#d97706', '#7c3aed', '#0ea5e9', '#fbbf24', '#ffffff', '#000000', '#ffff00', '#000080', '#777777'];

describe('hexToChannels', () => {
  it('splits a colour into the three numbers the variables use', () => {
    expect(hexToChannels('#16a34a')).toBe('22 163 74');
    expect(hexToChannels('#000000')).toBe('0 0 0');
    expect(hexToChannels('#FFFFFF')).toBe('255 255 255');
  });
});

describe('accentVars', () => {
  it('returns nothing for a missing or damaged colour, so the blue accent stays', () => {
    for (const bad of [undefined, null, '', 'red', '#12', '#gggggg', 'rgb(1,2,3)']) {
      expect(accentVars(bad, false)).toBeUndefined();
    }
  });

  it('sets the four variables for a good colour', () => {
    const vars = accentVars('#16a34a', false) as Record<string, string>;
    expect(vars['--c-list']).toBe('22 163 74');
    expect(vars['--c-list-text']).toMatch(/^\d+ \d+ \d+$/);
    expect(vars['--c-on-list']).toMatch(/^\d+ \d+ \d+$/);
    expect(vars['--list-wash']).toBe(String(LIST_WASH_LIGHT));
  });

  it('tints the page a little more in dark mode, and always only slightly', () => {
    expect((accentVars('#16a34a', true) as Record<string, string>)['--list-wash']).toBe(String(LIST_WASH_DARK));
    expect(LIST_WASH_LIGHT).toBeLessThan(LIST_WASH_DARK);
    expect(LIST_WASH_DARK).toBeLessThanOrEqual(0.1);
  });

  for (const dark of [false, true]) {
    it(`keeps text readable (4.5:1) for any picked colour in the ${dark ? 'dark' : 'light'} theme`, () => {
      const canvas = dark ? '#1b1b1f' : '#ffffff';
      for (const color of COLORS) {
        const vars = accentVars(color, dark) as Record<string, string>;
        // icons and text in the list colour, on the page
        expect(contrastRatio(toHex(vars['--c-list-text']), canvas), `${color} text on page`).toBeGreaterThanOrEqual(4.5);
        // text on a button filled with the list colour
        expect(contrastRatio(toHex(vars['--c-on-list']), color), `${color} button text`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

describe('selectionStyle', () => {
  it('is a soft tint plus a left bar in the colour', () => {
    expect(selectionStyle('#16a34a')).toEqual({ backgroundColor: '#16a34a14', boxShadow: 'inset 3px 0 0 #16a34a' });
  });
  it('is nothing for a missing or damaged colour, so the blue bar stays', () => {
    for (const bad of [undefined, null, '', 'green', '#12', '#zzzzzz']) expect(selectionStyle(bad)).toBeUndefined();
  });
});

describe('hover and selected tints', () => {
  const blend = (base: string, color: string, alpha: number) => {
    const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    return `#${[0, 1, 2].map((i) => Math.round(ch(base, i) * (1 - alpha) + ch(color, i) * alpha).toString(16).padStart(2, '0')).join('')}`;
  };
  const MUTED = { light: '#5b6470', dark: '#a3a8b1' };
  const INK = { light: '#1f2328', dark: '#ecedef' };
  const CANVAS = { light: '#ffffff', dark: '#1b1b1f' };

  it('selected is clearly stronger than hover, in both themes', () => {
    expect(ROW_SELECTED_LIGHT).toBeGreaterThan(ROW_HOVER_LIGHT);
    expect(ROW_SELECTED_DARK).toBeGreaterThan(ROW_HOVER_DARK);
    const vars = accentVars('#16a34a', false) as Record<string, string>;
    expect(vars['--row-hover']).toBe(`rgb(22 163 74 / ${ROW_HOVER_LIGHT})`);
    expect(vars['--row-selected']).toBe(`rgb(22 163 74 / ${ROW_SELECTED_LIGHT})`);
  });

  for (const mode of ['light', 'dark'] as const) {
    it(`keeps the grey secondary text and the main text readable on a hovered or selected row (${mode}), whatever the colour`, () => {
      const [hover, selected] = mode === 'dark' ? [ROW_HOVER_DARK, ROW_SELECTED_DARK] : [ROW_HOVER_LIGHT, ROW_SELECTED_LIGHT];
      for (const color of COLORS) {
        for (const alpha of [hover, selected]) {
          const bg = blend(CANVAS[mode], color, alpha);
          expect(contrastRatio(MUTED[mode], bg), `${color} muted on ${bg}`).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(INK[mode], bg), `${color} ink on ${bg}`).toBeGreaterThanOrEqual(7);
        }
      }
    });
  }

  it('keeps the sidebar grey text readable on a selected or hovered item of any colour', () => {
    const SIDEBAR = { light: '#f5f6f8', dark: '#232328' };
    for (const mode of ['light', 'dark'] as const) {
      for (const color of COLORS) {
        for (const alpha of [0x14 / 255, 0x0f / 255]) {
          const bg = blend(SIDEBAR[mode], color, alpha);
          expect(contrastRatio(MUTED[mode], bg), `${color} ${mode} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('gives a sidebar item a faint hover tint of its own colour, or nothing', () => {
    expect(hoverTintStyle('#7c3aed')).toEqual({ '--hover-tint': '#7c3aed0f' });
    for (const bad of [undefined, null, '', 'purple', '#12']) expect(hoverTintStyle(bad)).toBeUndefined();
  });
});
