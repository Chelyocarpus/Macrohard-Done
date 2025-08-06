export interface Task {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
  important: boolean;
  myDay: boolean;
  dueDate?: Date;
  repeat?: 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';
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
  createdAt: Date;
}

export interface TaskFilter {
  listId?: string;
  completed?: boolean;
  important?: boolean;
  dueDate?: 'today' | 'tomorrow' | 'week' | 'overdue';
  search?: string;
}

export type ViewType = 'my-day' | 'important' | 'planned' | 'all' | 'completed' | 'list';

export interface AppState {
  tasks: Task[];
  lists: TaskList[];
  currentView: ViewType;
  currentListId?: string;
  searchQuery: string;
  darkMode: boolean;
  sidebarCollapsed: boolean;
}
