import { Calendar, CheckSquare, Clock, Flame } from 'lucide-react';
import { getSubtitleText } from '../statisticsUtils.ts';
import type { ViewConfigFunction } from './types.ts';

/**
 * Configuration for My Day view stat cards
 */
export const getMyDayStatCards: ViewConfigFunction = ({
  stats,
  navigationHandlers
}) => {
  const { 
    handleMyDayClick, 
    handleAllTasksClick, 
    handlePlannedClick 
  } = navigationHandlers;

  return [
    {
      title: 'My Day Tasks',
      value: stats.totalTasks,
      icon: Calendar,
      subtitle: stats.incompleteTasks > 0 
        ? getSubtitleText(stats.incompleteTasks, 'remaining', 'remaining') 
        : 'all done!',
      color: '#3b82f6',
      onClick: handleMyDayClick
    },
    {
      title: 'Completed Today',
      value: stats.completedToday,
      icon: CheckSquare,
      subtitle: 'across all lists',
      color: '#10b981',
      trend: stats.trends.completed,
      onClick: handleAllTasksClick
    },
    {
      title: 'Due Today',
      value: stats.dueToday,
      icon: Clock,
      subtitle: stats.dueToday === 0 
        ? 'none' 
        : getSubtitleText(stats.dueToday, 'item needs attention', 'items need attention'),
      color: '#f59e0b',
      onClick: handlePlannedClick
    },
    {
      title: 'Productivity Streak',
      value: stats.productivityStreak,
      icon: Flame,
      subtitle: stats.productivityStreak === 0 
        ? 'start today!' 
        : stats.productivityStreak === 1 
          ? 'day streak' 
          : 'days streak',
      color: stats.productivityStreak >= 7 
        ? '#10b981' 
        : stats.productivityStreak >= 3 
          ? '#f59e0b' 
          : '#ef4444'
    }
  ];
};
