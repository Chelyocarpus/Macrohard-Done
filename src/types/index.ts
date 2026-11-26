export interface Task {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
  important: boolean;
  myDay: boolean;
  myDayDate?: string; // Local day (yyyy-MM-dd) the task was added to My Day; My Day is emptied when that day is over
  pinned: boolean; // Pin task to top of its list
  pinnedGlobally: boolean; // Pin task to top of all views
  dueDate?: Date;
  reminder?: Date;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  repeatDays?: number[]; // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  repeatInterval?: number; // Every N days/weeks/months/years (1 when missing)
  repeatAnchor?: 'due' | 'completion'; // Count the next date from the due date (default) or from the day it was completed
  repeatSpawnedId?: string; // Set on a completed repeating task: the id of the next occurrence that completing it created
  order: number; // For drag-and-drop ordering within lists
  createdAt: Date;
  updatedAt: Date;
  listId: string;
  categoryIds: string[]; // Array of category IDs assigned to this task
  steps: SubTask[];
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export interface TaskList {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
  isSystem: boolean;
  taskCount: number;
  groupId?: string | null;
  order: number;
  createdAt: Date;
  sortMode?: ListSortMode; // How tasks are ordered in this list (manual when missing)
  sortReverse?: boolean;
  showCompleted?: boolean; // false hides the "Completed" section (shown when missing)
  addToTop?: boolean; // New tasks go to the top of the list instead of the bottom
}

export type ListSortMode = 'manual' | 'importance' | 'dueDate' | 'myDay' | 'alphabetical' | 'created';

export interface ListGroup {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
  collapsed: boolean;
  order: number;
  createdAt: Date;
  overrideListIcons?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  emoji?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskFilter {
  listId?: string;
  completed?: boolean;
  important?: boolean;
  dueDate?: 'today' | 'tomorrow' | 'week' | 'overdue';
  search?: string;
  categoryIds?: string[]; // Filter by specific categories
}

export interface TimePreset {
  id: string;
  label: string;
  hour: number;
  minute: number;
  isCustom: boolean;
  createdAt: Date;
}

export type ViewType = 'my-day' | 'important' | 'planned' | 'all' | 'list' | 'category' | 'search' | 'settings';

/** Light, dark, or follow the device */
export type ThemePreference = 'system' | 'light' | 'dark';

/**
 * How task cards look (compact is the default). Comfortable is a roomier card; minimal keeps the card but folds
 * the details into one muted line under the title, like Microsoft To Do.
 */
export type RowDensity = 'compact' | 'comfortable' | 'minimal';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // Auto-dismiss time in milliseconds, undefined means no auto-dismiss
  action?: { label: string; onClick: () => void }; // Optional button, e.g. "Undo"
  createdAt: Date;
}

export interface AppState {
  tasks: Task[];
  lists: TaskList[];
  listGroups: ListGroup[];
  categories: Category[];
  currentView: ViewType;
  currentListId?: string;
  currentCategoryId?: string; // For category view filtering
  searchQuery: string;
  /** What is shown: follows `themePreference` (and the device, when that is "system") */
  darkMode: boolean;
  themePreference: ThemePreference;
  rowDensity: RowDensity;
  sidebarCollapsed: boolean;
  customTimePresets: TimePreset[];
  disabledBuiltInPresets: string[]; // IDs of built-in presets that have been disabled/removed
}
