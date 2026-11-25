/**
 * Keeps only the tasks that carry a tag (a category id).
 *
 * Robustness / pitfalls guarded against:
 * - No filter (`null`, or an empty id): the SAME array comes back, so nothing is copied or re-rendered.
 * - Old or damaged saved tasks without a `categoryIds` list count as "no tags" instead of throwing.
 * - The input array and its tasks are never changed.
 */
export function filterTasksByTag<T extends { categoryIds?: string[] }>(tasks: T[], tagId: string | null): T[] {
  if (!tagId) return tasks;
  return tasks.filter((task) => task.categoryIds?.includes(tagId) ?? false);
}
