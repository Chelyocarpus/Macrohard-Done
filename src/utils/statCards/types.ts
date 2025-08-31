import type { LucideIcon } from 'lucide-react';
import type { TrendData } from '../statisticsUtils.ts';

/**
 * Configuration for a single stat card
 */
export interface StatCardConfig {
  title: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
  color?: string;
  trend?: TrendData | null;
  onClick?: () => void;
}

/**
 * Parameters passed to view configuration functions
 */
export interface ViewConfigParams {
  stats: TaskStatistics;
  currentList?: {
    id: string;
    name: string;
    color?: string;
  } | null;
  currentCategory?: {
    id: string;
    name: string;
    color?: string;
  } | null;
  navigationHandlers: {
    handleImportantClick: () => void;
    handlePlannedClick: () => void;
    handleMyDayClick: () => void;
    handleAllTasksClick: () => void;
  };
}

/**
 * Task statistics interface (re-exported for convenience)
 */
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
 * Type for view configuration functions
 */
export type ViewConfigFunction = (params: ViewConfigParams) => StatCardConfig[];
