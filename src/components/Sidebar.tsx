import { Sun, Star, Calendar, CheckSquare, List, Plus, Search, Menu } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { cn } from '../utils/cn.ts';
import { getListDisplayInfo } from '../utils/emojiUtils.ts';
import { GroupedListSection } from './GroupedListSection.tsx';
import { ListEditSidebar } from './ListEditSidebar.tsx';
import { Z_INDEX_CLASSES } from '../utils/zIndex.ts';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useState } from 'react';

interface SidebarProps {
  setShowAddGroupModal: (show: boolean) => void;
  showAddListModal: boolean;
  setShowAddListModal: (show: boolean) => void;
}

export function Sidebar({ setShowAddGroupModal, showAddListModal, setShowAddListModal }: SidebarProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const {
    lists,
    currentView,
    currentListId,
    searchQuery,
    sidebarCollapsed,
    setView,
    setSearchQuery,
    toggleSidebar,
    getTaskCountForList,
    getGroupedLists,
    moveListToGroup,
    reorderLists,
  } = useTaskStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduced from 8 for more responsive dragging
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Reduced from 250 for better responsiveness
        tolerance: 8, // Increased for better touch handling
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      // Check if dropping on a group header to move list to group
      if (typeof over.id === 'string' && over.id.startsWith('group-')) {
        const groupId = over.id.replace('group-', '');
        moveListToGroup(active.id as string, groupId === 'null' ? null : groupId);
        return;
      }

      // Handle reordering within the same group/section
      const activeList = lists.find(list => list.id === active.id);
      const overList = lists.find(list => list.id === over.id);
      
      if (activeList && overList && activeList.groupId === overList.groupId) {
        // Get all lists in this group/section
        const sectionLists = lists
          .filter(list => !list.isSystem && list.groupId === activeList.groupId)
          .sort((a, b) => a.order - b.order);
        
        const oldIndex = sectionLists.findIndex(list => list.id === active.id);
        const newIndex = sectionLists.findIndex(list => list.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          // Reorder the lists
          const reorderedLists = [...sectionLists];
          const [movedList] = reorderedLists.splice(oldIndex, 1);
          reorderedLists.splice(newIndex, 0, movedList);
          
          // Update the order in store
          const listIds = reorderedLists.map(list => list.id);
          reorderLists(activeList.groupId || null, listIds);
        }
      }
    }
  };

  const handleAddList = () => {
    setShowAddListModal(true);
  };

  const handleAddGroup = () => {
    setShowAddGroupModal(true);
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
  ];

  const customLists = lists.filter(list => !list.isSystem);
  const groupedLists = getGroupedLists();

  return (
    <>
      <aside className={cn(
      `fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${Z_INDEX_CLASSES.SIDEBAR}`,
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
                onDragStart={handleDragStart}
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
                    activeId={activeId}
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {!sidebarCollapsed ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAddList}
                className="flex flex-col items-center justify-center p-3 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 group"
              >
                <Plus size={20} className="mb-1 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200" />
                <span>Neue Liste</span>
              </button>
              <button
                onClick={handleAddGroup}
                className="flex flex-col items-center justify-center p-3 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200 group"
              >
                <Plus size={20} className="mb-1 text-green-500 dark:text-green-400 group-hover:scale-110 transition-transform duration-200" />
                <span>New Group</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                onClick={handleAddList}
                className="flex items-center justify-center p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 group"
                title="Neue Liste"
              >
                <Plus size={20} className="text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200" />
              </button>
              <button
                onClick={handleAddGroup}
                className="flex items-center justify-center p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200 group"
                title="New Group"
              >
                <Plus size={20} className="text-green-500 dark:text-green-400 group-hover:scale-110 transition-transform duration-200" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Add List Modal */}
      <ListEditSidebar
        isOpen={showAddListModal}
        onClose={() => setShowAddListModal(false)}
        mode="create"
      />
    </aside>
    </>
  );
}
