import { Sun, Moon, Star, Calendar, CheckSquare, CheckCircle, List, Plus, Search, Menu } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { cn } from '../utils/cn.ts';
import { getListDisplayInfo, extractFirstEmoji, removeFirstEmoji } from '../utils/emojiUtils.ts';
import { GroupedListSection } from './GroupedListSection.tsx';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';

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
    addGroup,
    getTaskCountForList,
    getGroupedLists,
    moveListToGroup,
  } = useTaskStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Check if dropping on a group header
      if (typeof over.id === 'string' && over.id.startsWith('group-')) {
        const groupId = over.id.replace('group-', '');
        moveListToGroup(active.id as string, groupId === 'null' ? null : groupId);
        return;
      }
    }
  };

  const handleAddList = () => {
    const name = prompt('Enter list name:');
    if (name?.trim()) {
      addList(name.trim());
    }
  };

  const handleAddGroup = () => {
    const name = prompt('Enter group name:');
    if (name?.trim()) {
      const emoji = extractFirstEmoji(name.trim());
      const cleanName = removeFirstEmoji(name.trim());
      addGroup(cleanName || name.trim(), undefined, emoji || undefined);
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
  const groupedLists = getGroupedLists();

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
          {!sidebarCollapsed && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                {groupedLists.map((section) => (
                  <GroupedListSection
                    key={section.group?.id || 'ungrouped'}
                    group={section.group}
                    lists={section.lists}
                    currentView={currentView}
                    currentListId={currentListId}
                    onSetView={setView}
                    sidebarCollapsed={sidebarCollapsed}
                  />
                ))}
              </DndContext>
            </div>
          )}

          {/* Collapsed Custom Lists */}
          {sidebarCollapsed && customLists.length > 0 && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
              {customLists.map((list) => {
                const isActive = currentView === 'list' && currentListId === list.id;
                const { icon } = getListDisplayInfo(list);

                return (
                  <button
                    key={list.id}
                    onClick={() => setView('list', list.id)}
                    className={cn(
                      'w-full flex items-center justify-center p-3 rounded-md transition-colors',
                      isActive
                        ? 'bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    {icon ? (
                      <span className="text-lg">{icon}</span>
                    ) : (
                      <List size={20} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Add List/Group Buttons */}
          {!sidebarCollapsed && (
            <div className="p-2 space-y-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddList}
                className="w-full justify-start"
              >
                <Plus size={16} className="mr-3" />
                New List
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddGroup}
                className="w-full justify-start text-gray-600 dark:text-gray-400"
              >
                <Plus size={16} className="mr-3" />
                New Group
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
