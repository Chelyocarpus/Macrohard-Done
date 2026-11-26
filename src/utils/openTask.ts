import { useTaskStore } from '../stores/taskStore.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { useToastStore } from '../stores/toastStore.ts';

/**
 * Shows a task: goes to its list and opens its details. Used when a reminder is clicked.
 * Returns false (and says so) when the task is gone, for example deleted after the reminder was set.
 *
 * The view change closes any open details (see App.tsx), so the details are opened a moment later, once the new
 * view has been drawn.
 */
export function openTaskFromReminder(taskId: string): boolean {
  const store = useTaskStore.getState();
  const task = store.tasks.find((item) => item.id === taskId);
  if (!task) {
    useToastStore.getState().showInfo('That task is not here any more', 'It may have been deleted or belong to another profile.');
    return false;
  }
  const list = store.lists.find((item) => item.id === task.listId);
  const ui = useUiStore.getState();
  ui.setTagFilter(null);
  if (!list || list.isSystem) {
    if (store.currentView !== 'all') store.setView('all');
  } else if (store.currentView !== 'list' || store.currentListId !== list.id) {
    store.setView('list', list.id);
  }
  window.setTimeout(() => useUiStore.getState().openTaskDetails(taskId), 80);
  return true;
}
