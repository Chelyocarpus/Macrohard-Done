import { Plus, Edit2, Sun, Star, Calendar, CheckSquare, CheckCircle } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { TaskList } from './TaskList.tsx';
import { TaskDetailSidebar } from './TaskDetailSidebar.tsx';
import { ListEditSidebar } from './ListEditSidebar.tsx';
import { Button } from './ui/Button.tsx';
import { useState, useEffect } from 'react';
import type { TaskList as TaskListType } from '../types/index.ts';
import { cn } from '../utils/cn.ts';

export function TaskView() {
  const { currentView, currentListId, lists } = useTaskStore();
  const [showAddSidebar, setShowAddSidebar] = useState(false);
  const [editingList, setEditingList] = useState<TaskListType | null>(null);

  // Add keyboard shortcuts for task creation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N to create new task
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowAddSidebar(true);
      }
      // Escape to close sidebar
      if (e.key === 'Escape' && showAddSidebar) {
        setShowAddSidebar(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddSidebar]);

  const getViewTitle = () => {
    switch (currentView) {
      case 'my-day':
        return 'My Day';
      case 'important':
        return 'Important';
      case 'planned':
        return 'Planned';
      case 'completed':
        return 'Completed';
      case 'all':
        return 'Tasks';
      case 'list': {
        const list = lists.find(l => l.id === currentListId);
        return list?.name || 'List';
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
      case 'completed':
        return CheckCircle;
      case 'all':
        return CheckSquare;
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

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="p-6 border-b border-gray-200 dark:border-gray-700 relative overflow-hidden">
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
          <div className="flex items-center justify-between relative z-10">
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
              {isCustomList && currentList?.emoji ? (
                <span className="text-2xl">{currentList.emoji}</span>
              ) : !isCustomList && (() => {
                const Icon = getViewIcon();
                return Icon ? <Icon size={24} className="text-gray-600 dark:text-gray-400" /> : null;
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
            <Button
              onClick={() => setShowAddSidebar(true)}
              size="sm"
              className={cn(
                "flex items-center gap-2 transition-all duration-200 font-semibold px-4 py-2 h-10",
                "shadow-lg hover:shadow-xl transform hover:scale-105",
                "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
                "border-0 text-white relative overflow-hidden",
                isCustomList && currentList?.color ? "shadow-md" : ""
              )}
              style={isCustomList && currentList?.color ? {
                background: `linear-gradient(135deg, ${currentList.color}, ${currentList.color}dd)`,
                color: 'white'
              } : undefined}
              title="Add Task (Ctrl+N)"
            >
              <Plus size={18} />
              <span>Add Task</span>
              {/* Subtle shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
            </Button>
          </div>
        </header>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto w-full">
          <TaskList />
        </div>
      </div>

      {/* Add Task Sidebar */}
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
    </>
  );
}
