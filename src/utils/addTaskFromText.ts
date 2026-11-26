import { useTaskStore } from '../stores/taskStore.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { planQuickAdd } from './quickAdd.ts';

/**
 * Creates a task from what was typed into an add bar: "Ship invoice #work ! friday @Clients" becomes the task
 * "Ship invoice", tagged work, important, due Friday, in the list Clients (see utils/quickAdd.ts).
 * Returns true when the task was created, false when it was not (the store has already shown why), so the caller
 * can keep the typed text.
 *
 * Robustness / pitfalls guarded against:
 * - The view, tags and lists are read from the store at the moment of adding, not from an earlier render, so a tag
 *   or list renamed a second ago is matched by its current name.
 * - Words that look like a tag or list but match none stay in the title; one message says so, so a typo is noticed.
 *   That message is a courtesy and can't turn a created task into a reported failure.
 * - One `addTask` call writes the task (all or nothing); this function adds no second write.
 */
export function addTaskFromText(text: string): boolean {
  const state = useTaskStore.getState();
  const plan = planQuickAdd(text, {
    view: state.currentView,
    currentListId: state.currentListId,
    currentCategoryId: state.currentCategoryId,
    categories: state.categories,
    lists: state.lists,
  });

  const created = state.addTask(plan.title, plan.listId, plan.options);
  if (created && plan.parsed.unmatched.length > 0) {
    try {
      useToastStore.getState().showInfo('Not recognised', `${plan.parsed.unmatched.join(', ')} stayed in the title. Check the tag or list name.`);
    } catch {
      // ignore: the task exists
    }
  }
  return created;
}
