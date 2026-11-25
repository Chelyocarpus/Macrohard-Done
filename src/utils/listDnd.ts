import { closestCenter, pointerWithin, type CollisionDetection } from '@dnd-kit/core';

/** Id of the "take it out of its group" target that shows while a grouped list is being dragged. */
export const UNGROUP_TARGET_ID = 'ungroup-target';

export type ListDropAction =
  | { kind: 'position'; groupId: string | null; beforeListId?: string; afterListId?: string }
  | { kind: 'group'; groupId: string | null };

interface DropData {
  type?: string;
  groupId?: string | null;
  beforeListId?: string;
  afterListId?: string;
}

interface ResolveInput {
  activeId: string;
  overId: string;
  overData?: DropData;
  lists: ReadonlyArray<{ id: string; groupId?: string | null }>;
  /** Vertical centre of the dragged row and of the row it is over: decides "before" or "after" */
  activeCenterY?: number;
  overCenterY?: number;
}

/**
 * Turns "this list was dropped on that" into one move, or null when nothing should change.
 * A row, a thin gap between rows, a group heading and the ungroup target can all be dropped on.
 */
export function resolveListDrop(input: ResolveInput): ListDropAction | null {
  const { activeId, overId, overData, lists, activeCenterY, overCenterY } = input;
  if (activeId === overId) return null;
  if (!lists.some((list) => list.id === activeId)) return null;

  if (overId === UNGROUP_TARGET_ID) return { kind: 'group', groupId: null };

  if (overData?.type === 'position') {
    // Dropping next to itself changes nothing
    if (overData.beforeListId === activeId || overData.afterListId === activeId) return null;
    return {
      kind: 'position',
      groupId: overData.groupId ?? null,
      beforeListId: overData.beforeListId,
      afterListId: overData.afterListId,
    };
  }

  // A group heading ("group-<id>") or the ungrouped area ("group-null"): at the end of that group
  if (overId.startsWith('group-')) {
    const groupId = overId.slice('group-'.length);
    return { kind: 'group', groupId: groupId === 'null' ? null : groupId };
  }

  // A list row: next to it, in whatever group it is in. The half of the row the pointer is in decides before or after.
  const overList = lists.find((list) => list.id === overId);
  if (!overList) return null;
  const after = activeCenterY !== undefined && overCenterY !== undefined && activeCenterY > overCenterY;
  return {
    kind: 'position',
    groupId: overList.groupId ?? null,
    beforeListId: after ? undefined : overList.id,
    afterListId: after ? overList.id : undefined,
  };
}

/** Lower number wins when the pointer is over several drop targets at once. */
function rank(id: string): number {
  if (id === UNGROUP_TARGET_ID) return 0;
  if (id === 'group-null') return 4; // the whole ungrouped area: only when no row is under the pointer
  if (id.startsWith('group-')) return 3; // a group heading
  if (id.startsWith('drop-')) return 2; // a thin gap between rows
  return 1; // a list row
}

/**
 * Picks the target under the pointer (the nearest centre was too eager to pick a row far from where the pointer is,
 * and the thin gaps could hardly be hit). Falls back to the nearest centre when the pointer is over nothing.
 */
export const listCollisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length === 0) return closestCenter(args);
  return [...hits].sort((a, b) => rank(String(a.id)) - rank(String(b.id))).slice(0, 1);
};
