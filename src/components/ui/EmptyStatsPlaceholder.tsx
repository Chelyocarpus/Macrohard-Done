import { Plus, BarChart3 } from 'lucide-react';

interface EmptyStatsPlaceholderProps {
  view: string;
  listName?: string;
  categoryName?: string;
  onCreateTask?: () => void;
  className?: string;
}

/**
 * Placeholder component shown when there are no tasks in the current view
 */
export function EmptyStatsPlaceholder({ view, listName, categoryName, onCreateTask, className }: EmptyStatsPlaceholderProps) {
  const getViewDisplayName = (viewType: string): string => {
    switch (viewType) {
      case 'my-day':
        return 'My Day';
      case 'important':
        return 'Important';
      case 'planned':
        return 'Planned';
      case 'list':
        return 'this list';
      case 'category':
        return 'this category';
      default:
        return 'this view';
    }
  };

  const getEmptyMessage = (viewType: string): { title: string; subtitle: string } => {
    switch (viewType) {
      case 'my-day':
        return {
          title: 'No tasks in My Day',
          subtitle: 'Add tasks to My Day to see your daily statistics and track your progress.'
        };
      case 'important':
        return {
          title: 'No important tasks',
          subtitle: 'Mark tasks as important to see priority-focused statistics and insights.'
        };
      case 'planned':
        return {
          title: 'No planned tasks',
          subtitle: 'Add due dates or reminders to tasks to see planning statistics.'
        };
      case 'list':
        return {
          title: `No tasks in ${listName || 'this list'}`,
          subtitle: `Create tasks in ${listName || 'this list'} to see statistics and track your progress.`
        };
      case 'category':
        return {
          title: `No tasks in ${categoryName || 'this category'}`,
          subtitle: `Assign tasks to ${categoryName || 'this category'} to see relevant statistics and insights.`
        };
      default:
        return {
          title: `No tasks in ${getViewDisplayName(viewType)}`,
          subtitle: 'Create tasks to see statistics and track your progress.'
        };
    }
  };

  const { title, subtitle } = getEmptyMessage(view);

  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className || ''}`}>
      <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800">
        <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
        {subtitle}
      </p>
      
      {onCreateTask && (
        <button
          onClick={onCreateTask}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      )}
    </div>
  );
}
