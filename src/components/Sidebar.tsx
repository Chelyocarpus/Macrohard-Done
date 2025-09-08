import { Sun, Star, Calendar, CheckSquare, List, Plus, Search, Menu, Tag, Settings } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { cn } from '../utils/cn.ts';
import { getListDisplayInfo } from '../utils/emojiUtils.ts';
import { GroupedListSection } from './GroupedListSection.tsx';
import { ListEditSidebar } from './ListEditSidebar.tsx';
import { CategoryManager } from './CategoryManager.tsx';
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
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  
  const {
    lists,
    currentView,
    currentListId,
    currentCategoryId,
    searchQuery,
    sidebarCollapsed,
    categories,
    setView,
    setSearchQuery,
    toggleSidebar,
    getTaskCountForList,
    getTaskCountForCategory,
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
      `fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-20`,
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
          <div className="py-1">
            {systemLists.map((listItem) => {
              const Icon = listItem.icon;
              const isActive = currentView === listItem.view;
              const taskCount = getTaskCountForList(listItem.id);

              return (
                <button
                  key={listItem.id}
                  onClick={() => setView(listItem.view)}
                  className={cn(
                    'w-full flex items-center px-3 py-1.5 text-left transition-colors text-sm',
                    isActive
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                    sidebarCollapsed && 'justify-center'
                  )}
                >
                  <Icon size={16} className={cn(!sidebarCollapsed && 'mr-2')} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1">{listItem.name}</span>
                      {taskCount > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                          {taskCount}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Categories Section */}
          {!sidebarCollapsed && (
            <div className="py-2 border-t border-gray-200 dark:border-gray-700">
              <div className="px-3 py-1">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Categories
                </h3>
              </div>
              
              {/* Categories List */}
              <div className="">
                {categories.slice(0, 5).map((category) => {
                  const taskCount = getTaskCountForCategory(category.id);
                  const isActive = currentView === 'category' && currentCategoryId === category.id;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setView('category', undefined, category.id)}
                      className={cn(
                        'w-full flex items-center px-3 py-1.5 text-left transition-colors text-sm',
                        isActive
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      )}
                    >
                      <div className="flex items-center mr-2">
                        {category.emoji && (
                          <span className="mr-1.5 text-sm">{category.emoji}</span>
                        )}
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                      </div>
                      <span className="flex-1 truncate">{category.name}</span>
                      {taskCount > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                          {taskCount}
                        </span>
                      )}
                    </button>
                  );
                })}
                
                {categories.length === 0 && (
                  <div className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400">
                    No categories yet
                  </div>
                )}
              </div>
              
              {/* Manage Categories Button */}
              <button
                onClick={() => setShowCategoryManager(true)}
                className="w-full flex items-center px-3 py-1.5 text-left transition-colors text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Settings size={14} className="mr-2" />
                <span>Manage Categories</span>
              </button>
            </div>
          )}

          {/* Collapsed Categories */}
          {sidebarCollapsed && categories.length > 0 && (
            <div className="py-1 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowCategoryManager(true)}
                className="w-full flex items-center justify-center py-1.5 transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                title="Categories"
              >
                <Tag size={16} />
              </button>
            </div>
          )}

          {/* Custom Lists */}
          {!sidebarCollapsed && (
            <div className="py-2 border-t border-gray-200 dark:border-gray-700">
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
            <div className="py-1 border-t border-gray-200 dark:border-gray-700">
              {customLists.map((list) => {
                const isActive = currentView === 'list' && currentListId === list.id;
                const { icon } = getListDisplayInfo(list);

                return (
                  <button
                    key={list.id}
                    onClick={() => setView('list', list.id)}
                    className={cn(
                      'w-full flex items-center justify-center py-1.5 transition-colors',
                      isActive
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                  >
                    {icon ? (
                      <span className="text-base">{icon}</span>
                    ) : (
                      <List size={16} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          {!sidebarCollapsed ? (
            <div className="space-y-1">
              <button
                onClick={handleAddList}
                className="w-full flex items-center px-3 py-1.5 text-left transition-colors text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Plus size={14} className="mr-2" />
                <span>New List</span>
              </button>
              <button
                onClick={handleAddGroup}
                className="w-full flex items-center px-3 py-1.5 text-left transition-colors text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Plus size={14} className="mr-2" />
                <span>New Group</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                onClick={handleAddList}
                className="w-full flex items-center justify-center py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="New List"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={handleAddGroup}
                className="w-full flex items-center justify-center py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="New Group"
              >
                <Plus size={14} />
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
      
      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <CategoryManager
              onClose={() => setShowCategoryManager(false)}
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
