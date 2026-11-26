/**
 * Small DOM helpers for keyboard navigation between task rows. Rows carry `data-task-id`.
 */

/** Ids of the task rows currently on screen, in the order they appear (pinned, sections and all). */
export function getVisibleTaskIds(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-task-id]'))
    .map((row) => row.dataset.taskId)
    .filter((id): id is string => !!id);
}

/**
 * Which section each shown row is in: "open" or "done" (the "Completed" part of the page). A row that was just
 * completed still counts as open while it waits in place (see completeTask.ts).
 */
export function getTaskSections(): Map<string, string> {
  const sections = new Map<string, string>();
  document.querySelectorAll<HTMLElement>('[data-task-id]').forEach((row) => {
    if (row.dataset.taskId) sections.set(row.dataset.taskId, row.dataset.taskSection ?? 'open');
  });
  return sections;
}

export function findTaskRow(id: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-task-id]')).find((row) => row.dataset.taskId === id) ?? null;
}

/**
 * Puts keyboard focus on a task's row once React has drawn the change that triggered it.
 *
 * Robustness / pitfalls guarded against:
 * - The row may not exist yet (it moves to another section after being completed) or any more
 *   (deleted): two animation frames give React time to commit, and a missing row is simply skipped.
 * - Focus must not yank the page when the person has meanwhile started typing somewhere else: if a text
 *   field has focus by then, focus is left alone. (`force` is for when moving out of a text field IS the
 *   point, e.g. pressing Down in the search box.)
 * - Keeps the row on screen (`nearest`, so it doesn't jump when already visible).
 */
export function focusTaskRowSoon(id: string, options: { force?: boolean } = {}): void {
  if (typeof window === 'undefined') return;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!options.force && active instanceof HTMLElement && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))) return;
      const row = findTaskRow(id);
      if (!row) return;
      row.focus({ preventScroll: true });
      row.scrollIntoView({ block: 'nearest' });
    });
  });
}
