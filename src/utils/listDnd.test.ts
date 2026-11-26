import { describe, expect, it } from 'vitest';
import { resolveListDrop, UNGROUP_TARGET_ID } from './listDnd.ts';

const lists = [
  { id: 'a', groupId: null },
  { id: 'b', groupId: 'g1' },
  { id: 'c', groupId: 'g1' },
  { id: 'd', groupId: undefined },
];

describe('resolveListDrop', () => {
  it('takes a list out of its group when dropped on the ungroup target', () => {
    expect(resolveListDrop({ activeId: 'b', overId: UNGROUP_TARGET_ID, lists })).toEqual({ kind: 'group', groupId: null });
  });

  it('puts a grouped list next to a row of another group, before it when dropped on its upper half', () => {
    expect(resolveListDrop({ activeId: 'a', overId: 'b', lists, activeCenterY: 10, overCenterY: 20 })).toEqual({
      kind: 'position', groupId: 'g1', beforeListId: 'b', afterListId: undefined,
    });
  });

  it('puts it after the row when dropped on the lower half, and ungrouped rows count as group null', () => {
    expect(resolveListDrop({ activeId: 'b', overId: 'a', lists, activeCenterY: 30, overCenterY: 20 })).toEqual({
      kind: 'position', groupId: null, beforeListId: undefined, afterListId: 'a',
    });
    expect(resolveListDrop({ activeId: 'b', overId: 'd', lists, activeCenterY: 30, overCenterY: 20 })?.kind).toBe('position');
  });

  it('uses the gap between rows as given', () => {
    expect(resolveListDrop({ activeId: 'a', overId: 'drop-group-g1-1', overData: { type: 'position', groupId: 'g1', afterListId: 'b' }, lists })).toEqual({
      kind: 'position', groupId: 'g1', beforeListId: undefined, afterListId: 'b',
    });
  });

  it('does nothing when dropped next to itself or on itself', () => {
    expect(resolveListDrop({ activeId: 'b', overId: 'x', overData: { type: 'position', groupId: 'g1', afterListId: 'b' }, lists })).toBeNull();
    expect(resolveListDrop({ activeId: 'b', overId: 'b', lists })).toBeNull();
  });

  it('moves to the end of a group on its heading, and out of groups on the ungrouped area', () => {
    expect(resolveListDrop({ activeId: 'a', overId: 'group-g1', lists })).toEqual({ kind: 'group', groupId: 'g1' });
    expect(resolveListDrop({ activeId: 'b', overId: 'group-null', lists })).toEqual({ kind: 'group', groupId: null });
  });

  it('ignores unknown lists and targets', () => {
    expect(resolveListDrop({ activeId: 'zzz', overId: 'a', lists })).toBeNull();
    expect(resolveListDrop({ activeId: 'a', overId: 'zzz', lists })).toBeNull();
  });
});
