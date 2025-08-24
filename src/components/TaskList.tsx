import { useState } from 'react';
import { useTaskStore } from '../stores/taskStore.ts';
import { TaskItem } from './TaskItem.tsx';

import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

export function TaskList() {
  const { getTasksForCurrentView, reorderTasks, currentView, currentListId } = useTaskStore();
  const allTasks = getTasksForCurrentView();
  const [activeId, setActiveId] = useState<string | null>(null);

  const [showCompleted, setShowCompleted] = useState(true);
  
  // Only enable drag and drop for single list view
  const isDragEnabled = currentView === 'list' && !!currentListId;
  
  // Split tasks into active and completed
  const activeTasks = allTasks.filter(task => !task.completed);
  const completedTasks = allTasks.filter(task => task.completed);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };



  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);


    if (!over || active.id === over.id || !isDragEnabled) {
      return;
    }

    // For list view, only allow reordering within active tasks section
    const oldIndex = activeTasks.findIndex(task => task.id === active.id);
    const newIndex = activeTasks.findIndex(task => task.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    // Create reordered array using the current tasks order
    const reorderedTasks = [...activeTasks];
    const [movedTask] = reorderedTasks.splice(oldIndex, 1);
    reorderedTasks.splice(newIndex, 0, movedTask);
    
    // Get the IDs in the new order
    const taskIds = reorderedTasks.map(task => task.id);
    
    // For completed tasks, maintain their original order after the active tasks
    completedTasks.forEach(task => {
      taskIds.push(task.id);
    });
    
    reorderTasks(taskIds, currentListId!);
  };



  const renderTaskItems = (tasks: typeof activeTasks, isDraggable: boolean) => {
    if (tasks.length === 0) return null;

    if (isDragEnabled && isDraggable) {
      return (
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskItem 
                key={task.id}
                task={task} 
                isDragEnabled={isDragEnabled}
                isDragging={activeId === task.id}
                activeTaskId={activeId}
              />
            ))}
          </div>
        </SortableContext>
      );
    }
    
    return (
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} isDragEnabled={false} activeTaskId={activeId} />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 w-full">
      {/* No Tasks Message */}
      {allTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
            <p className="text-sm">Use the blue button in the corner or press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Ctrl+N</kbd> to create your first task</p>
          </div>
        </div>
      ) : isDragEnabled ? (

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div>
              {/* Active Tasks */}
              {renderTaskItems(activeTasks, true)}
          
              {/* Completed Tasks Section (if any exist) */}
              {completedTasks.length > 0 && (
                <div className="mt-8">
                  <button 
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm font-medium mb-4 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    onClick={() => setShowCompleted(!showCompleted)}
                  >
                    {showCompleted ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                    <span>Completed ({completedTasks.length})</span>
                  </button>
                  
                  {/* Conditionally render completed tasks */}
                  {showCompleted && (
                    <div className="space-y-2 opacity-80">
                      {renderTaskItems(completedTasks, false)}
                    </div>
                  )}
                </div>
              )}
            </div>
          
            <DragOverlay>
              {activeId ? (
                <div className="transform scale-[1.02] transition-transform">
                  <TaskItem 
                    task={activeTasks.find(task => task.id === activeId)!} 
                    isDragEnabled={true}
                    isDragging={true}
                    isOverlay={true}
                    activeTaskId={activeId}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

      ) : (
        <>
          {/* Active Tasks */}
          {renderTaskItems(activeTasks, false)}
          
          {/* Completed Tasks Section (if any exist) */}
          {completedTasks.length > 0 && (
            <div className="mt-8">
              <button 
                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm font-medium mb-4 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={() => setShowCompleted(!showCompleted)}
              >
                {showCompleted ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
                <span>Completed ({completedTasks.length})</span>
              </button>
              
              {/* Conditionally render completed tasks */}
              {showCompleted && (
                <div className="space-y-2 opacity-80">
                  {renderTaskItems(completedTasks, false)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
