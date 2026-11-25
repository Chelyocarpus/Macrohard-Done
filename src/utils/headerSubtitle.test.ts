import { describe, expect, it } from 'vitest';
import { headerSubtitle } from './headerSubtitle.ts';

describe('headerSubtitle', () => {
  it('shows the date in My Day', () => {
    const text = headerSubtitle('my-day', 3, new Date(2026, 10, 23));
    expect(text).toBe('Monday, November 23');
  });

  it('counts open tasks in the other task pages, in the singular for one', () => {
    expect(headerSubtitle('list', 5)).toBe('5 open tasks');
    expect(headerSubtitle('category', 1)).toBe('1 open task');
    expect(headerSubtitle('important', 0)).toBe('Nothing to do');
  });

  it('shows nothing in Search and Settings, or for a count that makes no sense', () => {
    expect(headerSubtitle('search', 4)).toBeUndefined();
    expect(headerSubtitle('settings', 4)).toBeUndefined();
    expect(headerSubtitle('list', -1)).toBeUndefined();
    expect(headerSubtitle('list', NaN)).toBeUndefined();
  });
});
