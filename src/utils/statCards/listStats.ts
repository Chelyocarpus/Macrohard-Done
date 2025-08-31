import { ListTodo, CheckSquare, Star, Clock } from 'lucide-react';
import { getSubtitleText } from '../statisticsUtils.ts';
import type { ViewConfigFunction } from './types.ts';

/**
 * Configuration for List view stat cards
 */
export const getListStatCards: ViewConfigFunction = ({
  stats,
  currentList,
  navigationHandlers
}) => {
  const { 
    handleImportantClick, 
    handlePlannedClick 
  } = navigationHandlers;

  return [
    {
      title: currentList?.name || 'List Tasks',
      value: stats.totalTasks,
      icon: ListTodo,
      subtitle: getSubtitleText(stats.incompleteTasks, 'remaining', 'remaining'),
      color: currentList?.color || '#6b7280',
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
      title: 'Due Soon',
      value: stats.dueToday + stats.overdue,
      icon: Clock,
      subtitle: stats.dueToday + stats.overdue === 0 
        ? 'none' 
        : getSubtitleText(stats.dueToday + stats.overdue, 'item needs attention', 'items need attention'),
      color: '#f59e0b',
      onClick: handlePlannedClick
    }
  ];
};
