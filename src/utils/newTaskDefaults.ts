import { startOfDay } from 'date-fns';

export interface NewTaskDefaults {
  listId: string;
  categoryIds?: string[];
  myDay?: boolean;
  important?: boolean;
  dueDate?: Date;
}

/**
 * What a task created from the current view should start with, so it shows up in the view it was
 * created in (the smart views are filters, not real lists):
 * - My Day    -> added to My Day
 * - Important -> marked important
 * - Planned   -> due today (the view lists tasks that have a due date or a reminder)
 * - a list    -> stored in that list
 * - a category-> tagged with that category
 * Every other view (Tasks, ...) stores the task in the default "Tasks" list unchanged.
 */
export function getNewTaskDefaults(
  view: string,
  currentListId?: string,
  currentCategoryId?: string,
): NewTaskDefaults {
  const defaults: NewTaskDefaults = { listId: 'all' };

  switch (view) {
    case 'list':
      if (currentListId) defaults.listId = currentListId;
      break;
    case 'category':
      if (currentCategoryId) defaults.categoryIds = [currentCategoryId];
      break;
    case 'my-day':
      defaults.myDay = true;
      break;
    case 'important':
      defaults.important = true;
      break;
    case 'planned':
      defaults.dueDate = startOfDay(new Date());
      break;
  }

  return defaults;
}
