/**
 * Pure helpers for moving the selection and moving tasks with the keyboard.
 */

/**
 * Which row to select after the current one was completed, deleted or moved away: the next one, or the
 * previous one when it was last, or nothing when it was the only one.
 *
 * Robustness / pitfalls guarded against:
 * - A current id that is not in the list (already gone) falls back to the first row instead of
 *   throwing or returning a stale id.
 * - The returned id is never the current one, so focus can't "stay" on a row that is disappearing.
 */
export function nextSelectionId(ids: readonly string[], currentId: string): string | null {
  const index = ids.indexOf(currentId);
  if (index === -1) return ids.find((id) => id !== currentId) ?? null;
  return ids[index + 1] ?? ids[index - 1] ?? null;
}

/**
 * Arrow-key movement: one row down (+1) or up (-1), stopping at the ends instead of wrapping.
 * With nothing selected, Down starts at the first row and Up at the last.
 */
export function stepSelection(ids: readonly string[], currentId: string | null, delta: 1 | -1): string | null {
  if (ids.length === 0) return null;
  const index = currentId === null ? -1 : ids.indexOf(currentId);
  if (index === -1) return delta === 1 ? ids[0] : ids[ids.length - 1];
  const target = Math.min(ids.length - 1, Math.max(0, index + delta));
  return ids[target];
}

/**
 * New order of ids after moving one item one step up (-1) or down (+1), or null when nothing should
 * change.
 *
 * Robustness / pitfalls guarded against:
 * - Boundaries: moving the first item up or the last item down returns null (no wrap-around, no
 *   out-of-range index).
 * - Unknown id: returns null instead of guessing.
 * - Groups: an item only swaps with a neighbour of the same group (`sameGroup`), so a pinned task can't
 *   "move" below an unpinned one, which the list would immediately sort back and look like a no-op.
 * - The input array is never changed.
 */
export function computeMovedOrder<T extends { id: string }>(
  items: readonly T[],
  id: string,
  delta: -1 | 1,
  sameGroup: (a: T, b: T) => boolean = () => true,
): string[] | null {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const target = index + delta;
  if (target < 0 || target >= items.length) return null;
  if (!sameGroup(items[index], items[target])) return null;
  const ids = items.map((item) => item.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  return ids;
}
