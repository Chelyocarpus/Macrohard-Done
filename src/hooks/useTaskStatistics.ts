import { useMemo } from 'react';
import { 
  calculateBasicMetrics,
  calculateDateMetrics,
  calculateProductivityMetrics,
  calculateCompletionRate,
  calculateTrend,
  getPreviousWeekStats
} from '../utils/statisticsUtils.ts';
import type { TrendData } from '../utils/statisticsUtils.ts';
import { useTaskFilters } from './useTaskFilters.ts';
import type { Task } from '../types/index.ts';

interface UseTaskStatisticsParams {
  tasks: Task[];
  currentView: string;
  currentListId?: string;
  currentCategoryId?: string;
}

export interface TaskStatistics {
  // Basic counts
  totalTasks: number;
  completedTasks: number;
  incompleteTasks: number;
  importantTasks: number;
  plannedTasks: number;
  
  // Date-based metrics
  dueToday: number;
  overdue: number;
  completedToday: number;
  completedThisWeek: number;
  
  // Calculated metrics
  completionRate: number;
  
  // Advanced productivity metrics
  averageCompletionTime: number;
  taskCreationRate: number;
  productivityStreak: number;
  dailyCompletionAverage: number;
  
  // Trend data
  trends: {
    completed: TrendData | null;
    important: TrendData | null;
    planned: TrendData | null;
    dueToday: TrendData | null;
    overdue: TrendData | null;
    completionRate: TrendData | null;
  };
}

/**
 * Custom hook that calculates all task statistics using the filtered tasks
 * Replaces the massive useMemo in the original StatCards component
 */
export function useTaskStatistics({
  tasks,
  currentView,
  currentListId,
  currentCategoryId
}: UseTaskStatisticsParams): TaskStatistics {
  // Get filtered tasks for the current view
  const { filteredTasks, allTasks } = useTaskFilters({
    tasks,
    currentView,
    currentListId,
    currentCategoryId
  });

  return useMemo(() => {
    // Calculate basic metrics for the filtered tasks
    const basic = calculateBasicMetrics(filteredTasks);
    
    // Calculate date metrics using all tasks (for global stats like "completed today across all lists")
    const dateMetrics = calculateDateMetrics(allTasks);
    
    // Calculate advanced productivity metrics
    const productivity = calculateProductivityMetrics(allTasks);
    
    // Calculate completion rate for filtered tasks
    const completionRate = calculateCompletionRate(basic.total, basic.completed);
    
    // Get previous week stats for trend calculations
    const previousWeekStats = getPreviousWeekStats(allTasks);
    
    // Calculate trends
    const trends = {
      completed: calculateTrend(dateMetrics.completedThisWeek, previousWeekStats.completed),
      important: calculateTrend(basic.important, previousWeekStats.important),
      planned: calculateTrend(basic.planned, previousWeekStats.planned),
      dueToday: calculateTrend(dateMetrics.dueToday, previousWeekStats.dueToday),
      overdue: calculateTrend(dateMetrics.overdue, previousWeekStats.overdue),
      completionRate: calculateTrend(completionRate, previousWeekStats.completionRate)
    };

    return {
      // Basic counts from filtered tasks
      totalTasks: basic.total,
      completedTasks: basic.completed,
      incompleteTasks: basic.incomplete,
      importantTasks: basic.important,
      plannedTasks: basic.planned,
      
      // Date metrics from all tasks
      dueToday: dateMetrics.dueToday,
      overdue: dateMetrics.overdue,
      completedToday: dateMetrics.completedToday,
      completedThisWeek: dateMetrics.completedThisWeek,
      
      // Calculated metrics
      completionRate,
      
      // Advanced productivity metrics
      averageCompletionTime: productivity.averageCompletionTime,
      taskCreationRate: productivity.taskCreationRate,
      productivityStreak: productivity.productivityStreak,
      dailyCompletionAverage: productivity.dailyCompletionAverage,
      
      // Trend data
      trends
    };
  }, [filteredTasks, allTasks]);
}
