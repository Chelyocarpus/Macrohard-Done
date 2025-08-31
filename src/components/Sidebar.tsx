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
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
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
        'sidebar',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="sidebar-header">
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
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible"
              >
                <Menu size={20} />
              </Button>
            </div>
            
            {!sidebarCollapsed && (
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* System Lists */}
          <div className="sidebar-content">
            <div className="sidebar-section">
              <div className="space-y-1">
                {systemLists.map((listItem) => {
                  const Icon = listItem.icon;
                  const isActive = currentView === listItem.view;
                  const taskCount = getTaskCountForList(listItem.id);

                  return (
                    <button
                      key={listItem.id}
                      onClick={() => setView(listItem.view)}
                      className={cn(
                        'nav-item w-full group',
                        isActive ? 'nav-item-active' : 'nav-item-inactive',
                        sidebarCollapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon size={20} className={cn(!sidebarCollapsed && 'mr-3')} />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 text-left font-medium">{listItem.name}</span>
                          {taskCount > 0 && (
                            <span className="badge badge-neutral text-2xs px-2 py-0.5 ml-2">
                              {taskCount}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categories Section */}
            {!sidebarCollapsed && categories.length > 0 && (
              <div className="sidebar-section">
                <h3 className="sidebar-section-title">Categories</h3>
                
                <div className="space-y-1 mb-3">
                  {categories.slice(0, 5).map((category) => {
                    const taskCount = getTaskCountForCategory(category.id);
                    const isActive = currentView === 'category' && currentCategoryId === category.id;
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => setView('category', undefined, category.id)}
                        className={cn(
                          'nav-item w-full group',
                          isActive ? 'nav-item-active' : 'nav-item-inactive'
                        )}
                      >
                        <div className="flex items-center mr-3">
                          {category.emoji && (
                            <span className="mr-2 text-sm">{category.emoji}</span>
                          )}
                          <div 
                            className="w-3 h-3 rounded-full border border-gray-200 dark:border-gray-600"
                            style={{ backgroundColor: category.color }}
                          />
                        </div>
                        <span className="flex-1 text-left font-medium truncate">{category.name}</span>
                        {taskCount > 0 && (
                          <span className="badge badge-neutral text-2xs px-2 py-0.5 ml-2">
                            {taskCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCategoryManager(true)}
                  className="w-full justify-start px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
                >
                  <Settings size={16} className="mr-3" />
                  <span>Manage Categories</span>
                </Button>
              </div>
            )}

            {/* Collapsed Categories */}
            {sidebarCollapsed && categories.length > 0 && (
              <div className="sidebar-section">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCategoryManager(true)}
                  className="w-full justify-center p-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Categories"
                >
                  <Tag size={20} />
                </Button>
              </div>
            )}

            {/* Custom Lists */}
            {!sidebarCollapsed && customLists.length > 0 && (
              <div className="sidebar-section">
                <h3 className="sidebar-section-title">My Lists</h3>
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
              <div className="sidebar-section">
                {customLists.slice(0, 6).map((list) => {
                  const isActive = currentView === 'list' && currentListId === list.id;
                  const { icon } = getListDisplayInfo(list);

                  return (
                    <Button
                      key={list.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => setView('list', list.id)}
                      className={cn(
                        'w-full justify-center p-3 mb-1',
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                      title={list.name}
                    >
                      {icon ? (
                        <span className="text-lg">{icon}</span>
                      ) : (
                        <List size={20} />
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sidebar-footer">
            {!sidebarCollapsed ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleAddList}
                  className="btn-ghost flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 group hover:bg-primary-50 dark:hover:bg-primary-950/30"
                >
                  <Plus size={18} className="mb-1.5 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary-700 dark:group-hover:text-primary-300">New List</span>
                </button>
                <button
                  onClick={handleAddGroup}
                  className="btn-ghost flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 group hover:bg-success-50 dark:hover:bg-success-950/30"
                >
                  <Plus size={18} className="mb-1.5 text-success-600 dark:text-success-400 group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-success-700 dark:group-hover:text-success-300">New Group</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddList}
                  className="p-3 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 group"
                  title="New List"
                >
                  <Plus size={20} className="group-hover:scale-110 transition-transform duration-200" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddGroup}
                  className="p-3 text-success-600 dark:text-success-400 hover:bg-success-50 dark:hover:bg-success-950/30 group"
                  title="New Group"
                >
                  <Plus size={20} className="group-hover:scale-110 transition-transform duration-200" />
                </Button>
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="card max-w-2xl w-full max-h-[80vh] overflow-hidden animate-scale-in">
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
