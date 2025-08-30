import { create } from 'zustand';
import { isToday, startOfDay, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import type { Task, TaskList, ListGroup, AppState, ViewType, TaskFilter, TimePreset, Category } from '../types/index.ts';
import { saveToStorage, loadFromStorage, generateId } from '../utils/storage.ts';
import { useToastStore } from './toastStore.ts';

interface TaskStore extends AppState {
  // Actions
  addTask: (title: string, listId?: string, options?: { important?: boolean; dueDate?: Date; reminder?: Date; notes?: string; myDay?: boolean; repeat?: string; repeatDays?: number[]; steps?: { title: string }[]; categoryIds?: string[] }) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  toggleImportant: (id: string) => void;
  toggleMyDay: (id: string) => void;
  togglePin: (id: string) => void;
  toggleGlobalPin: (id: string) => void;
  addSubTask: (taskId: string, title: string) => void;
  toggleSubTask: (taskId: string, subTaskId: string) => void;
  deleteSubTask: (taskId: string, subTaskId: string) => void;
  processRepeatingTasks: () => void;
  reorderTasks: (taskIds: string[], listId: string) => void;
  
  // List actions
  addList: (name: string, color?: string, emoji?: string, groupId?: string | null) => void;
  updateList: (id: string, updates: Partial<TaskList>) => void;
  deleteList: (id: string) => void;
  reorderLists: (groupId: string | null, listIds: string[]) => void;
  moveListToGroup: (listId: string, groupId: string | null) => void;
  
  // Group actions
  addGroup: (name: string, color?: string, emoji?: string, overrideListIcons?: boolean) => void;
  updateGroup: (id: string, updates: Partial<ListGroup>) => void;
  deleteGroup: (id: string, moveListsToGroupId?: string | null) => void;
  reorderGroups: (groupIds: string[]) => void;
  toggleGroupCollapsed: (id: string) => void;
  
  // Category actions
  addCategory: (name: string, color?: string, emoji?: string, description?: string) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  assignTaskToCategory: (taskId: string, categoryId: string) => void;
  removeTaskFromCategory: (taskId: string, categoryId: string) => void;
  assignTaskToCategories: (taskId: string, categoryIds: string[]) => void;
  
  // Time preset actions
  addCustomTimePreset: (label: string, hour: number, minute: number) => void;
  removeCustomTimePreset: (id: string) => void;
  removeBuiltInPreset: (id: string) => void;
  restoreBuiltInPreset: (id: string) => void;
  
  // View actions
  setView: (view: ViewType, listId?: string, categoryId?: string) => void;
  setSearchQuery: (query: string) => void;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  
  // Getters
  getFilteredTasks: (filter?: TaskFilter) => Task[];
  getTasksForCurrentView: () => Task[];
  getTaskCountForList: (listId: string) => number;
  getListsInGroup: (groupId: string | null) => TaskList[];
  getGroupedLists: () => { group: ListGroup | null; lists: TaskList[] }[];
  getGroupForList: (listId: string) => ListGroup | null;
  getTaskCountForCategory: (categoryId: string) => number;
  getCategoriesForTask: (taskId: string) => Category[];
}

// Default system lists
const defaultLists: TaskList[] = [
  {
    id: 'my-day',
    name: 'My Day',
    isSystem: true,
    taskCount: 0,
    order: 0,
    createdAt: new Date(),
  },
  {
    id: 'important',
    name: 'Important',
    isSystem: true,
    taskCount: 0,
    order: 1,
    createdAt: new Date(),
  },
  {
    id: 'planned',
    name: 'Planned',
    isSystem: true,
    taskCount: 0,
    order: 2,
    createdAt: new Date(),
  },
  {
    id: 'all',
    name: 'Tasks',
    isSystem: true,
    taskCount: 0,
    order: 3,
    createdAt: new Date(),
  },
];

export const useTaskStore = create<TaskStore>()((set, get) => {
  // Load initial state from storage
  const savedState = loadFromStorage();

  // Migrate tasks to include order property and pinned properties if not present
  const migratedTasks = savedState?.tasks?.map((task: Partial<Task> & { id: string; title: string; completed: boolean; createdAt: Date; updatedAt: Date; listId: string }, index: number) => ({
    ...task,
    order: task.order !== undefined ? task.order : index,
    pinned: task.pinned !== undefined ? task.pinned : false,
    pinnedGlobally: task.pinnedGlobally !== undefined ? task.pinnedGlobally : false,
    categoryIds: Array.isArray(task.categoryIds) ? task.categoryIds : [],
    steps: task.steps || [],
  } as Task)) || [];
  
  const initialState: AppState = {
    tasks: migratedTasks,
    lists: defaultLists,
    listGroups: [],
    categories: [],
    currentView: 'my-day',
    currentListId: undefined,
    currentCategoryId: undefined,
    searchQuery: '',
    darkMode: false,
    sidebarCollapsed: false,
    customTimePresets: [],
    disabledBuiltInPresets: [],
    ...savedState,
  };

  // Save to storage whenever state changes
  const saveState = () => {
    const state = get();
    saveToStorage({
      tasks: state.tasks,
      lists: state.lists.filter(list => !list.isSystem).concat(defaultLists),
      listGroups: state.listGroups,
      categories: state.categories,
      currentView: state.currentView,
      currentListId: state.currentListId,
      currentCategoryId: state.currentCategoryId,
      searchQuery: state.searchQuery,
      darkMode: state.darkMode,
      sidebarCollapsed: state.sidebarCollapsed,
      customTimePresets: state.customTimePresets,
      disabledBuiltInPresets: state.disabledBuiltInPresets,
    });
  };

  // Helper function to calculate next due date for repeating tasks
  const getNextDueDate = (currentDate: Date, repeatType: Task['repeat'], repeatDays?: number[]): Date => {
    switch (repeatType) {
      case 'daily': {
        if (repeatDays && repeatDays.length > 0) {
          // Find next valid day based on repeatDays
          const nextDay = addDays(currentDate, 1);
          let checkDate = nextDay;
          
          // Check up to 7 days ahead to find next valid day
          for (let i = 0; i < 7; i++) {
            if (repeatDays.includes(checkDate.getDay())) {
              return checkDate;
            }
            checkDate = addDays(checkDate, 1);
          }
          
          // Fallback to next day if no valid day found (shouldn't happen)
          return nextDay;
        }
        return addDays(currentDate, 1);
      }
      case 'weekly':
        return addWeeks(currentDate, 1);
      case 'monthly':
        return addMonths(currentDate, 1);
      case 'yearly':
        return addYears(currentDate, 1);
      default:
        return currentDate;
    }
  };

  const store = {
    ...initialState,

    // Task actions
    addTask: (title: string, listId = 'all', options: { important?: boolean; dueDate?: Date; reminder?: Date; notes?: string; myDay?: boolean; repeat?: string; repeatDays?: number[]; steps?: { title: string }[]; categoryIds?: string[] } = {}) => {
      // Validation
      if (!title.trim()) {
        useToastStore.getState().showError('Invalid input', 'Task title cannot be empty');
        return;
      }
      
      if (title.trim().length > 200) {
        useToastStore.getState().showError('Invalid input', 'Task title is too long (maximum 200 characters)');
        return;
      }
      
      // Check if list exists (allow 'all' as virtual list)
      if (listId !== 'all') {
        const listExists = get().lists.some(list => list.id === listId);
        if (!listExists) {
          useToastStore.getState().showError('List not found', 'The selected list no longer exists');
          return;
        }
      }
      
      try {
        const currentTasks = get().tasks.filter(task => task.listId === listId);
        const nextOrder = currentTasks.length > 0 ? Math.max(...currentTasks.map(t => t.order)) + 1 : 0;
        
        // Create initial steps if provided
        const initialSteps = options.steps?.map(step => ({
          id: generateId(),
          title: step.title,
          completed: false,
          createdAt: new Date(),
        })) || [];
        
        const newTask: Task = {
          id: generateId(),
          title: title.trim(),
          completed: false,
          important: options.important || false,
          myDay: options.myDay || false,
          pinned: false,
          pinnedGlobally: false,
          dueDate: options.dueDate,
          reminder: options.reminder,
          notes: options.notes,
          repeat: (options.repeat as Task['repeat']) || 'none',
          repeatDays: options.repeatDays,
          order: nextOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
          listId,
          categoryIds: options.categoryIds || [],
          steps: initialSteps,
        };
        
        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));
        saveState();
        
        // Show success toast
        useToastStore.getState().showSuccess('Task created', `"${title.trim()}" was added successfully`);
      } catch (error) {
        console.error('Error adding task:', error);
        useToastStore.getState().showError('Error', 'Failed to create task. Please try again.');
      }
    },

    updateTask: (id: string, updates: Partial<Task>) => {
      const task = get().tasks.find(t => t.id === id);
      if (!task) {
        useToastStore.getState().showError('Task not found', 'The task you are trying to update no longer exists');
        return;
      }
      
      try {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, ...updates, updatedAt: new Date() }
              : task
          ),
        }));
        saveState();
        
        // Show toast for significant updates
        if (updates.dueDate !== undefined) {
          const previousDueDate = task.dueDate;
          const newDueDate = updates.dueDate;
          
          // Check if the due date value has actually changed
          const dateChanged = (previousDueDate === null || previousDueDate === undefined) !== (newDueDate === null || newDueDate === undefined) ||
                              (previousDueDate && newDueDate && previousDueDate.getTime() !== newDueDate.getTime());
          
          if (dateChanged) {
            if (newDueDate) {
              useToastStore.getState().showInfo('Due date updated', `"${task.title}" due date was set`);
            } else {
              useToastStore.getState().showInfo('Due date removed', `"${task.title}" due date was cleared`);
            }
          }
        }
      } catch (error) {
        console.error('Error updating task:', error);
        useToastStore.getState().showError('Error', 'Failed to update task. Please try again.');
      }
    },

    deleteTask: (id: string) => {
      const task = get().tasks.find(t => t.id === id);
      const taskTitle = task?.title || 'Task';
      
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
      }));
      saveState();
      
      // Show success toast
      useToastStore.getState().showInfo('Task deleted', `"${taskTitle}" was removed`);
    },

    toggleTask: (id: string) => {
      const task = get().tasks.find(t => t.id === id);
      if (!task) {
        useToastStore.getState().showError('Task not found', `Could not find a task with id "${id}"`);
        return;
      }
      
      const newCompletedState = !task.completed;
      
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? { ...task, completed: newCompletedState, updatedAt: new Date() }
            : task
        ),
      }));
      saveState();
      
      // Show success toast
      if (newCompletedState) {
        useToastStore.getState().showSuccess('Task completed', `"${task.title}" is now complete! 🎉`);
      }
    },

    toggleImportant: (id: string) => {
      const task = get().tasks.find(t => t.id === id);
      if (!task) {
        useToastStore.getState().showError('Task not found', `Could not find a task with id "${id}"`);
        return;
      }
      
      const newImportantState = !task.important;
      
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? { ...task, important: newImportantState, updatedAt: new Date() }
            : task
        ),
      }));
      saveState();
      
      // Show toast only when marking as important
      if (newImportantState) {
        useToastStore.getState().showInfo('Marked as important', `"${task.title}" is now important ⭐`);
      }
    },

    toggleMyDay: (id: string) => {
      const task = get().tasks.find(t => t.id === id);
      if (!task) {
        useToastStore.getState().showError('Task not found', `Could not find a task with id "${id}"`);
        return;
      }
      
      const newMyDayState = !task.myDay;
      
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? { ...task, myDay: newMyDayState, updatedAt: new Date() }
            : task
        ),
      }));
      saveState();
      
      // Show toast only when adding to My Day
      if (newMyDayState) {
        useToastStore.getState().showInfo('Added to My Day', `"${task.title}" was added to My Day 📅`);
      }
    },

    togglePin: (id: string) => {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? { ...task, pinned: !task.pinned, updatedAt: new Date() }
            : task
        ),
      }));
      saveState();
    },

    toggleGlobalPin: (id: string) => {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? { ...task, pinnedGlobally: !task.pinnedGlobally, updatedAt: new Date() }
            : task
        ),
      }));
      saveState();
    },

    addSubTask: (taskId: string, title: string) => {
      const newSubTask = {
        id: generateId(),
        title,
        completed: false,
        createdAt: new Date(),
      };

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                steps: [...task.steps, newSubTask],
                updatedAt: new Date(),
              }
            : task
        ),
      }));
      saveState();
    },

    toggleSubTask: (taskId: string, subTaskId: string) => {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                steps: task.steps.map((step) =>
                  step.id === subTaskId
                    ? { ...step, completed: !step.completed }
                    : step
                ),
                updatedAt: new Date(),
              }
            : task
        ),
      }));
      saveState();
    },

    deleteSubTask: (taskId: string, subTaskId: string) => {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                steps: task.steps.filter((step) => step.id !== subTaskId),
                updatedAt: new Date(),
              }
            : task
        ),
      }));
      saveState();
    },

    processRepeatingTasks: () => {
      const today = startOfDay(new Date());
      
      set((state) => ({
        tasks: state.tasks.map((task) => {
          // Check if task is completed, has repeat, has due date, and due date is in the past
          if (
            task.completed && 
            task.repeat && 
            task.repeat !== 'none' && 
            task.dueDate && 
            startOfDay(task.dueDate) < today
          ) {
            // Reset task for next occurrence
            const nextDueDate = getNextDueDate(task.dueDate, task.repeat, task.repeatDays);
            return {
              ...task,
              completed: false,
              dueDate: nextDueDate,
              myDay: false, // Remove from My Day when rescheduled
              updatedAt: new Date(),
            };
          }
          return task;
        }),
      }));
      saveState();
    },

    reorderTasks: (taskIds: string[], listId: string) => {
      set((state) => ({
        tasks: state.tasks.map((task) => {
          if (task.listId === listId) {
            const newOrder = taskIds.indexOf(task.id);
            return newOrder >= 0 ? { ...task, order: newOrder, updatedAt: new Date() } : task;
          }
          return task;
        }),
      }));
      saveState();
    },

    // List actions
    addList: (name: string, color?: string, emoji?: string, groupId?: string | null) => {
      const newList: TaskList = {
        id: generateId(),
        name,
        emoji,
        color,
        isSystem: false,
        taskCount: 0,
        groupId,
        order: get().lists.filter(l => l.groupId === groupId).length,
        createdAt: new Date(),
      };

      set((state) => ({
        lists: [...state.lists, newList],
      }));
      saveState();
      
      // Show success toast
      useToastStore.getState().showSuccess('List created', `"${name}" list was created successfully`);
    },

    updateList: (id: string, updates: Partial<TaskList>) => {
      set((state) => ({
        lists: state.lists.map((list) =>
          list.id === id ? { ...list, ...updates } : list
        ),
      }));
      saveState();
    },

    deleteList: (id: string) => {
      const list = get().lists.find(l => l.id === id);
      const listName = list?.name || 'List';
      const tasksInList = get().tasks.filter(task => task.listId === id);
      
      set((state) => ({
        lists: state.lists.filter((list) => list.id !== id),
        tasks: state.tasks.filter((task) => task.listId !== id),
      }));
      saveState();
      
      // Show warning toast with count of deleted tasks
      const taskCount = tasksInList.length;
      if (taskCount > 0) {
        useToastStore.getState().showWarning(
          'List deleted', 
          `"${listName}" and ${taskCount} task${taskCount > 1 ? 's' : ''} were removed`
        );
      } else {
        useToastStore.getState().showInfo('List deleted', `"${listName}" was removed`);
      }
    },

    // View actions
    setView: (view: ViewType, listId?: string, categoryId?: string) => {
      set({ 
        currentView: view, 
        currentListId: listId, 
        currentCategoryId: view === 'category' ? categoryId : undefined 
      });
      saveState();
    },

    setSearchQuery: (query: string) => {
      set({ searchQuery: query });
    },

    toggleDarkMode: () => {
      set((state) => ({ darkMode: !state.darkMode }));
      saveState();
    },

    toggleSidebar: () => {
      set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      saveState();
    },

    // Getters
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
      const { currentView, currentListId, currentCategoryId, searchQuery } = get();
      const filter: TaskFilter = { search: searchQuery };
      
      switch (currentView) {
        case 'my-day':
          // Show tasks due today OR manually added to My Day
          return get().getFilteredTasks(filter).filter(task => 
            !task.completed && (task.myDay || (task.dueDate && isToday(task.dueDate)))
          );
        case 'important':
          filter.important = true;
          filter.completed = false;
          break;
        case 'planned':
          // Show tasks with due dates
          return get().getFilteredTasks(filter).filter(task => task.dueDate && !task.completed);
        case 'category':
          // Show tasks with specific category
          if (currentCategoryId) {
            filter.categoryIds = [currentCategoryId];
          }
          filter.completed = false;
          break;
        case 'list':
          filter.listId = currentListId;
          // Don't filter by completion status for list view - show all tasks
          break;
        case 'all':
        default:
          // Show ALL incomplete tasks regardless of which list they're in
          filter.completed = false;
          // Don't filter by listId for the 'all' view
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
        return tasks.filter(task => task.dueDate && !task.completed).length;
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

    // Time preset actions
    addCustomTimePreset: (label: string, hour: number, minute: number) => {
      const newPreset: TimePreset = {
        id: generateId(),
        label,
        hour,
        minute,
        isCustom: true,
        createdAt: new Date(),
      };

      set((state) => ({
        customTimePresets: [...state.customTimePresets, newPreset],
      }));
      saveState();
    },

    removeCustomTimePreset: (id: string) => {
      set((state) => ({
        customTimePresets: state.customTimePresets.filter(preset => preset.id !== id),
      }));
      saveState();
    },

    removeBuiltInPreset: (id: string) => {
      set((state) => ({
        disabledBuiltInPresets: [...state.disabledBuiltInPresets, id],
      }));
      saveState();
    },

    restoreBuiltInPreset: (id: string) => {
      set((state) => ({
        disabledBuiltInPresets: state.disabledBuiltInPresets.filter(presetId => presetId !== id),
      }));
      saveState();
    },

    // List management actions
    reorderLists: (groupId: string | null, listIds: string[]) => {
      set((state) => ({
        lists: state.lists.map((list) => {
          if (list.groupId === groupId) {
            const newOrder = listIds.indexOf(list.id);
            return newOrder >= 0 ? { ...list, order: newOrder } : list;
          }
          return list;
        }),
      }));
      saveState();
    },

    moveListToGroup: (listId: string, groupId: string | null) => {
      set((state) => {
        const targetLists = state.lists.filter(l => l.groupId === groupId);
        const newOrder = targetLists.length;
        
        return {
          lists: state.lists.map((list) =>
            list.id === listId ? { ...list, groupId, order: newOrder } : list
          ),
        };
      });
      saveState();
    },

    // Group management actions
    addGroup: (name: string, color?: string, emoji?: string, overrideListIcons?: boolean) => {
      const newGroup: ListGroup = {
        id: generateId(),
        name,
        emoji,
        color,
        collapsed: false,
        order: get().listGroups.length,
        overrideListIcons: overrideListIcons || false,
        createdAt: new Date(),
      };

      set((state) => ({
        listGroups: [...state.listGroups, newGroup],
      }));
      saveState();
      
      // Show success toast
      useToastStore.getState().showSuccess('Group created', `"${name}" group was created successfully`);
    },

    updateGroup: (id: string, updates: Partial<ListGroup>) => {
      set((state) => ({
        listGroups: state.listGroups.map((group) =>
          group.id === id ? { ...group, ...updates } : group
        ),
      }));
      saveState();
    },

    deleteGroup: (id: string, moveListsToGroupId?: string | null) => {
      const group = get().listGroups.find(g => g.id === id);
      const groupName = group?.name || 'Group';
      const listsInGroup = get().lists.filter(list => list.groupId === id);
      
      set((state) => ({
        listGroups: state.listGroups.filter((group) => group.id !== id),
        lists: state.lists.map((list) =>
          list.groupId === id ? { ...list, groupId: moveListsToGroupId || null } : list
        ),
      }));
      saveState();
      
      // Show info toast
      const listCount = listsInGroup.length;
      if (listCount > 0) {
        useToastStore.getState().showInfo(
          'Group deleted', 
          `"${groupName}" was removed. ${listCount} list${listCount > 1 ? 's' : ''} moved`
        );
      } else {
        useToastStore.getState().showInfo('Group deleted', `"${groupName}" was removed`);
      }
    },

    reorderGroups: (groupIds: string[]) => {
      set((state) => ({
        listGroups: state.listGroups.map((group) => {
          const newOrder = groupIds.indexOf(group.id);
          return newOrder >= 0 ? { ...group, order: newOrder } : group;
        }),
      }));
      saveState();
    },

    toggleGroupCollapsed: (id: string) => {
      set((state) => ({
        listGroups: state.listGroups.map((group) =>
          group.id === id ? { ...group, collapsed: !group.collapsed } : group
        ),
      }));
      saveState();
    },

    // Getters
    getListsInGroup: (groupId: string | null) => {
      const { lists } = get();
      return lists
        .filter((list) => !list.isSystem && list.groupId === groupId)
        .sort((a, b) => a.order - b.order);
    },

    getGroupedLists: () => {
      const { lists, listGroups } = get();
      const customLists = lists.filter(list => !list.isSystem);
      const sortedGroups = [...listGroups].sort((a, b) => a.order - b.order);
      const ungroupedLists = customLists
        .filter((list) => !list.groupId)
        .sort((a, b) => a.order - b.order);

      const result: { group: ListGroup | null; lists: TaskList[] }[] = [];

      // Add ungrouped lists first
      if (ungroupedLists.length > 0) {
        result.push({ group: null, lists: ungroupedLists });
      }

      // Add grouped lists
      sortedGroups.forEach((group) => {
        const groupLists = customLists
          .filter((list) => list.groupId === group.id)
          .sort((a, b) => a.order - b.order);
        result.push({ group, lists: groupLists });
      });

      return result;
    },

    getGroupForList: (listId: string) => {
      const { lists, listGroups } = get();
      const list = lists.find(l => l.id === listId);
      if (!list || !list.groupId) return null;
      return listGroups.find(g => g.id === list.groupId) || null;
    },

    // Category actions
    addCategory: (name: string, color?: string, emoji?: string, description?: string) => {
      const newCategory: Category = {
        id: generateId(),
        name,
        color,
        emoji,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      set((state) => ({
        categories: [...state.categories, newCategory],
      }));
      saveState();
      
      // Show success toast
      useToastStore.getState().showSuccess('Category created', `"${name}" category was created successfully`);
      
      return newCategory;
    },

    updateCategory: (id: string, updates: Partial<Category>) => {
      const category = get().categories.find(c => c.id === id);
      if (!category) {
        useToastStore.getState().showError('Category not found', 'The category you are trying to update no longer exists');
        return;
      }
      
      set((state) => ({
        categories: state.categories.map((category) =>
          category.id === id
            ? { ...category, ...updates, updatedAt: new Date() }
            : category
        ),
      }));
      saveState();
    },

    deleteCategory: (id: string) => {
      const category = get().categories.find(c => c.id === id);
      const categoryName = category?.name || 'Category';
      const tasksWithCategory = get().tasks.filter(task => task.categoryIds?.includes(id) || false);
      
      // Remove category from all tasks
      set((state) => ({
        categories: state.categories.filter((category) => category.id !== id),
        tasks: state.tasks.map((task) => ({
          ...task,
          categoryIds: (task.categoryIds || []).filter(categoryId => categoryId !== id),
          updatedAt: (task.categoryIds?.includes(id)) ? new Date() : task.updatedAt,
        })),
      }));
      saveState();
      
      // Show warning toast with count of affected tasks
      const taskCount = tasksWithCategory.length;
      if (taskCount > 0) {
        useToastStore.getState().showWarning(
          'Category deleted', 
          `"${categoryName}" was removed from ${taskCount} task${taskCount > 1 ? 's' : ''}`
        );
      } else {
        useToastStore.getState().showInfo('Category deleted', `"${categoryName}" was removed`);
      }
    },

    assignTaskToCategory: (taskId: string, categoryId: string) => {
      const task = get().tasks.find(t => t.id === taskId);
      const category = get().categories.find(c => c.id === categoryId);
      
      if (!task) {
        useToastStore.getState().showError('Task not found', 'The task no longer exists');
        return;
      }
      
      if (!category) {
        useToastStore.getState().showError('Category not found', 'The category no longer exists');
        return;
      }

      // Check if task already has this category
      if (task.categoryIds?.includes(categoryId)) {
        return;
      }

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? { ...task, categoryIds: [...(task.categoryIds || []), categoryId], updatedAt: new Date() }
            : task
        ),
      }));
      saveState();
    },

    removeTaskFromCategory: (taskId: string, categoryId: string) => {
      const task = get().tasks.find(t => t.id === taskId);
      
      if (!task) {
        useToastStore.getState().showError('Task not found', 'The task no longer exists');
        return;
      }

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? { 
                ...task, 
                categoryIds: (task.categoryIds || []).filter(id => id !== categoryId), 
                updatedAt: new Date() 
              }
            : task
        ),
      }));
      saveState();
    },

    assignTaskToCategories: (taskId: string, categoryIds: string[]) => {
      const task = get().tasks.find(t => t.id === taskId);
      
      if (!task) {
        useToastStore.getState().showError('Task not found', 'The task no longer exists');
        return;
      }

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? { ...task, categoryIds: [...categoryIds], updatedAt: new Date() }
            : task
        ),
      }));
      saveState();
    },

    // Category getters
    getTaskCountForCategory: (categoryId: string) => {
      const { tasks } = get();
      return tasks.filter(task => (task.categoryIds?.includes(categoryId)) && !task.completed).length;
    },

    getCategoriesForTask: (taskId: string) => {
      const { tasks, categories } = get();
      const task = tasks.find(t => t.id === taskId);
      if (!task) return [];
      
      return categories.filter(category => task.categoryIds?.includes(category.id) || false);
    },
  };

  // Process repeating tasks on store initialization
  setTimeout(() => {
    store.processRepeatingTasks();
  }, 0);

  return store;
});
