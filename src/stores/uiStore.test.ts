import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './uiStore.ts';

describe('ticked tasks (bulk selection)', () => {
  beforeEach(() => {
    useUiStore.setState({ checkedTaskIds: [], rangeAnchorId: null, selectedTaskId: null });
  });
  const ids = () => useUiStore.getState().checkedTaskIds;

  it('ticks and unticks one task and forgets the range start', () => {
    useUiStore.getState().setChecked(['a', 'b'], 'a');
    useUiStore.getState().toggleChecked('c');
    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(useUiStore.getState().rangeAnchorId).toBeNull();
    useUiStore.getState().toggleChecked('b');
    expect(ids()).toEqual(['a', 'c']);
  });

  it('replaces the ticked tasks without duplicates and keeps the range start', () => {
    useUiStore.getState().setChecked(['a', 'b', 'a'], 'a');
    expect(ids()).toEqual(['a', 'b']);
    expect(useUiStore.getState().rangeAnchorId).toBe('a');
  });

  it('does not change the state (so nothing redraws) when nothing differs', () => {
    useUiStore.getState().setChecked(['a', 'b'], 'a');
    const before = useUiStore.getState();
    useUiStore.getState().setChecked(['a', 'b'], 'a');
    expect(useUiStore.getState()).toBe(before);
    useUiStore.getState().retainChecked(['a', 'b', 'c']);
    expect(useUiStore.getState()).toBe(before);
    useUiStore.getState().clearChecked();
    const cleared = useUiStore.getState();
    useUiStore.getState().clearChecked();
    expect(useUiStore.getState()).toBe(cleared);
  });

  it('forgets ticked tasks that are not shown any more', () => {
    useUiStore.getState().setChecked(['a', 'b', 'c'], 'b');
    useUiStore.getState().retainChecked(['c', 'a']);
    expect(ids()).toEqual(['a', 'c']);
    expect(useUiStore.getState().rangeAnchorId).toBe('b');
    useUiStore.getState().retainChecked([]);
    expect(ids()).toEqual([]);
    expect(useUiStore.getState().rangeAnchorId).toBeNull();
  });
});
