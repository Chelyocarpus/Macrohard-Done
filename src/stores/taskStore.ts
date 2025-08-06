import { create } from 'zustand';
import { isToday, startOfDay, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import type { Task, TaskList, AppState, ViewType, TaskFilter } from '../types/index.ts';
import { saveToStorage, loadFromStorage, generateId } from '../utils/storage.ts';

interface TaskStore extends AppState {
  // Actions
  addTask: (title: string, listId?: string, options?: { important?: boolean; dueDate?: Date; notes?: string; myDay?: boolean; repeat?: string }) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  toggleImportant: (id: string) => void;
  toggleMyDay: (id: string) => void;
  addSubTask: (taskId: string, title: string) => void;
  toggleSubTask: (taskId: string, subTaskId: string) => void;
  deleteSubTask: (taskId: string, subTaskId: string) => void;
  processRepeatingTasks: () => void;
  
  // List actions
  addList: (name: string, color?: string, emoji?: string) => void;
  updateList: (id: string, updates: Partial<TaskList>) => void;
  deleteList: (id: string) => void;
  
  // View actions
  setView: (view: ViewType, listId?: string) => void;
  setSearchQuery: (query: string) => void;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  
  // Getters
  getFilteredTasks: (filter?: TaskFilter) => Task[];
  getTasksForCurrentView: () => Task[];
  getTaskCountForList: (listId: string) => number;
}

// Default system lists
const defaultLists: TaskList[] = [
  {
    id: 'my-day',
    name: 'My Day',
    isSystem: true,
    taskCount: 0,
    createdAt: new Date(),
  },
  {
    id: 'important',
    name: 'Important',
    isSystem: true,
    taskCount: 0,
    createdAt: new Date(),
  },
  {
    id: 'planned',
    name: 'Planned',
    isSystem: true,
    taskCount: 0,
    createdAt: new Date(),
  },
  {
    id: 'all',
    name: 'Tasks',
    isSystem: true,
    taskCount: 0,
    createdAt: new Date(),
  },
];

export const useTaskStore = create<TaskStore>()((set, get) => {
  // Load initial state from storage
  const savedState = loadFromStorage();
  
  const initialState: AppState = {
    tasks: [],
    lists: defaultLists,
    currentView: 'my-day',
    currentListId: undefined,
    searchQuery: '',
    darkMode: false,
    sidebarCollapsed: false,
    ...savedState,
  };

  // Save to storage whenever state changes
  const saveState = () => {
    const state = get();
    saveToStorage({
      tasks: state.tasks,
      lists: state.lists.filter(list => !list.isSystem).concat(defaultLists),
      currentView: state.currentView,
      currentListId: state.currentListId,
      searchQuery: state.searchQuery,
      darkMode: state.darkMode,
      sidebarCollapsed: state.sidebarCollapsed,
    });
  };

  // Helper function to calculate next due date for repeating tasks
  const getNextDueDate = (currentDate: Date, repeatType: Task['repeat']): Date => {
    switch (repeatType) {
      case 'daily':
        return addDays(currentDate, 1);
      case 'weekdays': {
        // Skip weekends
        const nextDay = addDays(currentDate, 1);
        const dayOfWeek = nextDay.getDay();
        if (dayOfWeek === 0) { // Sunday
          return addDays(nextDay, 1); // Move to Monday
        } else if (dayOfWeek === 6) { // Saturday
          return addDays(nextDay, 2); // Move to Monday
        }
        return nextDay;
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
    addTask: (title: string, listId = 'all', options: { important?: boolean; dueDate?: Date; notes?: string; myDay?: boolean; repeat?: string } = {}) => {
      const newTask: Task = {
        id: generateId(),
        title,
        completed: false,
        important: options.important || false,
        myDay: options.myDay || false,
        dueDate: options.dueDate,
        notes: options.notes,
        repeat: (options.repeat as Task['repeat']) || 'none',
        createdAt: new Date(),
        updatedAt: new Date(),
        listId,
        steps: [],
      };
      
      set((state) => ({
        tasks: [...state.tasks, newTask],
      }));
      saveState();
    },

    updateTask: (id: string, updates: Partial<Task>) => {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? { ...task, ...updates, updatedAt: new Date() }
            : task
        ),
      }));
      saveState();
    },

    deleteTask: (id: string) => {
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
      }));
      saveState();
    },

    toggleTask: (id: string) => {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? { ...task, completed: !task.completed, updatedAt: new Date() }
            : task
        ),
      }));
      saveState();
    },

    toggleImportant: (id: string) => {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? { ...task, important: !task.important, updatedAt: new Date() }
            : task
        ),
      }));
      saveState();
    },

    toggleMyDay: (id: string) => {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? { ...task, myDay: !task.myDay, updatedAt: new Date() }
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
            const nextDueDate = getNextDueDate(task.dueDate, task.repeat);
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

    // List actions
    addList: (name: string, color?: string, emoji?: string) => {
      const newList: TaskList = {
        id: generateId(),
        name,
        emoji,
        color,
        isSystem: false,
        taskCount: 0,
        createdAt: new Date(),
      };

      set((state) => ({
        lists: [...state.lists, newList],
      }));
      saveState();
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
      set((state) => ({
        lists: state.lists.filter((list) => list.id !== id),
        tasks: state.tasks.filter((task) => task.listId !== id),
      }));
      saveState();
    },

    // View actions
    setView: (view: ViewType, listId?: string) => {
      set({ currentView: view, currentListId: listId });
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
      });
    },

    getTasksForCurrentView: () => {
      const { currentView, currentListId, searchQuery } = get();
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
        case 'completed':
          filter.completed = true;
          break;
        case 'list':
          filter.listId = currentListId;
          filter.completed = false;
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
      if (listId === 'completed') {
        return tasks.filter(task => task.completed).length;
      }
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
      return tasks.filter(task => task.listId === listId && !task.completed).length;
    },
  };

  // Process repeating tasks on store initialization
  setTimeout(() => {
    store.processRepeatingTasks();
  }, 0);

  return store;
});
