import { describe, expect, it } from 'vitest';
import { computeMovedOrder, nextSelectionId, stepSelection } from './taskNavigation.ts';

const items = (...ids: string[]) => ids.map((id) => ({ id, pinned: false }));

describe('nextSelectionId', () => {
  it('prefers the next row', () => {
    expect(nextSelectionId(['a', 'b', 'c'], 'a')).toBe('b');
    expect(nextSelectionId(['a', 'b', 'c'], 'b')).toBe('c');
  });
  it('falls back to the previous row when the last one goes', () => {
    expect(nextSelectionId(['a', 'b', 'c'], 'c')).toBe('b');
  });
  it('returns null when it was the only row', () => {
    expect(nextSelectionId(['a'], 'a')).toBeNull();
    expect(nextSelectionId([], 'a')).toBeNull();
  });
  it('falls back to the first row when the current id is already gone', () => {
    expect(nextSelectionId(['a', 'b'], 'zzz')).toBe('a');
  });
});

describe('stepSelection', () => {
  it('moves one row and stops at the ends', () => {
    expect(stepSelection(['a', 'b', 'c'], 'a', 1)).toBe('b');
    expect(stepSelection(['a', 'b', 'c'], 'c', 1)).toBe('c');
    expect(stepSelection(['a', 'b', 'c'], 'a', -1)).toBe('a');
    expect(stepSelection(['a', 'b', 'c'], 'b', -1)).toBe('a');
  });
  it('starts at the first row going down and the last row going up when nothing is selected', () => {
    expect(stepSelection(['a', 'b', 'c'], null, 1)).toBe('a');
    expect(stepSelection(['a', 'b', 'c'], null, -1)).toBe('c');
    expect(stepSelection(['a', 'b', 'c'], 'gone', 1)).toBe('a');
  });
  it('returns null for an empty list', () => {
    expect(stepSelection([], null, 1)).toBeNull();
  });
});

describe('computeMovedOrder', () => {
  it('swaps with the neighbour', () => {
    expect(computeMovedOrder(items('a', 'b', 'c'), 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(computeMovedOrder(items('a', 'b', 'c'), 'b', 1)).toEqual(['a', 'c', 'b']);
  });
  it('does nothing at the boundaries', () => {
    expect(computeMovedOrder(items('a', 'b', 'c'), 'a', -1)).toBeNull();
    expect(computeMovedOrder(items('a', 'b', 'c'), 'c', 1)).toBeNull();
  });
  it('does nothing for a single item or an unknown id', () => {
    expect(computeMovedOrder(items('a'), 'a', 1)).toBeNull();
    expect(computeMovedOrder(items('a'), 'a', -1)).toBeNull();
    expect(computeMovedOrder(items('a', 'b'), 'zzz', 1)).toBeNull();
    expect(computeMovedOrder([], 'a', 1)).toBeNull();
  });
  it('does not cross a group boundary (pinned vs not pinned)', () => {
    const list = [
      { id: 'p', pinned: true },
      { id: 'a', pinned: false },
      { id: 'b', pinned: false },
    ];
    const samePin = (x: { pinned: boolean }, y: { pinned: boolean }) => x.pinned === y.pinned;
    expect(computeMovedOrder(list, 'a', -1, samePin)).toBeNull();
    expect(computeMovedOrder(list, 'b', -1, samePin)).toEqual(['p', 'b', 'a']);
  });
  it('never changes its input', () => {
    const list = items('a', 'b', 'c');
    const copy = JSON.stringify(list);
    computeMovedOrder(list, 'b', 1);
    expect(JSON.stringify(list)).toBe(copy);
  });
});
