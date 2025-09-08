import { Plus, Edit2, Sun, Star, Calendar, CheckSquare, Tag } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { TaskList } from './TaskList.tsx';
import { TaskDetailSidebar } from './TaskDetailSidebar.tsx';
import { ListEditSidebar } from './ListEditSidebar.tsx';
import { Button } from './ui/Button.tsx';
import { HamburgerMenu } from './ui/HamburgerMenu.tsx';
import { useState, useEffect } from 'react';
import type { TaskList as TaskListType } from '../types/index.ts';

import { useContextMenuHandler } from './ui/useContextMenu.ts';
import { createEmptyAreaContextMenu } from './ui/contextMenus.tsx';
import { FloatingActionButton } from './FloatingActionButton.tsx';
import { QuickAddTaskForm } from './QuickAddTaskForm.tsx';
import { GroupEditSidebar } from './GroupEditSidebar.tsx';

export function TaskView() {
  const { currentView, currentListId, currentCategoryId, lists, categories } = useTaskStore();
  const [showAddSidebar, setShowAddSidebar] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [showListEditSidebar, setShowListEditSidebar] = useState(false);
  const [showGroupEditSidebar, setShowGroupEditSidebar] = useState(false);
  const [editingList, setEditingList] = useState<TaskListType | null>(null);

  // Track if any sidebar is opening for immediate FAB response
  const isAnySidebarOpen = showAddSidebar || showListEditSidebar || showGroupEditSidebar || !!editingList;

  // Add keyboard shortcuts for task creation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N to create new task
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowQuickAdd(true);
      }
      // Escape to close sidebar
      if (e.key === 'Escape' && showAddSidebar) {
        setShowAddSidebar(false);
      }
      if (e.key === 'Escape' && showQuickAdd) {
        setShowQuickAdd(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddSidebar, showQuickAdd]);

  // Context menu for empty areas
  const handleEmptyAreaContextMenu = useContextMenuHandler(() => {
    return createEmptyAreaContextMenu({
      onCreateTask: () => setShowQuickAdd(true),
      onCreateList: () => setShowListEditSidebar(true),
    });
  });

  const getViewTitle = () => {
    switch (currentView) {
      case 'my-day':
        return 'My Day';
      case 'important':
        return 'Important';
      case 'planned':
        return 'Planned';
      case 'all':
        return 'Tasks';
      case 'list': {
        const list = lists.find(l => l.id === currentListId);
        return list?.name || 'List';
      }
      case 'category': {
        const category = categories.find(c => c.id === currentCategoryId);
        return category?.name || 'Category';
      }
      default:
        return 'Tasks';
    }
  };

  const getViewIcon = () => {
    switch (currentView) {
      case 'my-day':
        return Sun;
      case 'important':
        return Star;
      case 'planned':
        return Calendar;
      case 'all':
        return CheckSquare;
      case 'category':
        return Tag;
      default:
        return null;
    }
  };

  const getCurrentList = (): TaskListType | null => {
    if (currentView === 'list' && currentListId) {
      return lists.find(l => l.id === currentListId) || null;
    }
    return null;
  };

  const currentList = getCurrentList();
  const isCustomList = currentList && !currentList.isSystem;

  // Debug: Log sidebar states in TaskView
  console.log('TaskView Sidebar States:', { 
    showAddSidebar, 
    showListEditSidebar, 
    showGroupEditSidebar, 
    editingList: !!editingList,
    isAnySidebarOpen
  });

  const handleQuickAddToFullForm = () => {
    setShowQuickAdd(false);
    setShowAddSidebar(true);
  };

  const handleQuickAdd = (title?: string) => {
    if (title) {
      setQuickAddTitle(title);
    }
    setShowQuickAdd(true);
  };

  const handleInlineTaskCreate = (title: string) => {
    const { addTask } = useTaskStore.getState();
    const { showError } = useToastStore.getState();
    
    try {
      // Determine which list to add the task to
      let listId = 'all';
      if (currentView === 'list' && currentListId) {
        listId = currentListId;
      }

      // Create the task directly
      addTask(title, listId);
      
    } catch {
      // Show error feedback
      showError('Error', 'Failed to create task. Please try again.');
    }
  };

  return (
    <>
      <div className="flex flex-col h-full relative">
        {/* Header */}
        <header className="p-6 border-b border-gray-200 dark:border-gray-700 relative overflow-visible">
          {isCustomList && currentList?.color && (
            <>
              {/* Color accent line */}
              <div 
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: currentList.color }}
              />
              {/* Subtle background gradient */}
              <div 
                className="absolute inset-0 opacity-5"
                style={{ 
                  background: `linear-gradient(135deg, ${currentList.color} 0%, transparent 50%)`
                }}
              />
            </>
          )}
          <div className={`flex items-center justify-between relative z-10`}>
            <div className="flex items-center gap-3">
              {isCustomList && currentList?.color && (
                <div 
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ 
                    backgroundColor: currentList.color,
                    boxShadow: `0 2px 8px ${currentList.color}40`
                  }}
                />
              )}
              {(() => {
                if (isCustomList && currentList?.emoji) {
                  return <span className="text-2xl">{currentList.emoji}</span>;
                } else if (currentView === 'category') {
                  const currentCategory = categories.find(c => c.id === currentCategoryId);
                  if (currentCategory) {
                    return (
                      <div className="flex items-center gap-2">
                        {currentCategory.emoji && (
                          <span className="text-2xl">{currentCategory.emoji}</span>
                        )}
                        <div 
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: currentCategory.color }}
                        />
                      </div>
                    );
                  }
                  return <Tag size={24} className="text-gray-600 dark:text-gray-400" />;
                } else if (!isCustomList) {
                  const Icon = getViewIcon();
                  return Icon ? <Icon size={24} className="text-gray-600 dark:text-gray-400" /> : null;
                }
                return null;
              })()}
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {getViewTitle()}
              </h2>
              {isCustomList && currentList && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingList(currentList)}
                  className="p-2 h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <Edit2 size={16} className="text-gray-500 dark:text-gray-400" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Minimized header add button */}
              <Button
                onClick={() => setShowQuickAdd(true)}
                variant="ghost"
                size="sm"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                title="Quick Add Task (Ctrl+N)"
              >
                <Plus size={20} />
              </Button>
              <HamburgerMenu />
            </div>
          </div>
        </header>

        {/* Task List */}
        <div 
          className="flex-1 overflow-y-auto w-full"
          onContextMenu={handleEmptyAreaContextMenu}
        >
          <TaskList />
        </div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        onQuickAdd={() => handleQuickAdd()}
        onInlineTaskCreate={handleInlineTaskCreate}
        currentListColor={currentList?.color}
        isAnySidebarOpening={isAnySidebarOpen}
      />

      {/* Quick Add Task Modal */}
      <QuickAddTaskForm
        isOpen={showQuickAdd}
        onClose={() => {
          setShowQuickAdd(false);
          setQuickAddTitle('');
        }}
        initialTitle={quickAddTitle}
        onFullFormRequested={handleQuickAddToFullForm}
      />

      {/* Full Task Form Sidebar */}
      <TaskDetailSidebar
        isOpen={showAddSidebar}
        onClose={() => setShowAddSidebar(false)}
        mode="create"
        initialListId={currentView === 'list' ? currentListId : 'all'}
      />

      {/* List Edit Sidebar */}
      {editingList && (
        <ListEditSidebar
          list={editingList}
          isOpen={!!editingList}
          mode="edit"
          onClose={() => setEditingList(null)}
        />
      )}

      {/* Create List Sidebar */}
      <ListEditSidebar
        isOpen={showListEditSidebar}
        mode="create"
        onClose={() => setShowListEditSidebar(false)}
      />

      {/* Group Edit Sidebar */}
      <GroupEditSidebar
        isOpen={showGroupEditSidebar}
        onClose={() => setShowGroupEditSidebar(false)}
        mode="create"
      />
    </>
  );
}
