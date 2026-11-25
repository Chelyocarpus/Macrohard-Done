import { describe, expect, it } from 'vitest';
import { contentInsets, isSidebarCollapsed, layoutModeForWidth } from './layout.ts';

describe('layoutModeForWidth', () => {
  it('switches at 1100 and 700', () => {
    expect(layoutModeForWidth(1100)).toBe('wide');
    expect(layoutModeForWidth(1099)).toBe('medium');
    expect(layoutModeForWidth(700)).toBe('medium');
    expect(layoutModeForWidth(699)).toBe('narrow');
    expect(layoutModeForWidth(375)).toBe('narrow');
    expect(layoutModeForWidth(1920)).toBe('wide');
  });
  it('falls back to the desktop layout for a width it cannot read', () => {
    expect(layoutModeForWidth(NaN)).toBe('wide');
  });
});

describe('isSidebarCollapsed', () => {
  it('follows the saved choice only on wide screens', () => {
    expect(isSidebarCollapsed('wide', true)).toBe(true);
    expect(isSidebarCollapsed('wide', false)).toBe(false);
  });
  it('is always icons on medium and never on narrow', () => {
    expect(isSidebarCollapsed('medium', false)).toBe(true);
    expect(isSidebarCollapsed('narrow', true)).toBe(false);
  });
});

describe('contentInsets', () => {
  it('leaves room for the sidebar and, on wide screens, the open details pane', () => {
    expect(contentInsets('wide', false, false)).toEqual({ left: 260, right: 0 });
    expect(contentInsets('wide', false, true)).toEqual({ left: 260, right: 360 });
    expect(contentInsets('wide', true, true)).toEqual({ left: 64, right: 360 });
  });
  it('never pushes the content for the details on medium (they overlay) or narrow screens', () => {
    expect(contentInsets('medium', false, true)).toEqual({ left: 64, right: 0 });
    expect(contentInsets('narrow', false, true)).toEqual({ left: 0, right: 0 });
  });
});
