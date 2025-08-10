export interface Task {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
  important: boolean;
  myDay: boolean;
  dueDate?: Date;
  reminder?: Date;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  repeatDays?: number[]; // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  createdAt: Date;
  updatedAt: Date;
  listId: string;
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
}

export interface TaskFilter {
  listId?: string;
  completed?: boolean;
  important?: boolean;
  dueDate?: 'today' | 'tomorrow' | 'week' | 'overdue';
  search?: string;
}

export interface TimePreset {
  id: string;
  label: string;
  hour: number;
  minute: number;
  isCustom: boolean;
  createdAt: Date;
}

export type ViewType = 'my-day' | 'important' | 'planned' | 'all' | 'completed' | 'list';

export interface AppState {
  tasks: Task[];
  lists: TaskList[];
  listGroups: ListGroup[];
  currentView: ViewType;
  currentListId?: string;
  searchQuery: string;
  darkMode: boolean;
  sidebarCollapsed: boolean;
  customTimePresets: TimePreset[];
  disabledBuiltInPresets: string[]; // IDs of built-in presets that have been disabled/removed
}
