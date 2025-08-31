import { useMemo } from 'react';
import { useTaskStore } from '../stores/taskStore.ts';
import { useTaskStatistics } from '../hooks/useTaskStatistics.ts';
import { StatCard } from './ui/StatCard.tsx';
import { EmptyStatsPlaceholder } from './ui/EmptyStatsPlaceholder.tsx';
import { 
  getMyDayStatCards,
  getImportantStatCards,
  getPlannedStatCards,
  getListStatCards,
  getCategoryStatCards,
  getAllTasksStatCards,
  type StatCardConfig,
  type ViewConfigParams
} from '../utils/statCards/index.ts';

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
    setView,
    addTask
  } = useTaskStore();

  // Get statistics using the custom hook
  const stats = useTaskStatistics({
    tasks,
    currentView,
    currentListId,
    currentCategoryId
  });

  // Get current list and category for view-specific configurations
  const currentList = useMemo(() => {
    if (currentView === 'list' && currentListId) {
      return lists.find(l => l.id === currentListId) || null;
    }
    return null;
  }, [currentView, currentListId, lists]);

  const currentCategory = useMemo(() => {
    if (currentView === 'category' && currentCategoryId) {
      return categories.find(c => c.id === currentCategoryId) || null;
    }
    return null;
  }, [currentView, currentCategoryId, categories]);

  // Navigation handlers
  const navigationHandlers = useMemo(() => ({
    handleImportantClick: () => setView('important'),
    handlePlannedClick: () => setView('planned'),
    handleMyDayClick: () => setView('my-day'),
    handleAllTasksClick: () => setView('all')
  }), [setView]);

  // Task creation handler for the placeholder
  const handleCreateTask = useMemo(() => () => {
    const getDefaultTaskOptions = () => {
      switch (currentView) {
        case 'my-day':
          return { myDay: true };
        case 'important':
          return { important: true };
        case 'planned':
          return { dueDate: new Date() };
        case 'category':
          return currentCategoryId ? { categoryIds: [currentCategoryId] } : {};
        default:
          return {};
      }
    };

    const listId = currentView === 'list' && currentListId ? currentListId : 'all';
    const options = getDefaultTaskOptions();
    
    addTask('New Task', listId, options);
  }, [currentView, currentListId, currentCategoryId, addTask]);

  // Get stat cards configuration for the current view
  const statCards = useMemo(() => {
    const configParams: ViewConfigParams = {
      stats,
      currentList,
      currentCategory,
      navigationHandlers
    };

    switch (currentView) {
      case 'my-day':
        return getMyDayStatCards(configParams);
      case 'important':
        return getImportantStatCards(configParams);
      case 'planned':
        return getPlannedStatCards(configParams);
      case 'list':
        return getListStatCards(configParams);
      case 'category':
        return getCategoryStatCards(configParams);
      case 'all':
      default:
        return getAllTasksStatCards(configParams);
    }
  }, [currentView, stats, currentList, currentCategory, navigationHandlers]);

  // Show placeholder if there are no tasks at all in the current view context
  if (stats.totalTasks === 0 && currentView !== 'all') {
    return (
      <EmptyStatsPlaceholder 
        view={currentView}
        listName={currentList?.name}
        categoryName={currentCategory?.name}
        onCreateTask={handleCreateTask}
        className={className}
      />
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 ${className || ''}`}>
      {statCards.map((stat: StatCardConfig, index: number) => (
        <StatCard
          key={`${currentView}-${stat.title}-${index}`}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          subtitle={stat.subtitle}
          color={stat.color}
          trend={stat.trend || undefined}
          onClick={stat.onClick}
        />
      ))}
    </div>
  );
}
