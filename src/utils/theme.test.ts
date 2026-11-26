import { describe, expect, it } from 'vitest';
import { isDarkFor, resolveThemePreference } from './theme.ts';

describe('resolveThemePreference', () => {
  it('keeps a saved choice', () => {
    expect(resolveThemePreference('system', true)).toBe('system');
    expect(resolveThemePreference('light', true)).toBe('light');
    expect(resolveThemePreference('dark', false)).toBe('dark');
  });
  it('turns the old saved dark/light into an explicit choice, so nobody\'s theme changes on update', () => {
    expect(resolveThemePreference(undefined, true)).toBe('dark');
    expect(resolveThemePreference(undefined, false)).toBe('light');
  });
  it('follows the device on a first launch', () => {
    expect(resolveThemePreference(undefined, undefined)).toBe('system');
  });
  it('ignores damaged values', () => {
    expect(resolveThemePreference('purple', 'yes')).toBe('system');
    expect(resolveThemePreference(7, null)).toBe('system');
    expect(resolveThemePreference('purple', true)).toBe('dark');
  });
});

describe('isDarkFor', () => {
  it('follows the device only for "system"', () => {
    expect(isDarkFor('system', true)).toBe(true);
    expect(isDarkFor('system', false)).toBe(false);
    expect(isDarkFor('light', true)).toBe(false);
    expect(isDarkFor('dark', false)).toBe(true);
  });
});
