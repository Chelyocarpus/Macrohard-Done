import { ListTodo, CheckSquare, Star, Activity, Zap, TrendingUp } from 'lucide-react';
import { getSubtitleText } from '../statisticsUtils.ts';
import type { ViewConfigFunction } from './types.ts';

/**
 * Configuration for All Tasks view stat cards
 */
export const getAllTasksStatCards: ViewConfigFunction = ({
  stats,
  navigationHandlers
}) => {
  const { 
    handleAllTasksClick, 
    handleImportantClick 
  } = navigationHandlers;

  return [
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      icon: ListTodo,
      subtitle: getSubtitleText(stats.incompleteTasks, 'remaining', 'remaining'),
      color: '#6b7280',
      onClick: handleAllTasksClick
    },
    {
      title: 'Completed This Week',
      value: stats.completedThisWeek,
      icon: CheckSquare,
      subtitle: stats.completedThisWeek === 0 
        ? 'none yet' 
        : stats.completedThisWeek === 1 
          ? 'great start!' 
          : 'great progress!',
      color: '#10b981',
      trend: stats.trends.completed
    },
    {
      title: 'Important',
      value: stats.importantTasks,
      icon: Star,
      subtitle: getSubtitleText(stats.importantTasks, 'priority item', 'priority items'),
      color: '#f59e0b',
      trend: stats.trends.important,
      onClick: handleImportantClick
    },
    {
      title: 'Task Creation Rate',
      value: stats.taskCreationRate,
      icon: Activity,
      subtitle: stats.taskCreationRate === 1 ? 'task per day' : 'tasks per day',
      color: stats.taskCreationRate >= 2 
        ? '#10b981' 
        : stats.taskCreationRate >= 1 
          ? '#f59e0b' 
          : '#6b7280'
    },
    {
      title: 'Avg Completion Time',
      value: `${stats.averageCompletionTime}h`,
      icon: Zap,
      subtitle: stats.averageCompletionTime <= 24 
        ? 'quick turnaround' 
        : stats.averageCompletionTime <= 72 
          ? 'moderate pace' 
          : 'slow completion',
      color: stats.averageCompletionTime <= 24 
        ? '#10b981' 
        : stats.averageCompletionTime <= 72 
          ? '#f59e0b' 
          : '#ef4444'
    },
    {
      title: 'Daily Average',
      value: stats.dailyCompletionAverage,
      icon: TrendingUp,
      subtitle: stats.dailyCompletionAverage === 1 
        ? 'completion per day' 
        : 'completions per day',
      color: stats.dailyCompletionAverage >= 3 
        ? '#10b981' 
        : stats.dailyCompletionAverage >= 1 
          ? '#f59e0b' 
          : '#6b7280'
    }
  ];
};
