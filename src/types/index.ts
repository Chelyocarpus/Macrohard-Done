export interface Task {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
  important: boolean;
  myDay: boolean;
  pinned: boolean; // Pin task to top of its list
  pinnedGlobally: boolean; // Pin task to top of all views
  dueDate?: Date;
  reminder?: Date;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  repeatDays?: number[]; // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
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
}

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

export type ViewType = 'my-day' | 'important' | 'planned' | 'all' | 'list' | 'category';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // Auto-dismiss time in milliseconds, undefined means no auto-dismiss
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
  darkMode: boolean;
  sidebarCollapsed: boolean;
  customTimePresets: TimePreset[];
  disabledBuiltInPresets: string[]; // IDs of built-in presets that have been disabled/removed
}
