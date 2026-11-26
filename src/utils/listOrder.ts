/**
 * The ids of a list's siblings in their new order after moving `id` one place up (`-1`) or down (`1`).
 * Returns null when the move is not possible (the list is not there, or already first/last), so the caller can leave
 * the order untouched and the menu can switch the item off.
 */
export function moveWithin(ids: readonly string[], id: string, delta: -1 | 1): string[] | null {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
