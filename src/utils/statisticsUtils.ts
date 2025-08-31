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
import type { Task } from '../types/index.ts';

/**
 * Task filtering utilities to consolidate repetitive filter operations
 */
export class TaskFilters {
  static completed = (task: Task): boolean => task.completed;
  
  static incomplete = (task: Task): boolean => !task.completed;
  
  static important = (task: Task): boolean => task.important;
  
  static importantIncomplete = (task: Task): boolean => 
    task.important && !task.completed;
  
  static dueToday = (task: Task): boolean => 
    !!task.dueDate && isToday(task.dueDate) && !task.completed;
  
  static overdue = (task: Task): boolean => 
    !!task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) && !task.completed;
  
  static completedToday = (task: Task): boolean => 
    task.completed && !!task.updatedAt && isToday(task.updatedAt);
  
  static completedThisWeek = (task: Task): boolean => 
    task.completed && !!task.updatedAt && isThisWeek(task.updatedAt);
  
  static withDueDate = (task: Task): boolean => 
    !!task.dueDate;
  
  static withReminder = (task: Task): boolean => 
    !!task.reminder;
  
  static planned = (task: Task): boolean => 
    TaskFilters.withDueDate(task) || TaskFilters.withReminder(task);
  
  static myDay = (task: Task): boolean => 
    task.myDay;
  
  static inList = (listId: string) => (task: Task): boolean => 
    task.listId === listId;
  
  static inCategory = (categoryId: string) => (task: Task): boolean => 
    task.categoryIds.includes(categoryId);
  
  static createdAfter = (date: Date) => (task: Task): boolean => 
    !!task.createdAt && task.createdAt >= date;
  
  static updatedAfter = (date: Date) => (task: Task): boolean => 
    !!task.updatedAt && task.updatedAt >= date;
  
  static completedWithTiming = (task: Task): boolean => 
    task.completed && !!task.createdAt && !!task.updatedAt;
}

/**
 * Basic task metrics calculations
 */
export function calculateBasicMetrics(tasks: Task[]) {
  return {
    total: tasks.length,
    completed: tasks.filter(TaskFilters.completed).length,
    incomplete: tasks.filter(TaskFilters.incomplete).length,
    important: tasks.filter(TaskFilters.importantIncomplete).length,
    planned: tasks.filter(TaskFilters.planned).length,
  };
}

/**
 * Date-based task metrics
 */
export function calculateDateMetrics(tasks: Task[]) {
  return {
    dueToday: tasks.filter(TaskFilters.dueToday).length,
    overdue: tasks.filter(TaskFilters.overdue).length,
    completedToday: tasks.filter(TaskFilters.completedToday).length,
    completedThisWeek: tasks.filter(TaskFilters.completedThisWeek).length,
  };
}

/**
 * Advanced productivity metrics
 */
export function calculateProductivityMetrics(tasks: Task[]) {
  const averageCompletionTime = calculateAverageCompletionTime(tasks);
  const taskCreationRate = calculateTaskCreationRate(tasks);
  const productivityStreak = calculateProductivityStreak(tasks);
  const dailyCompletionAverage = calculateDailyCompletionAverage(tasks);
  
  return {
    averageCompletionTime,
    taskCreationRate,
    productivityStreak,
    dailyCompletionAverage,
  };
}

/**
 * Calculate average completion time in hours
 */
export function calculateAverageCompletionTime(tasks: Task[]): number {
  const completedTasksWithTimes = tasks.filter(TaskFilters.completedWithTiming);
  
  if (completedTasksWithTimes.length === 0) return 0;
  
  const totalHours = completedTasksWithTimes.reduce((sum, task) => {
    const hours = differenceInHours(task.updatedAt!, task.createdAt!);
    return sum + Math.max(0, hours); // Ensure non-negative
  }, 0);
  
  return Math.round(totalHours / completedTasksWithTimes.length);
}

/**
 * Calculate task creation rate (tasks per day in last week)
 */
export function calculateTaskCreationRate(tasks: Task[]): number {
  const oneWeekAgo = subDays(new Date(), 7);
  const recentTasks = tasks.filter(TaskFilters.createdAfter(oneWeekAgo));
  return Math.round((recentTasks.length / 7) * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate current productivity streak (consecutive days with completed tasks)
 */
export function calculateProductivityStreak(tasks: Task[]): number {
  const completedTasks = tasks.filter(task => 
    task.completed && !!task.updatedAt
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
}

/**
 * Calculate daily completion average over the last week
 */
export function calculateDailyCompletionAverage(tasks: Task[]): number {
  const oneWeekAgo = subDays(new Date(), 7);
  const recentCompletions = tasks.filter(task => 
    task.completed && !!task.updatedAt && task.updatedAt >= oneWeekAgo
  );
  return Math.round((recentCompletions.length / 7) * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate completion rate percentage
 */
export function calculateCompletionRate(total: number, completed: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

/**
 * Trend calculation utilities
 */
export interface TrendData {
  direction: 'up' | 'down' | 'neutral';
  value: number;
  label: string;
}

export function calculateTrend(currentValue: number, previousValue: number): TrendData | null {
  if (previousValue === 0) {
    return currentValue > 0 ? { 
      direction: 'up', 
      value: currentValue, 
      label: 'new' 
    } : null;
  }
  
  const change = currentValue - previousValue;
  const percentChange = Math.round((change / previousValue) * 100);
  
  if (Math.abs(percentChange) < 5) {
    return { 
      direction: 'neutral', 
      value: Math.abs(percentChange), 
      label: 'stable' 
    };
  }
  
  return {
    direction: change > 0 ? 'up' : 'down',
    value: Math.abs(percentChange),
    label: `${Math.abs(percentChange)}%`
  };
}

/**
 * Get previous week's statistics for trend calculations
 */
export function getPreviousWeekStats(tasks: Task[]) {
  const now = new Date();
  const lastWeekStart = startOfWeek(subWeeks(now, 1));
  const lastWeekEnd = endOfWeek(subWeeks(now, 1));

  const lastWeekTasks = tasks.filter(task => {
    if (!task.updatedAt) return false;
    return isWithinInterval(task.updatedAt, { start: lastWeekStart, end: lastWeekEnd });
  });

  const completed = lastWeekTasks.filter(TaskFilters.completed).length;
  const important = lastWeekTasks.filter(task => task.important && task.completed).length;
  const planned = lastWeekTasks.filter(task => task.dueDate && !task.completed).length;
  const dueToday = lastWeekTasks.filter(TaskFilters.dueToday).length;
  const overdue = lastWeekTasks.filter(TaskFilters.overdue).length;
  const total = lastWeekTasks.length;
  const completionRate = calculateCompletionRate(total, completed);
  
  return {
    completed,
    important,
    planned,
    dueToday,
    overdue,
    completionRate,
    total
  };
}

/**
 * Filter tasks by view type
 */
export function filterTasksByView(
  tasks: Task[], 
  view: string, 
  listId?: string, 
  categoryId?: string
): Task[] {
  switch (view) {
    case 'my-day':
      return tasks.filter(TaskFilters.myDay);
    case 'important':
      return tasks.filter(TaskFilters.important);
    case 'planned':
      return tasks.filter(TaskFilters.planned);
    case 'list':
      return listId ? tasks.filter(TaskFilters.inList(listId)) : [];
    case 'category':
      return categoryId ? tasks.filter(TaskFilters.inCategory(categoryId)) : [];
    case 'all':
    default:
      return tasks;
  }
}

/**
 * Helper function for subtitle text with proper pluralization
 */
export function getSubtitleText(count: number, singularText: string, pluralText?: string): string {
  if (count === 0) return 'none';
  if (count === 1) return singularText;
  return pluralText || singularText;
}
