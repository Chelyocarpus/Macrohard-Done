import { useMemo } from 'react';
import { filterTasksByView } from '../utils/statisticsUtils.ts';
import type { Task } from '../types/index.ts';

interface UseTaskFiltersParams {
  tasks: Task[];
  currentView: string;
  currentListId?: string;
  currentCategoryId?: string;
}

/**
 * Custom hook that provides memoized filtered task arrays for better performance
 * Consolidates the view-based filtering logic and caches results
 */
export function useTaskFilters({
  tasks,
  currentView,
  currentListId,
  currentCategoryId
}: UseTaskFiltersParams) {
  // Memoize the filtered tasks for the current view
  const filteredTasks = useMemo(() => {
    return filterTasksByView(tasks, currentView, currentListId, currentCategoryId);
  }, [tasks, currentView, currentListId, currentCategoryId]);

  // Also provide all tasks for global calculations (like "completed today across all lists")
  const allTasks = useMemo(() => tasks, [tasks]);

  return {
    filteredTasks,
    allTasks
  };
}
