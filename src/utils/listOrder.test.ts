import { describe, expect, it } from 'vitest';
import { moveWithin } from './listOrder.ts';

describe('moveWithin', () => {
  const ids = ['a', 'b', 'c'];

  it('moves a list up one place', () => {
    expect(moveWithin(ids, 'b', -1)).toEqual(['b', 'a', 'c']);
  });

  it('moves a list down one place', () => {
    expect(moveWithin(ids, 'b', 1)).toEqual(['a', 'c', 'b']);
  });

  it('refuses to move the first list up or the last list down', () => {
    expect(moveWithin(ids, 'a', -1)).toBeNull();
    expect(moveWithin(ids, 'c', 1)).toBeNull();
  });

  it('refuses an unknown list and an empty set', () => {
    expect(moveWithin(ids, 'z', 1)).toBeNull();
    expect(moveWithin([], 'a', 1)).toBeNull();
  });

  it('does not change the array it was given', () => {
    moveWithin(ids, 'a', 1);
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});
