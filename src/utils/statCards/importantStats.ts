import { Star, CheckSquare, AlertTriangle, Zap } from 'lucide-react';
import { getSubtitleText } from '../statisticsUtils.ts';
import type { ViewConfigFunction } from './types.ts';

/**
 * Configuration for Important view stat cards
 */
export const getImportantStatCards: ViewConfigFunction = ({
  stats,
  navigationHandlers
}) => {
  const { 
    handleImportantClick, 
    handlePlannedClick 
  } = navigationHandlers;

  return [
    {
      title: 'Important Tasks',
      value: stats.totalTasks,
      icon: Star,
      subtitle: getSubtitleText(stats.incompleteTasks, 'pending', 'pending'),
      color: '#f59e0b',
      trend: stats.trends.important,
      onClick: handleImportantClick
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
      title: 'Overdue',
      value: stats.overdue,
      icon: AlertTriangle,
      subtitle: stats.overdue === 0 
        ? 'none' 
        : getSubtitleText(stats.overdue, 'item needs attention', 'items need attention'),
      color: '#ef4444',
      onClick: handlePlannedClick
    },
    {
      title: 'Avg Completion',
      value: `${stats.averageCompletionTime}h`,
      icon: Zap,
      subtitle: stats.averageCompletionTime <= 24 ? 'fast execution' : 'needs focus',
      color: stats.averageCompletionTime <= 24 ? '#10b981' : '#f59e0b',
      onClick: handlePlannedClick
    }
  ];
};
