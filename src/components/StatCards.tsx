import { useMemo } from 'react';
import { 
  CheckSquare, 
  Star, 
  Calendar, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Target,
  ListTodo,
  Flame,
  Zap,
  Activity
} from 'lucide-react';
import { 
  isToday, 
  isPast, 
  isThisWeek,
  subWeeks,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  differenceInHours,
  differenceInDays,
  startOfDay,
  isSameDay,
  subDays
} from 'date-fns';
import { useTaskStore } from '../stores/taskStore.ts';
import { StatCard } from './ui/StatCard.tsx';
import type { Task } from '../types/index.ts';

interface StatCardsProps {
  className?: string;
}

export function StatCards({ className }: StatCardsProps) {
  const { 
    tasks, 
    currentView, 
    currentListId, 
    currentCategoryId,
    lists,
    categories,
    setView 
  } = useTaskStore();

  // Helper function for subtitle text
  const getSubtitleText = (count: number, singularText: string, pluralText?: string): string => {
    if (count === 0) return 'none';
    if (count === 1) return singularText;
    return pluralText || singularText;
  };

  // Calculate statistics based on current view
  const stats = useMemo(() => {
    // Helper function to calculate trends
    const calculateTrend = (currentValue: number, previousValue: number) => {
      if (previousValue === 0) {
        return currentValue > 0 ? { direction: 'up' as const, value: currentValue, label: 'new' } : null;
      }
      
      const change = currentValue - previousValue;
      const percentChange = Math.round((change / previousValue) * 100);
      
      if (Math.abs(percentChange) < 5) {
        return { direction: 'neutral' as const, value: Math.abs(percentChange), label: 'stable' };
      }
      
      return {
        direction: change > 0 ? 'up' as const : 'down' as const,
        value: Math.abs(percentChange),
        label: `${Math.abs(percentChange)}%`
      };
    };

    // Calculate average completion time in hours
    const calculateAverageCompletionTime = () => {
      const completedTasksWithTimes = tasks.filter(task => 
        task.completed && task.createdAt && task.updatedAt
      );
      
      if (completedTasksWithTimes.length === 0) return 0;
      
      const totalHours = completedTasksWithTimes.reduce((sum, task) => {
        const hours = differenceInHours(task.updatedAt!, task.createdAt!);
        return sum + Math.max(0, hours); // Ensure non-negative
      }, 0);
      
      return Math.round(totalHours / completedTasksWithTimes.length);
    };

    // Calculate task creation rate (tasks per day in last week)
    const calculateTaskCreationRate = () => {
      const oneWeekAgo = subDays(new Date(), 7);
      const recentTasks = tasks.filter(task => 
        task.createdAt && task.createdAt >= oneWeekAgo
      );
      return Math.round((recentTasks.length / 7) * 10) / 10; // Round to 1 decimal
    };

    // Calculate current productivity streak (consecutive days with completed tasks)
    const calculateProductivityStreak = () => {
      const completedTasks = tasks.filter(task => 
        task.completed && task.updatedAt
      );
      
      if (completedTasks.length === 0) return 0;
      
      // Group tasks by completion date
      const completionDates = completedTasks
        .map(task => startOfDay(task.updatedAt!))
        .filter((date, index, array) => 
          array.findIndex(d => isSameDay(d, date)) === index
        )
        .sort((a, b) => b.getTime() - a.getTime()); // Most recent first
      
      let streak = 0;
      let checkDate = startOfDay(new Date());
      
      for (const completionDate of completionDates) {
        if (isSameDay(completionDate, checkDate)) {
          streak++;
          checkDate = subDays(checkDate, 1);
        } else if (differenceInDays(checkDate, completionDate) === 1) {
          // Allow for today not having completions yet
          checkDate = subDays(checkDate, 1);
          if (isSameDay(completionDate, checkDate)) {
            streak++;
            checkDate = subDays(checkDate, 1);
          } else {
            break;
          }
        } else {
          break;
        }
      }
      
      return streak;
    };

    // Calculate daily completion average
    const calculateDailyCompletionAverage = () => {
      const oneWeekAgo = subDays(new Date(), 7);
      const recentCompletions = tasks.filter(task => 
        task.completed && task.updatedAt && task.updatedAt >= oneWeekAgo
      );
      return Math.round((recentCompletions.length / 7) * 10) / 10; // Round to 1 decimal
    };

    // Helper function to get previous week's data
    const getPreviousWeekStats = () => {
      const now = new Date();
      const lastWeekStart = startOfWeek(subWeeks(now, 1));
      const lastWeekEnd = endOfWeek(subWeeks(now, 1));

      const lastWeekTasks = tasks.filter(task => {
        if (!task.updatedAt) return false;
        return isWithinInterval(task.updatedAt, { start: lastWeekStart, end: lastWeekEnd });
      });

      const lastWeekCompleted = lastWeekTasks.filter(task => task.completed).length;
      const lastWeekImportant = lastWeekTasks.filter(task => task.important && task.completed).length;
      const lastWeekPlanned = lastWeekTasks.filter(task => task.dueDate && !task.completed).length;
      const lastWeekDueToday = lastWeekTasks.filter(task => 
        task.dueDate && isToday(task.dueDate) && !task.completed
      ).length;
      const lastWeekOverdue = lastWeekTasks.filter(task => 
        task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) && !task.completed
      ).length;
      const lastWeekCompletionRate = lastWeekTasks.length > 0 
        ? Math.round((lastWeekCompleted / lastWeekTasks.length) * 100) 
        : 0;
      
      return {
        completed: lastWeekCompleted,
        important: lastWeekImportant,
        planned: lastWeekPlanned,
        dueToday: lastWeekDueToday,
        overdue: lastWeekOverdue,
        completionRate: lastWeekCompletionRate,
        total: lastWeekTasks.length
      };
    };
    
    let filteredTasks: Task[] = [];
    
    // Filter tasks based on current view
    switch (currentView) {
      case 'my-day':
        filteredTasks = tasks.filter(task => task.myDay);
        break;
      case 'important':
        filteredTasks = tasks.filter(task => task.important);
        break;
      case 'planned':
        filteredTasks = tasks.filter(task => task.dueDate || task.reminder);
        break;
      case 'list':
        filteredTasks = tasks.filter(task => task.listId === currentListId);
        break;
      case 'category':
        filteredTasks = tasks.filter(task => 
          task.categoryIds.includes(currentCategoryId || '')
        );
        break;
      case 'all':
      default:
        filteredTasks = tasks;
        break;
    }

    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(task => task.completed).length;
    const incompleteTasks = totalTasks - completedTasks;
    const importantTasks = filteredTasks.filter(task => task.important && !task.completed).length;
    const plannedTasks = filteredTasks.filter(task => task.dueDate && !task.completed).length;
    
    // Date-based calculations
    const dueToday = filteredTasks.filter(task => 
      task.dueDate && isToday(task.dueDate) && !task.completed
    ).length;
    
    const overdue = filteredTasks.filter(task => 
      task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) && !task.completed
    ).length;

    const completedToday = tasks.filter(task => 
      task.completed && task.updatedAt && isToday(task.updatedAt)
    ).length;

    const completedThisWeek = tasks.filter(task => 
      task.completed && task.updatedAt && isThisWeek(task.updatedAt)
    ).length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate advanced productivity metrics
    const averageCompletionTime = calculateAverageCompletionTime();
    const taskCreationRate = calculateTaskCreationRate();
    const productivityStreak = calculateProductivityStreak();
    const dailyCompletionAverage = calculateDailyCompletionAverage();

    // Calculate trends
    const previousWeekStats = getPreviousWeekStats();
    const completedTrend = calculateTrend(completedThisWeek, previousWeekStats.completed);
    const importantTrend = calculateTrend(importantTasks, previousWeekStats.important);
    const plannedTrend = calculateTrend(plannedTasks, previousWeekStats.planned);
    const dueTodayTrend = calculateTrend(dueToday, previousWeekStats.dueToday);
    const overdueTrend = calculateTrend(overdue, previousWeekStats.overdue);
    const completionRateTrend = calculateTrend(completionRate, previousWeekStats.completionRate);

    return {
      totalTasks,
      completedTasks,
      incompleteTasks,
      importantTasks,
      dueToday,
      overdue,
      completedToday,
      completedThisWeek,
      completionRate,
      // Advanced productivity metrics
      averageCompletionTime,
      taskCreationRate,
      productivityStreak,
      dailyCompletionAverage,
      trends: {
        completed: completedTrend,
        important: importantTrend,
        planned: plannedTrend,
        dueToday: dueTodayTrend,
        overdue: overdueTrend,
        completionRate: completionRateTrend
      }
    };
  }, [tasks, currentView, currentListId, currentCategoryId]);

  // Get contextual stats based on current view
  const getStatsForView = () => {
    const currentList = currentView === 'list' && currentListId 
      ? lists.find(l => l.id === currentListId)
      : null;
    
    const currentCategory = currentView === 'category' && currentCategoryId
      ? categories.find(c => c.id === currentCategoryId)
      : null;

    // Navigation handlers
    const handleImportantClick = () => setView('important');
    const handlePlannedClick = () => setView('planned');
    const handleMyDayClick = () => setView('my-day');
    const handleAllTasksClick = () => setView('all');

    switch (currentView) {
      case 'my-day':
        return [
          {
            title: 'My Day Tasks',
            value: stats.totalTasks,
            icon: Calendar,
            subtitle: stats.incompleteTasks > 0 ? getSubtitleText(stats.incompleteTasks, 'remaining', 'remaining') : 'all done!',
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
            subtitle: stats.dueToday === 0 ? 'none' : getSubtitleText(stats.dueToday, 'item needs attention', 'items need attention'),
            color: '#f59e0b',
            onClick: handlePlannedClick
          },
          {
            title: 'Productivity Streak',
            value: stats.productivityStreak,
            icon: Flame,
            subtitle: stats.productivityStreak === 0 ? 'start today!' : stats.productivityStreak === 1 ? 'day streak' : 'days streak',
            color: stats.productivityStreak >= 7 ? '#10b981' : stats.productivityStreak >= 3 ? '#f59e0b' : '#ef4444'
          }
        ];

      case 'important':
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
            subtitle: stats.overdue === 0 ? 'none' : getSubtitleText(stats.overdue, 'item needs attention', 'items need attention'),
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

      case 'planned':
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
            subtitle: stats.dueToday === 0 ? 'none' : getSubtitleText(stats.dueToday, 'item needs attention', 'items need attention'),
            color: '#f59e0b',
            trend: stats.trends.dueToday
          },
          {
            title: 'Overdue',
            value: stats.overdue,
            icon: AlertTriangle,
            subtitle: stats.overdue === 0 ? 'none' : getSubtitleText(stats.overdue, 'item past due', 'items past due'),
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

      case 'list':
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
            subtitle: stats.dueToday + stats.overdue === 0 ? 'none' : getSubtitleText(stats.dueToday + stats.overdue, 'item needs attention', 'items need attention'),
            color: '#f59e0b',
            onClick: handlePlannedClick
          }
        ];

      case 'category':
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
            subtitle: stats.dueToday === 0 ? 'none' : getSubtitleText(stats.dueToday, 'item needs attention', 'items need attention'),
            color: '#f59e0b',
            trend: stats.trends.dueToday
          }
        ];

      case 'all':
      default:
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
            subtitle: stats.completedThisWeek === 0 ? 'none yet' : stats.completedThisWeek === 1 ? 'great start!' : 'great progress!',
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
            color: stats.taskCreationRate >= 2 ? '#10b981' : stats.taskCreationRate >= 1 ? '#f59e0b' : '#6b7280'
          },
          {
            title: 'Avg Completion Time',
            value: `${stats.averageCompletionTime}h`,
            icon: Zap,
            subtitle: stats.averageCompletionTime <= 24 ? 'quick turnaround' : stats.averageCompletionTime <= 72 ? 'moderate pace' : 'slow completion',
            color: stats.averageCompletionTime <= 24 ? '#10b981' : stats.averageCompletionTime <= 72 ? '#f59e0b' : '#ef4444'
          },
          {
            title: 'Daily Average',
            value: stats.dailyCompletionAverage,
            icon: TrendingUp,
            subtitle: stats.dailyCompletionAverage === 1 ? 'completion per day' : 'completions per day',
            color: stats.dailyCompletionAverage >= 3 ? '#10b981' : stats.dailyCompletionAverage >= 1 ? '#f59e0b' : '#6b7280'
          }
        ];
    }
  };

  const statCards = getStatsForView();

  // Don't show stats if there are no tasks at all in the current view context
  if (stats.totalTasks === 0 && currentView !== 'all') {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 ${className || ''}`}>
      {statCards.map((stat, index) => (
        <StatCard
          key={`${currentView}-${stat.title}-${index}`}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          subtitle={stat.subtitle}
          color={stat.color}
        />
      ))}
    </div>
  );
}
