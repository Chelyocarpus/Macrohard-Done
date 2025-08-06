import { Sun, Moon, Star, Calendar, CheckSquare, CheckCircle, List, Plus, Search, Menu } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { cn } from '../utils/cn.ts';

export function Sidebar() {
  const {
    lists,
    currentView,
    currentListId,
    searchQuery,
    darkMode,
    sidebarCollapsed,
    setView,
    setSearchQuery,
    toggleDarkMode,
    toggleSidebar,
    addList,
    getTaskCountForList,
  } = useTaskStore();

  const handleAddList = () => {
    const name = prompt('Enter list name:');
    if (name?.trim()) {
      addList(name.trim());
    }
  };

  const systemLists = [
    {
      id: 'my-day',
      name: 'My Day',
      icon: Sun,
      view: 'my-day' as const,
    },
    {
      id: 'important',
      name: 'Important',
      icon: Star,
      view: 'important' as const,
    },
    {
      id: 'planned',
      name: 'Planned',
      icon: Calendar,
      view: 'planned' as const,
    },
    {
      id: 'all',
      name: 'Tasks',
      icon: CheckSquare,
      view: 'all' as const,
    },
    {
      id: 'completed',
      name: 'Completed',
      icon: CheckCircle,
      view: 'completed' as const,
    },
  ];

  const customLists = lists.filter(list => !list.isSystem);

  return (
    <>
      <aside className={cn(
      'fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-30',
      sidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                To Do
              </h1>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="p-2"
            >
              <Menu size={20} />
            </Button>
          </div>
          
          {!sidebarCollapsed && (
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}
        </div>

        {/* System Lists */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {systemLists.map((listItem) => {
              const Icon = listItem.icon;
              const isActive = currentView === listItem.view;
              const taskCount = getTaskCountForList(listItem.id);

              return (
                <button
                  key={listItem.id}
                  onClick={() => setView(listItem.view)}
                  className={cn(
                    'w-full flex items-center px-3 py-2 rounded-md text-left transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                    sidebarCollapsed && 'justify-center'
                  )}
                >
                  <Icon size={20} className={cn(!sidebarCollapsed && 'mr-3')} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1">{listItem.name}</span>
                      {taskCount > 0 && (
                        <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                          {taskCount}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Lists */}
          {!sidebarCollapsed && customLists.length > 0 && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
              {customLists.map((list) => {
                const isActive = currentView === 'list' && currentListId === list.id;
                const taskCount = getTaskCountForList(list.id);

                return (
                  <button
                    key={list.id}
                    onClick={() => setView('list', list.id)}
                    className={cn(
                      'w-full flex items-center px-3 py-2 rounded-md text-left transition-colors relative overflow-hidden',
                      isActive
                        ? 'bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                    style={list.color ? {
                      borderLeft: isActive ? `4px solid ${list.color}` : `3px solid transparent`,
                      backgroundImage: isActive 
                        ? `linear-gradient(90deg, ${list.color}10 0%, transparent 100%)`
                        : undefined
                    } : undefined}
                  >
                    {list.color && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-200"
                        style={{ 
                          backgroundColor: list.color,
                          opacity: isActive ? 1 : 0.6,
                          width: isActive ? '4px' : '2px'
                        }}
                      />
                    )}
                    <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
                      {list.emoji ? (
                        <span className="text-lg">{list.emoji}</span>
                      ) : (
                        <List size={20} />
                      )}
                      <span className="flex-1 truncate">{list.name}</span>
                    </div>
                    {taskCount > 0 && (
                      <span 
                        className={cn(
                          "text-xs px-2 py-1 rounded-full font-medium relative z-10",
                          isActive && list.color
                            ? "text-white shadow-sm"
                            : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                        )}
                        style={isActive && list.color ? {
                          backgroundColor: list.color,
                          boxShadow: `0 2px 4px ${list.color}40`
                        } : undefined}
                      >
                        {taskCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Add List Button */}
          {!sidebarCollapsed && (
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddList}
                className="w-full justify-start"
              >
                <Plus size={20} className="mr-3" />
                New List
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDarkMode}
            className={cn('w-full', sidebarCollapsed ? 'px-2' : 'justify-start')}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            {!sidebarCollapsed && (
              <span className="ml-3">
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </Button>
        </div>
      </div>
    </aside>
    </>
  );
}
