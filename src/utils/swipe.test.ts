import { describe, expect, it } from 'vitest';
import { SWIPE_COMMIT_PX, SWIPE_MAX_PX, classifySwipe, resolveSwipe, swipeOffset } from './swipe.ts';

describe('classifySwipe', () => {
  it('waits until the finger has moved a little', () => {
    expect(classifySwipe(3, 2)).toBe('undecided');
    expect(classifySwipe(-9, 0)).toBe('undecided');
  });
  it('calls a clearly sideways move horizontal', () => {
    expect(classifySwipe(30, 5)).toBe('horizontal');
    expect(classifySwipe(-30, 10)).toBe('horizontal');
  });
  it('calls a mostly vertical or diagonal move vertical, so scrolling is never taken for a swipe', () => {
    expect(classifySwipe(5, 30)).toBe('vertical');
    expect(classifySwipe(20, 20)).toBe('vertical');
    expect(classifySwipe(24, 20)).toBe('vertical'); // not 1.5 times as far across
  });
  it('keeps the first decision', () => {
    expect(classifySwipe(200, 0, 'vertical')).toBe('vertical');
    expect(classifySwipe(0, 200, 'horizontal')).toBe('horizontal');
  });
});

describe('resolveSwipe', () => {
  it('right adds to My Day, left deletes, but only past the threshold', () => {
    expect(resolveSwipe(SWIPE_COMMIT_PX, 'horizontal')).toBe('my-day');
    expect(resolveSwipe(-SWIPE_COMMIT_PX, 'horizontal')).toBe('delete');
    expect(resolveSwipe(SWIPE_COMMIT_PX - 1, 'horizontal')).toBeNull();
    expect(resolveSwipe(-(SWIPE_COMMIT_PX - 1), 'horizontal')).toBeNull();
  });
  it('does nothing for a vertical or undecided gesture, however far it went', () => {
    expect(resolveSwipe(500, 'vertical')).toBeNull();
    expect(resolveSwipe(-500, 'undecided')).toBeNull();
  });
  it('does nothing for a broken number', () => {
    expect(resolveSwipe(NaN, 'horizontal')).toBeNull();
    expect(resolveSwipe(Infinity, 'horizontal')).toBeNull();
  });
});

describe('swipeOffset', () => {
  it('follows the finger and stops at the maximum', () => {
    expect(swipeOffset(50)).toBe(50);
    expect(swipeOffset(-50)).toBe(-50);
    expect(swipeOffset(1000)).toBe(SWIPE_MAX_PX);
    expect(swipeOffset(-1000)).toBe(-SWIPE_MAX_PX);
  });
  it('stays put for a broken number', () => {
    expect(swipeOffset(NaN)).toBe(0);
  });
});
