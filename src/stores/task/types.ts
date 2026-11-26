import type { StoreApi } from 'zustand';
import type { Task, TaskList, ListGroup, AppState, ViewType, TaskFilter, Category, ThemePreference, RowDensity } from '../../types/index.ts';
import type { BackupData, CommitResult } from '../../utils/backup.ts';

export interface NewTaskOptions {
  important?: boolean;
  dueDate?: Date;
  reminder?: Date;
  notes?: string;
  myDay?: boolean;
  repeat?: string;
  repeatDays?: number[];
  repeatInterval?: number;
  repeatAnchor?: Task['repeatAnchor'];
  steps?: { title: string }[];
  categoryIds?: string[];
}

/** One change applied to every task of a bulk action. Only the fields that are set are changed. */
export interface BulkChange {
  important?: boolean;
  myDay?: boolean;
  /** Pinned to the top of its list */
  pinned?: boolean;
  /** A day to set, or null to clear the due date */
  dueDate?: Date | null;
  /** Move to this list ("all" is the default Tasks list) */
  listId?: string;
  addTagIds?: string[];
  removeTagIds?: string[];
}

export interface TaskStore extends AppState {
  // Actions
  /** Applies one change to many tasks, with one Undo. Returns how many tasks really changed. */
  updateManyTasks: (ids: readonly string[], change: BulkChange) => number;
  /** Completes (true) or reopens (false) many tasks, with one Undo. Returns how many changed. */
  completeManyTasks: (ids: readonly string[], completed: boolean) => number;
  /** Deletes many tasks, with one Undo. Returns how many were deleted. */
  deleteManyTasks: (ids: readonly string[]) => number;
  /** Returns true when the task was created, false when validation or creation failed (an error toast is shown). */
  addTask: (title: string, listId?: string, options?: NewTaskOptions) => boolean;
  updateTask: (id: string, updates: Partial<Task>) => void;
  /** Removes tasks added to My Day on an earlier day from My Day. Runs on load and whenever the day changes. */
  rolloverMyDay: () => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  toggleImportant: (id: string) => void;
  toggleMyDay: (id: string) => void;
  togglePin: (id: string) => void;
  toggleGlobalPin: (id: string) => void;
  addSubTask: (taskId: string, title: string) => void;
  toggleSubTask: (taskId: string, subTaskId: string) => void;
  deleteSubTask: (taskId: string, subTaskId: string) => void;
  /** Moves a step one place up (-1) or down (1). Does nothing at either end. */
  moveSubTask: (taskId: string, subTaskId: string, direction: -1 | 1) => void;
  processRepeatingTasks: () => void;
  reorderTasks: (taskIds: string[], listId: string) => void;
  
  // List actions
  addList: (name: string, color?: string, emoji?: string, groupId?: string | null) => void;
  updateList: (id: string, updates: Partial<TaskList>) => void;
  deleteList: (id: string) => void;
  /** Makes a copy of a list with all its tasks, right after the original. Returns the new list's id, or null when there was nothing to copy. */
  duplicateList: (id: string) => string | null;
  reorderLists: (groupId: string | null, listIds: string[]) => void;
  moveListToGroup: (listId: string, groupId: string | null) => void;
  insertListAtPosition: (listId: string, targetGroupId: string | null, position: number) => void;
  moveListToPosition: (listId: string, targetGroupId: string | null, beforeListId?: string, afterListId?: string) => void;
  
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
  setThemePreference: (preference: ThemePreference) => void;
  /** The device's light/dark setting changed: update what is shown, when the preference is "system" */
  syncSystemTheme: () => void;
  setRowDensity: (density: RowDensity) => void;
  toggleSidebar: () => void;
  /** Writes a save that is still waiting. Call before anything that reads storage or leaves the page. */
  flushPendingSave: () => void;

  // Backup and reset (Settings > Data)
  /** The text of a backup file with everything the app keeps */
  exportBackup: () => string;
  /** Replaces all data with a checked backup; the old data is kept so the import can be undone */
  importBackup: (data: BackupData, options?: { saveUndoCopy?: boolean }) => CommitResult;
  /** Puts back the data from just before the last import */
  restorePreviousData: () => CommitResult;
  hasPreviousData: () => boolean;
  /** Removes all data from this browser. The page must be reloaded afterwards. */
  removeAllData: () => CommitResult;
  
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

/**
 * What every group of actions gets from the store, so they all save and freeze the same way.
 * The groups live in this folder; `stores/taskStore.ts` joins them into the one store.
 */
export interface StoreContext {
  set: StoreApi<TaskStore>['setState'];
  get: () => TaskStore;
  /** Ask for a save soon (saves are collected, see utils/writeScheduler.ts) */
  saveState: () => void;
  /** Write a waiting save now */
  flushWrites: () => void;
  /** Stop saving until the page reloads (after "remove all data" or an undone import) */
  freezePersistence: () => void;
  /** What is written to storage, in one place so saving and importing can't drift apart */
  toPersistedState: (state: AppState) => AppState;
}
