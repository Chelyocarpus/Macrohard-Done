import { isToday, isTomorrow, startOfDay, addDays } from 'date-fns';
import type { TaskFilter } from '../../types/index.ts';
import { isPlanned } from '../../utils/planned.ts';
import type { StoreContext, TaskStore } from './types.ts';

/** Task queries: which tasks a view shows, and how many open tasks a list has. */
export const createTaskQueries = ({ get }: StoreContext): Pick<TaskStore, 'getFilteredTasks' | 'getTasksForCurrentView' | 'getTaskCountForList'> => ({
  getFilteredTasks: (filter: TaskFilter = {}) => {
    const { tasks } = get();
    
    return tasks.filter((task) => {
      if (filter.listId && task.listId !== filter.listId) return false;
      if (filter.completed !== undefined && task.completed !== filter.completed) return false;
      if (filter.important && !task.important) return false;
      if (filter.search) {
        const query = filter.search.toLowerCase();
        if (!task.title.toLowerCase().includes(query) && 
            !task.notes?.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (filter.categoryIds && filter.categoryIds.length > 0) {
        // Check if task has any of the specified categories
        const hasMatchingCategory = filter.categoryIds.some(categoryId => 
          task.categoryIds?.includes(categoryId) || false
        );
        if (!hasMatchingCategory) return false;
      }
      if (filter.dueDate) {
        if (!task.dueDate) return false;
        const dueDate = startOfDay(task.dueDate);
        const today = startOfDay(new Date());
        
        switch (filter.dueDate) {
          case 'today':
            return isToday(dueDate);
          case 'tomorrow':
            return isTomorrow(dueDate);
          case 'week':
            return dueDate >= today && dueDate < addDays(today, 7);
          case 'overdue':
            return dueDate < today;
          default:
            return true;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      // Priority sorting: globally pinned > list pinned > regular tasks
      if (a.pinnedGlobally && !b.pinnedGlobally) return -1;
      if (!a.pinnedGlobally && b.pinnedGlobally) return 1;
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      // Within same pin status, sort by order
      return a.order - b.order;
    });
  },

  getTasksForCurrentView: () => {
    // Words typed in the search box are handled by the Search view (utils/search.ts), not here
    const { currentView, currentListId, currentCategoryId } = get();
    const filter: TaskFilter = {};

    // Every view includes its completed tasks: the task list shows them in a separate, collapsible
    // "Completed" section. Filtering them out here made a task vanish the moment it was ticked off.
    // (The sidebar counters, getTaskCountForList etc., still count only open tasks.)
    switch (currentView) {
      case 'my-day':
        // Show tasks due today OR manually added to My Day
        return get().getFilteredTasks(filter).filter(task =>
          task.myDay || (task.dueDate && isToday(task.dueDate))
        );
      case 'important':
        filter.important = true;
        break;
      case 'planned':
        // Show tasks with a due date or a reminder
        return get().getFilteredTasks(filter).filter(isPlanned);
      case 'category':
        // Show tasks with specific category
        if (currentCategoryId) {
          filter.categoryIds = [currentCategoryId];
        }
        break;
      case 'list':
        filter.listId = currentListId;
        break;
      case 'all':
      default:
        // Show ALL tasks regardless of which list they're in
        break;
    }
    
    return get().getFilteredTasks(filter);
  },

  getTaskCountForList: (listId: string) => {
    const { tasks } = get();
    if (listId === 'important') {
      return tasks.filter(task => task.important && !task.completed).length;
    }
    if (listId === 'planned') {
      return tasks.filter(task => isPlanned(task) && !task.completed).length;
    }
    if (listId === 'my-day') {
      return tasks.filter(task => 
        !task.completed && (task.myDay || (task.dueDate && isToday(task.dueDate)))
      ).length;
    }
    if (listId === 'all') {
      // Count ALL incomplete tasks regardless of which list they're in
      return tasks.filter(task => !task.completed).length;
    }
    // For custom lists, only count active (incomplete) tasks in the counter
    return tasks.filter(task => task.listId === listId && !task.completed).length;
  },
});
