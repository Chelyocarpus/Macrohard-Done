import { Target, CheckSquare, Star, Clock } from 'lucide-react';
import { getSubtitleText } from '../statisticsUtils.ts';
import type { ViewConfigFunction } from './types.ts';

/**
 * Configuration for Category view stat cards
 */
export const getCategoryStatCards: ViewConfigFunction = ({
  stats,
  currentCategory,
  navigationHandlers
}) => {
  const { 
    handleImportantClick 
  } = navigationHandlers;

  return [
    {
      title: currentCategory?.name || 'Category Tasks',
      value: stats.totalTasks,
      icon: Target,
      subtitle: getSubtitleText(stats.incompleteTasks, 'remaining', 'remaining'),
      color: currentCategory?.color || '#6b7280',
      trend: stats.trends.planned
    },
    {
      title: 'Completed',
      value: stats.completedTasks,
      icon: CheckSquare,
      subtitle: getSubtitleText(stats.completedTasks, 'completed', 'completed'),
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
      title: 'Due Today',
      value: stats.dueToday,
      icon: Clock,
      subtitle: stats.dueToday === 0 
        ? 'none' 
        : getSubtitleText(stats.dueToday, 'item needs attention', 'items need attention'),
      color: '#f59e0b',
      trend: stats.trends.dueToday
    }
  ];
};
