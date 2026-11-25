import { useEffect } from 'react';
import { useTaskStore } from '../stores/taskStore.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { resolveHotkey, type HotkeyContext, type HotkeyId } from '../utils/hotkeys.ts';
import { computeMovedOrder, nextSelectionId, stepSelection } from '../utils/taskNavigation.ts';
import { findTaskRow, focusTaskRowSoon, getVisibleTaskIds } from '../utils/taskDom.ts';
import { sortTasks } from '../utils/taskSort.ts';
import { toggleTaskWithHold } from '../utils/completeTask.ts';

/** Window events other components listen for (the keyboard hook doesn't own those controls). */
export const QUICK_ADD_EVENT = 'app:quick-add';
export const FOCUS_SEARCH_EVENT = 'app:focus-search';
/** From the sidebar's search box (Enter, arrow down): move into the results */
export const SEARCH_RESULTS_EVENT = 'app:search-results';

/** Describes where focus is, in the terms `resolveHotkey` understands. */
function readContext(target: EventTarget | null): HotkeyContext {
  const el = target instanceof HTMLElement ? target : null;
  const isTextInput = !!el && (
    el.isContentEditable
    || el.tagName === 'TEXTAREA'
    || el.tagName === 'SELECT'
    || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|range|color|file)$/i.test((el as HTMLInputElement).type))
  );
  let zone: HotkeyContext['zone'] = 'other';
  if (!el || el === document.body || el === document.documentElement) zone = 'body';
  else if (el.hasAttribute('data-task-id')) zone = 'task';
  else if ((el.tagName === 'BUTTON' || el.tagName === 'A') && !/^(radio|tab|menuitem|menuitemradio|menuitemcheckbox|option|slider|switch|combobox|spinbutton)$/.test(el.getAttribute('role') ?? '')) zone = 'button';
  return {
    typing: isTextInput,
    zone,
    modalOpen: !!document.querySelector('[aria-modal="true"], [role="menu"]'),
  };
}

/** The selected task, but only if it still exists and is on screen (a stale selection must do nothing). */
function getSelectedTaskId(): string | null {
  const id = useUiStore.getState().selectedTaskId;
  if (!id) return null;
  if (!useTaskStore.getState().tasks.some((task) => task.id === id)) return null;
  return findTaskRow(id) ? id : null;
}

function selectAndFocus(id: string | null) {
  useUiStore.getState().selectTask(id);
  if (id) focusTaskRowSoon(id);
}

/**
 * Moves the selected task one step in a manually ordered list (Alt+Up / Alt+Down).
 *
 * Robustness / pitfalls guarded against:
 * - Not in a manually ordered list (smart lists, sorted lists, reversed order): nothing is written and
 *   a message explains why, instead of silently doing nothing or changing a hidden order.
 * - First task up / last task down, completed tasks, unknown ids: no write (`computeMovedOrder`).
 * - Pinned tasks stay above unpinned ones: swaps never cross that line, so the move can't be undone by
 *   the list's own pinned-first sorting.
 * - Search filter active: `reorderTasks` only reorders the visible ids inside their own slots, so hidden
 *   tasks keep their places.
 * - Stale state: the order is computed from the store at the moment of the key press, not from an
 *   earlier render, and the write is one synchronous `reorderTasks` call (no partial update).
 * - Holding the key down repeats the move, one committed step at a time; each step re-reads the store.
 */
function moveSelectedTask(taskId: string, delta: -1 | 1): void {
  const state = useTaskStore.getState();
  const info = (message: string) => useToastStore.getState().showInfo('Can\'t move this task', message, 4000);

  if (state.currentView !== 'list' || !state.currentListId) {
    info('Open a list to put its tasks in your own order.');
    return;
  }
  const list = state.lists.find((l) => l.id === state.currentListId);
  if (!list || (list.sortMode ?? 'manual') !== 'manual' || list.sortReverse) {
    info('Set the list\'s sort order to manual to move tasks.');
    return;
  }

  const ordered = sortTasks(state.getTasksForCurrentView(), 'manual', false);
  const active = ordered.filter((task) => !task.completed);
  const completed = ordered.filter((task) => task.completed);
  const isPinned = (task: { pinned: boolean; pinnedGlobally: boolean }) => task.pinned || task.pinnedGlobally;
  const moved = computeMovedOrder(active, taskId, delta, (a, b) => isPinned(a) === isPinned(b));
  if (!moved) return; // at an edge, a completed task, or across the pinned line

  state.reorderTasks([...moved, ...completed.map((task) => task.id)], state.currentListId);
  focusTaskRowSoon(taskId);
}

/**
 * Runs one action for the selected task, or an app-level action. Returns true when the key press was
 * used (so the browser's own behaviour, like Space scrolling the page, is prevented).
 *
 * Robustness / pitfalls guarded against:
 * - Stale selection: the id must still exist in the store AND be on screen, otherwise the key does
 *   nothing, so a task from another view is never changed by accident.
 * - Where focus goes next: for complete and delete the neighbouring row is chosen BEFORE the change,
 *   because the row is removed or re-created in another section afterwards.
 * - Delete and complete go through the store's own actions, which already show an Undo message and
 *   guard against double undo, so Ctrl+Z reaches the same safety net.
 * - Unknown ids make the store actions show an error or do nothing; no partial state is written here.
 */
function runHotkey(action: HotkeyId): boolean {
  const ui = useUiStore.getState();
  const store = useTaskStore.getState();

  switch (action) {
    case 'help':
      ui.setHelpOpen(true);
      return true;
    case 'search':
      window.dispatchEvent(new CustomEvent(FOCUS_SEARCH_EVENT));
      return true;
    case 'new-task':
      window.dispatchEvent(new CustomEvent(QUICK_ADD_EVENT));
      return true;
    case 'undo':
      return useToastStore.getState().undoLatest();
    case 'go-my-day':
      store.setView('my-day');
      return true;
    case 'go-important':
      store.setView('important');
      return true;
    case 'go-planned':
      store.setView('planned');
      return true;
    case 'go-tasks':
      store.setView('all');
      return true;
    case 'select-next':
    case 'select-previous': {
      const next = stepSelection(getVisibleTaskIds(), getSelectedTaskId(), action === 'select-next' ? 1 : -1);
      if (!next) return false;
      selectAndFocus(next);
      return true;
    }
    default:
      break;
  }

  const id = getSelectedTaskId();
  if (!id) return false;

  switch (action) {
    case 'complete': {
      const next = nextSelectionId(getVisibleTaskIds(), id);
      toggleTaskWithHold(id);
      selectAndFocus(next);
      return true;
    }
    case 'delete': {
      const next = nextSelectionId(getVisibleTaskIds(), id);
      store.deleteTask(id);
      selectAndFocus(next);
      return true;
    }
    case 'important':
    case 'pin':
    case 'my-day': {
      const next = nextSelectionId(getVisibleTaskIds(), id);
      if (action === 'important') store.toggleImportant(id);
      else if (action === 'pin') store.togglePin(id);
      else store.toggleMyDay(id);
      // In Important or My Day the row may disappear (a pinned one moves to the top); otherwise it stays selected and focused
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        selectAndFocus(findTaskRow(id) ? id : next);
      }));
      return true;
    }
    case 'open':
      ui.openTaskDetails(id);
      return true;
    case 'due-date':
      ui.openTaskDetails(id, 'due');
      return true;
    case 'reminder':
      ui.openTaskDetails(id, 'reminder');
      return true;
    case 'move-to-list':
      ui.openTaskDetails(id, 'list');
      return true;
    case 'move-up':
      moveSelectedTask(id, -1);
      return true;
    case 'move-down':
      moveSelectedTask(id, 1);
      return true;
    default:
      return false;
  }
}

/** Listens for the keyboard map (see utils/hotkeys.ts) for the whole app. Mount once. */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const action = resolveHotkey(event, readContext(event.target));
      if (!action) return;
      if (runHotkey(action)) event.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
