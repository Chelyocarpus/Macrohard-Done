import { describe, expect, it } from 'vitest';
import { computeMovedOrder, nextSelectionId, rangeBetween, stepSelection } from './taskNavigation.ts';

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

describe('nextSelectionId with sections', () => {
  // Three open tasks, then the "Completed" part of the page
  const ids = ['o1', 'o2', 'o3', 'd1', 'd2'];
  const sectionOf = (id: string) => (id.startsWith('d') ? 'done' : 'open');

  it('goes back to the previous open task when the last open one is deleted, not into Completed', () => {
    expect(nextSelectionId(ids, 'o3', sectionOf)).toBe('o2');
    // the old behaviour, without sections, jumped to the first completed task
    expect(nextSelectionId(ids, 'o3')).toBe('d1');
  });
  it('still prefers the next row of the same section', () => {
    expect(nextSelectionId(ids, 'o1', sectionOf)).toBe('o2');
    expect(nextSelectionId(ids, 'd1', sectionOf)).toBe('d2');
  });
  it('goes back inside Completed when the last completed task goes', () => {
    expect(nextSelectionId(ids, 'd2', sectionOf)).toBe('d1');
  });
  it('crosses into the other section only when its own section has no other row', () => {
    expect(nextSelectionId(['o1', 'd1', 'd2'], 'o1', sectionOf)).toBe('d1');
    expect(nextSelectionId(['o1', 'o2', 'd1'], 'd1', sectionOf)).toBe('o2');
  });
  it('skips rows that are removed together with the current one', () => {
    const removed = new Set(['o2', 'o3']);
    expect(nextSelectionId(ids, 'o2', sectionOf, removed)).toBe('o1');
    expect(nextSelectionId(ids, 'o1', sectionOf, new Set(['o1', 'o2']))).toBe('o3');
    expect(nextSelectionId(['a', 'b'], 'a', undefined, new Set(['a', 'b']))).toBeNull();
  });
});

describe('rangeBetween', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  it('includes both ends, whichever comes first', () => {
    expect(rangeBetween(ids, 'b', 'd')).toEqual(['b', 'c', 'd']);
    expect(rangeBetween(ids, 'd', 'b')).toEqual(['b', 'c', 'd']);
    expect(rangeBetween(ids, 'c', 'c')).toEqual(['c']);
  });
  it('never selects everything because of a stale start', () => {
    expect(rangeBetween(ids, 'gone', 'c')).toEqual(['c']);
    expect(rangeBetween(ids, 'a', 'gone')).toEqual([]);
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
