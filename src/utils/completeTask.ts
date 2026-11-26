import { useTaskStore } from '../stores/taskStore.ts';
import { useCompletionHoldStore } from '../stores/completionHoldStore.ts';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Completes or reopens a task, like `toggleTask`, and keeps a just-completed row in place for a moment
 * before it slides into "Completed". Use this for anything the person does by hand (checkbox, keyboard,
 * menu).
 *
 * Robustness / pitfalls guarded against:
 * - The hold only starts when the task really ended up completed (checked after the change), so a
 *   failed toggle (unknown id) never leaves a phantom hold.
 * - Reopening (including toggling again during the hold) cancels the hold, so the row is never
 *   collapsed or moved while it is open again.
 * - Reduced motion: no waiting and no animation; the row moves at once.
 * - Saving, Undo and repeating tasks are all handled by `toggleTask` itself; this wrapper adds no write
 *   of its own, so nothing can be saved twice or half-saved.
 * - Undo from the message during the hold is handled by the list: a hold only counts while the task is
 *   still completed.
 */
export function toggleTaskWithHold(id: string): void {
  const store = useTaskStore.getState();
  const before = store.tasks.find((task) => task.id === id);
  store.toggleTask(id);
  const after = useTaskStore.getState().tasks.find((task) => task.id === id);

  const hold = useCompletionHoldStore.getState();
  if (before && !before.completed && after?.completed && !prefersReducedMotion()) hold.start(id);
  else hold.cancel(id);
}
