import { Calendar, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { getSubtitleText } from '../statisticsUtils.ts';
import type { ViewConfigFunction } from './types.ts';

/**
 * Configuration for Planned view stat cards
 */
export const getPlannedStatCards: ViewConfigFunction = ({
  stats,
  navigationHandlers
}) => {
  const { handlePlannedClick } = navigationHandlers;

  return [
    {
      title: 'Planned Tasks',
      value: stats.totalTasks,
      icon: Calendar,
      subtitle: 'with dates/reminders',
      color: '#8b5cf6',
      trend: stats.trends.planned,
      onClick: handlePlannedClick
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
    },
    {
      title: 'Overdue',
      value: stats.overdue,
      icon: AlertTriangle,
      subtitle: stats.overdue === 0 
        ? 'none' 
        : getSubtitleText(stats.overdue, 'item past due', 'items past due'),
      color: '#ef4444',
      trend: stats.trends.overdue
    },
    {
      title: 'Completed',
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      subtitle: 'completion rate',
      color: stats.completionRate >= 75 ? '#10b981' : '#f59e0b',
      trend: stats.trends.completionRate
    }
  ];
};
