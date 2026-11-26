import { startOfDay } from 'date-fns';
import type { Task } from '../../types/index.ts';
import { useToastStore } from '../toastStore.ts';
import { buildNextOccurrence, deduplicateCategoryIds, toDayKey } from './helpers.ts';
import type { BulkChange, StoreContext, TaskStore } from './types.ts';

/** More than this in one go is a mistake (or a script), and one message could not describe it */
export const MAX_BULK_TASKS = 1000;

const plural = (count: number) => `${count} task${count === 1 ? '' : 's'}`;

/** The task with `change` applied, or the SAME task when the change would not alter it (so it is not counted or stamped). */
export function applyBulkChange(task: Task, change: BulkChange, now: Date, order?: number): Task {
  let next = task;
  const set = (patch: Partial<Task>) => { next = { ...next, ...patch }; };

  if (change.important !== undefined && task.important !== change.important) set({ important: change.important });
  if (change.myDay !== undefined && task.myDay !== change.myDay) {
    set({ myDay: change.myDay, myDayDate: change.myDay ? toDayKey() : undefined });
  }
  if (change.pinned !== undefined && task.pinned !== change.pinned) set({ pinned: change.pinned });
  if (change.dueDate !== undefined) {
    const current = task.dueDate ? new Date(task.dueDate).getTime() : null;
    const wanted = change.dueDate ? startOfDay(change.dueDate).getTime() : null;
    if (current !== wanted) set({ dueDate: change.dueDate ? startOfDay(change.dueDate) : undefined });
  }
  if (change.listId !== undefined && task.listId !== change.listId) {
    set({ listId: change.listId, ...(order !== undefined ? { order } : {}) });
  }
  if (change.addTagIds?.length || change.removeTagIds?.length) {
    const removed = new Set(change.removeTagIds ?? []);
    const tags = deduplicateCategoryIds([...task.categoryIds, ...(change.addTagIds ?? [])]).filter((id) => !removed.has(id));
    if (tags.length !== task.categoryIds.length || tags.some((id, index) => id !== task.categoryIds[index])) set({ categoryIds: tags });
  }
  return next === task ? task : { ...next, updatedAt: now };
}

/** A short sentence for the Undo message, e.g. "Moved 3 tasks to Work" */
export function describeBulkChange(change: BulkChange, count: number, names: { listName?: string; tagNames?: Record<string, string> }): string {
  const n = plural(count);
  if (change.listId !== undefined) return `Moved ${n} to ${names.listName ?? 'another list'}`;
  if (change.dueDate !== undefined) return change.dueDate ? `Due date set for ${n}` : `Due date cleared for ${n}`;
  if (change.important !== undefined) return change.important ? `Marked ${n} important` : `Removed importance from ${n}`;
  if (change.myDay !== undefined) return change.myDay ? `Added ${n} to My Day` : `Removed ${n} from My Day`;
  if (change.pinned !== undefined) return change.pinned ? `Pinned ${n}` : `Unpinned ${n}`;
  const tagName = (id: string) => `#${names.tagNames?.[id] ?? 'tag'}`;
  if (change.addTagIds?.length) return `Tagged ${n} ${change.addTagIds.map(tagName).join(' ')}`;
  if (change.removeTagIds?.length) return `Removed ${change.removeTagIds.map(tagName).join(' ')} from ${n}`;
  return `Updated ${n}`;
}

/** Task actions for many tasks at once (the selection bar and the keyboard): one change, one save, one Undo. */
export const createBulkActions = ({ set, get, saveState }: StoreContext): Pick<TaskStore, 'updateManyTasks' | 'completeManyTasks' | 'deleteManyTasks'> => {
  /** Existing tasks for these ids, once each, in the order given, capped */
  const existing = (ids: readonly string[]): Task[] => {
    const wanted = Array.from(new Set(ids)).slice(0, MAX_BULK_TASKS);
    const byId = new Map(get().tasks.map((task) => [task.id, task]));
    return wanted.flatMap((id) => {
      const task = byId.get(id);
      return task ? [task] : [];
    });
  };

  /**
   * Writes the edits in one state change and offers one Undo that puts every task back.
   * Undo only touches a task that is still exactly as this change left it (same `updatedAt`), so something edited in
   * the meantime is never overwritten; those are counted and reported.
   */
  const commit = (edits: { before: Task; after: Task; added?: Task }[], now: Date, title: string, description?: string) => {
    const byId = new Map(edits.map((edit) => [edit.before.id, edit]));
    const added = edits.flatMap((edit) => (edit.added ? [edit.added] : []));
    set((state) => ({
      tasks: [...state.tasks.map((task) => byId.get(task.id)?.after ?? task), ...added],
    }));
    saveState();

    useToastStore.getState().showUndo(title, description ?? '', () => {
      let skipped = 0;
      const addedIds = new Set(added.map((task) => task.id));
      set((state) => ({
        // An added next occurrence goes away only while it is still open, like undoing a single completion
        tasks: state.tasks
          .filter((task) => !(addedIds.has(task.id) && !task.completed))
          .map((task) => {
            const edit = byId.get(task.id);
            if (!edit) return task;
            if (new Date(task.updatedAt).getTime() !== now.getTime()) {
              skipped++;
              return task;
            }
            return edit.before;
          }),
      }));
      saveState();
      if (skipped > 0) {
        useToastStore.getState().showInfo('Some tasks were not restored', `${plural(skipped)} changed since, so they were left as they are.`);
      }
    });
  };

  return {
    /**
     * Applies one change (important, My Day, pin, due date, list, tags) to many tasks. Returns how many tasks it
     * really changed.
     *
     * Robustness / pitfalls guarded against:
     * - Stale ids (deleted meanwhile) and duplicates are ignored; at most MAX_BULK_TASKS are changed.
     * - A task the change would not alter (already important, already in that list) is not touched, stamped or
     *   counted, so "Mark important" on a mixed selection says how many really changed, and a no-op writes nothing
     *   and shows no message.
     * - Moving to a list that no longer exists changes nothing and says so.
     * - Moved tasks go to the end of the target list in the order given, so orders never collide.
     * - One state update, one save, one Undo (see `commit`).
     */
    updateManyTasks: (ids, change) => {
      const targets = existing(ids);
      if (targets.length === 0) return 0;

      let listName: string | undefined;
      let nextOrder = 0;
      if (change.listId !== undefined) {
        const list = change.listId === 'all' ? { name: 'Tasks' } : get().lists.find((l) => l.id === change.listId && !l.isSystem);
        if (!list) {
          useToastStore.getState().showError('List not found', 'The list you chose no longer exists');
          return 0;
        }
        listName = list.name;
        const movingIds = new Set(targets.map((task) => task.id));
        const orders = get().tasks.filter((task) => task.listId === change.listId && !movingIds.has(task.id)).map((task) => task.order);
        nextOrder = orders.length === 0 ? 0 : Math.max(...orders) + 1;
      }

      const now = new Date();
      const edits: { before: Task; after: Task }[] = [];
      for (const task of targets) {
        const after = applyBulkChange(task, change, now, change.listId !== undefined && task.listId !== change.listId ? nextOrder++ : undefined);
        if (after !== task) edits.push({ before: task, after });
      }
      if (edits.length === 0) return 0;

      const tagNames = Object.fromEntries(get().categories.map((category) => [category.id, category.name]));
      commit(edits, now, describeBulkChange(change, edits.length, { listName, tagNames }));
      return edits.length;
    },

    /**
     * Completes (or reopens) many tasks. Returns how many changed.
     *
     * Robustness / pitfalls guarded against:
     * - Only tasks that are not already in the wanted state change, so completing a mixed selection counts right.
     * - Repeating tasks create their next occurrence, exactly as completing one by hand does.
     * - Undo reopens them and removes the occurrences it created while they are still open.
     */
    completeManyTasks: (ids, completed) => {
      const targets = existing(ids).filter((task) => task.completed !== completed);
      if (targets.length === 0) return 0;

      const now = new Date();
      const edits = targets.map((before) => {
        const next = completed ? buildNextOccurrence(before, now) : undefined;
        return {
          before,
          after: { ...before, completed, repeatSpawnedId: next?.id, updatedAt: now },
          added: next,
        };
      });
      const repeating = edits.filter((edit) => edit.added).length;
      commit(
        edits,
        now,
        completed ? `${plural(edits.length)} completed` : `${plural(edits.length)} reopened`,
        repeating > 0 ? `${repeating} repeating: the next ones were added` : undefined,
      );
      return edits.length;
    },

    /**
     * Deletes many tasks with one Undo. Returns how many were deleted.
     *
     * Robustness / pitfalls guarded against:
     * - Stale ids are ignored, so nothing is reported as deleted that was already gone.
     * - Undo puts back only tasks that are still missing (a second Undo, or one already restored, never duplicates)
     *   and a task whose list was deleted meanwhile goes to Tasks instead of pointing at nothing.
     */
    deleteManyTasks: (ids) => {
      const targets = existing(ids);
      if (targets.length === 0) return 0;

      const removed = new Set(targets.map((task) => task.id));
      set((state) => ({ tasks: state.tasks.filter((task) => !removed.has(task.id)) }));
      saveState();

      useToastStore.getState().showUndo(`${plural(targets.length)} deleted`, targets.length === 1 ? `"${targets[0].title}" was removed` : 'They were removed', () => {
        const present = new Set(get().tasks.map((task) => task.id));
        const lists = new Set(get().lists.map((list) => list.id));
        const back = targets
          .filter((task) => !present.has(task.id))
          .map((task) => (task.listId === 'all' || lists.has(task.listId) ? task : { ...task, listId: 'all' }));
        if (back.length === 0) return;
        set((state) => ({ tasks: [...state.tasks, ...back] }));
        saveState();
      });
      return targets.length;
    },
  };
};
