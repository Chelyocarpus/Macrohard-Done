import { useTaskStore } from '../stores/taskStore.ts';
import { useUiStore } from '../stores/uiStore.ts';
import type { BulkChange } from '../stores/task/types.ts';
import { focusTaskRowSoon, getTaskSections, getVisibleTaskIds } from './taskDom.ts';
import { nextSelectionId, rangeBetween, stepSelection } from './taskNavigation.ts';

/**
 * The glue between the screen and the bulk actions of the store: which tasks are ticked, in the order they are
 * shown, and where the keyboard cursor goes afterwards. The selection bar and the keyboard both call these, so they
 * can't drift apart.
 *
 * Robustness / pitfalls guarded against (for all of them):
 * - Only tasks that are ticked AND still exist AND are on screen are acted on, so a task hidden by a filter, a
 *   collapsed "Completed" section or another view is never changed by accident.
 * - The ticked tasks are taken in the order shown, so a move keeps the order the person sees.
 * - Where the cursor goes next is chosen BEFORE the change (the row is removed or redrawn afterwards).
 * - A bulk action that changes nothing (everything already in that state) writes nothing and shows no message; the
 *   store reports what it really changed.
 */

export function selectAndFocus(id: string | null): void {
  useUiStore.getState().selectTask(id);
  if (id) focusTaskRowSoon(id);
}

/** Ticked task ids that exist and are on screen, in the order shown */
export function checkedIdsInOrder(): string[] {
  const checked = new Set(useUiStore.getState().checkedTaskIds);
  if (checked.size === 0) return [];
  const existing = new Set(useTaskStore.getState().tasks.map((task) => task.id));
  return getVisibleTaskIds().filter((id) => checked.has(id) && existing.has(id));
}

/** Ctrl+A: ticks every task on screen. Returns false when there is none. */
export function checkAllVisible(): boolean {
  const ids = getVisibleTaskIds();
  if (ids.length === 0) return false;
  useUiStore.getState().setChecked(ids, null);
  return true;
}

/** Shift+click: ticks everything from the cursor row (or the range's start) to `toId` */
export function checkRangeTo(toId: string): void {
  const ui = useUiStore.getState();
  const visible = getVisibleTaskIds();
  const valid = (id: string | null): id is string => !!id && visible.includes(id);
  const anchor = valid(ui.rangeAnchorId) ? ui.rangeAnchorId : valid(ui.selectedTaskId) ? ui.selectedTaskId : toId;
  ui.setChecked(rangeBetween(visible, anchor, toId), anchor);
  ui.selectTask(toId);
}

/** Shift+Down / Shift+Up: moves the cursor and ticks the range from where it started */
export function extendCheckedRange(delta: 1 | -1): boolean {
  const ui = useUiStore.getState();
  const visible = getVisibleTaskIds();
  const cursor = ui.selectedTaskId && visible.includes(ui.selectedTaskId) ? ui.selectedTaskId : null;
  const target = stepSelection(visible, cursor, delta);
  if (!target) return false;
  const anchor = ui.rangeAnchorId && visible.includes(ui.rangeAnchorId) ? ui.rangeAnchorId : cursor ?? target;
  ui.setChecked(rangeBetween(visible, anchor, target), anchor);
  selectAndFocus(target);
  return true;
}

/** Ticks or unticks the cursor row (X) */
export function toggleCheckedCursor(id: string): void {
  useUiStore.getState().toggleChecked(id);
}

/** Where the cursor goes when these tasks leave the screen: the nearest row that stays, in the same section first */
function cursorAfterRemoval(removedIds: readonly string[]): string | null {
  const visible = getVisibleTaskIds();
  const sections = getTaskSections();
  const removed = new Set(removedIds);
  const selected = useUiStore.getState().selectedTaskId;
  const cursor = selected && visible.includes(selected) ? selected : removedIds[0];
  if (!removed.has(cursor)) return cursor;
  const next = nextSelectionId(visible, cursor, (id) => sections.get(id) ?? 'open', removed);
  return next && !removed.has(next) ? next : null;
}

/** Complete every ticked task, or reopen them when they are all done already. Returns how many changed. */
export function bulkComplete(): number {
  const ids = checkedIdsInOrder();
  if (ids.length === 0) return 0;
  const tasks = useTaskStore.getState().tasks;
  const allDone = ids.every((id) => tasks.find((task) => task.id === id)?.completed);
  const changed = useTaskStore.getState().completeManyTasks(ids, !allDone);
  const ui = useUiStore.getState();
  ui.clearChecked();
  // The completed rows move to the other section; put the keyboard back on the cursor row
  if (ui.selectedTaskId) focusTaskRowSoon(ui.selectedTaskId);
  return changed;
}

/** Applies one change to every ticked task. The ticks stay, so several changes can follow each other. */
export function bulkChange(change: BulkChange): number {
  const ids = checkedIdsInOrder();
  if (ids.length === 0) return 0;
  // Moved to another list they leave this screen (unless it shows every list): the ticks end and the cursor moves on
  const next = change.listId !== undefined ? cursorAfterRemoval(ids) : useUiStore.getState().selectedTaskId;
  const changed = useTaskStore.getState().updateManyTasks(ids, change);
  const ui = useUiStore.getState();
  if (change.listId !== undefined && changed > 0) ui.clearChecked();
  if (next) selectAndFocus(next);
  return changed;
}

/** Sets a yes/no property on every ticked task: on, or off when all of them have it already */
export function bulkToggleFlag(flag: 'important' | 'myDay' | 'pinned'): number {
  const ids = checkedIdsInOrder();
  if (ids.length === 0) return 0;
  const tasks = useTaskStore.getState().tasks;
  const allSet = ids.every((id) => tasks.find((task) => task.id === id)?.[flag]);
  return bulkChange({ [flag]: !allSet });
}

/** Deletes every ticked task (with one Undo) and moves the cursor to the nearest task that stays. */
export function bulkDelete(): number {
  const ids = checkedIdsInOrder();
  if (ids.length === 0) return 0;

  const next = cursorAfterRemoval(ids);

  const deleted = useTaskStore.getState().deleteManyTasks(ids);
  useUiStore.getState().clearChecked();
  selectAndFocus(next);
  return deleted;
}
