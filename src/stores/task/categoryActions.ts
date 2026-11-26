import type { Category } from '../../types/index.ts';
import { generateId } from '../../utils/storage.ts';
import { useToastStore } from '../toastStore.ts';
import { deduplicateCategoryIds, normalizeCategoryName } from './helpers.ts';
import type { StoreContext, TaskStore } from './types.ts';

/** Tag actions (called "categories" in the code): creating, editing, deleting and assigning tags. */
export const createCategoryActions = ({ set, get, saveState }: StoreContext): Pick<TaskStore, 'addCategory' | 'updateCategory' | 'deleteCategory' | 'assignTaskToCategory' | 'removeTaskFromCategory' | 'assignTaskToCategories' | 'getTaskCountForCategory' | 'getCategoriesForTask'> => ({
  addCategory: (name: string, color?: string, emoji?: string, description?: string) => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      useToastStore.getState().showError('Invalid tag name', 'Tag name cannot be empty');
      throw new Error('Category name cannot be empty');
    }

    const normalizedName = normalizeCategoryName(trimmedName);
    const existingCategory = get().categories.find(cat => 
      normalizeCategoryName(cat.name) === normalizedName
    );

    if (existingCategory) {
      useToastStore.getState().showError('Tag already exists', `A tag named "${existingCategory.name}" already exists`);
      throw new Error(`Category "${existingCategory.name}" already exists`);
    }

    const newCategory: Category = {
      id: generateId(),
      name: trimmedName,
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
    useToastStore.getState().showSuccess('Tag created', `"${trimmedName}" was created`);
    
    return newCategory;
  },

  updateCategory: (id: string, updates: Partial<Category>) => {
    const category = get().categories.find(c => c.id === id);
    if (!category) {
      useToastStore.getState().showError('Tag not found', 'The tag you are trying to update no longer exists');
      return;
    }
    
    // If name is being updated, check for duplicates
    if (updates.name) {
      const trimmedName = updates.name.trim();
      
      if (!trimmedName) {
        useToastStore.getState().showError('Invalid tag name', 'Tag name cannot be empty');
        throw new Error('Category name cannot be empty');
      }

      const normalizedName = normalizeCategoryName(trimmedName);
      const existingCategory = get().categories.find(cat => 
        cat.id !== id && normalizeCategoryName(cat.name) === normalizedName
      );

      if (existingCategory) {
        useToastStore.getState().showError('Tag already exists', `A tag named "${existingCategory.name}" already exists`);
        throw new Error(`Category "${existingCategory.name}" already exists`);
      }

      updates.name = trimmedName;
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
    const categoryName = category?.name || 'Tag';
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
        'Tag deleted', 
        `"${categoryName}" was removed from ${taskCount} task${taskCount > 1 ? 's' : ''}`
      );
    } else {
      useToastStore.getState().showInfo('Tag deleted', `"${categoryName}" was removed`);
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
      useToastStore.getState().showError('Tag not found', 'The tag no longer exists');
      return;
    }

    // Check if task already has this category
    if (task.categoryIds?.includes(categoryId)) {
      return;
    }

    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? { ...task, categoryIds: deduplicateCategoryIds([...(task.categoryIds || []), categoryId]), updatedAt: new Date() }
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

    const uniqueCategoryIds = deduplicateCategoryIds(categoryIds);

    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? { ...task, categoryIds: uniqueCategoryIds, updatedAt: new Date() }
          : task
      ),
    }));
    saveState();
  },

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
});
