import { useState, memo } from 'react';
import { Star, Calendar, Edit3, GripVertical, Repeat, CheckSquare, FileText, Sun, Bell, Pin } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types/index.ts';
import { useTaskStore } from '../stores/taskStore.ts';
import { Button } from './ui/Button.tsx';
import { MarkdownDisplay } from './ui/MarkdownDisplay.tsx';
import { CategoryBadge } from './CategoryBadge.tsx';
import { cn } from '../utils/cn.ts';
import { formatDate } from '../utils/dateUtils.ts';
import { TaskDetailSidebar } from './TaskDetailSidebar.tsx';
import { useContextMenuHandler } from './ui/useContextMenu.ts';
import { createTaskContextMenu } from './ui/contextMenus.tsx';

interface TaskItemProps {
  task: Task;
  isDragEnabled?: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
  activeTaskId?: string | null;
}

function TaskItemComponent({ task, isDragEnabled = false, isDragging: providedIsDragging = false, isOverlay = false, activeTaskId = null }: TaskItemProps) {
  const { toggleTask, toggleImportant, toggleSubTask, lists, deleteTask, addTask, toggleMyDay, togglePin, toggleGlobalPin, getGroupForList, getCategoriesForTask } = useTaskStore();
  
  // Destructure task properties for cleaner code
  const { 
    id: taskId, 
    title, 
    listId, 
    completed, 
    important, 
    myDay, 
    dueDate, 
    reminder, 
    notes, 
    repeat, 
    repeatDays, 
    steps, 
    pinned, 
    pinnedGlobally
  } = task;
  
  // Get task categories
  const taskCategories = getCategoriesForTask(taskId);
  
  // Only use sortable hook if drag is enabled
  const sortable = useSortable({ 
    id: taskId,
    disabled: !isDragEnabled
  });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = sortable;
  
  // Use provided isDragging or sortable.isDragging
  const isDragging = providedIsDragging || sortableIsDragging;
  const [showEditSidebar, setShowEditSidebar] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Get the list this task belongs to
  const taskList = lists.find(list => list.id === listId);
  const listColor = taskList?.color;

  // Check if group has icon override enabled
  const group = taskList ? getGroupForList(taskList.id) : null;
  const displayEmoji = (group?.overrideListIcons && group.emoji) ? group.emoji : taskList?.emoji;

  // Check if task is overdue
  const isOverdue = dueDate && !completed && new Date(dueDate) < new Date();
  const isDueSoon = dueDate && !completed && !isOverdue && new Date(dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const handleToggleComplete = () => {
    toggleTask(taskId);
  };

  const handleToggleImportant = () => {
    toggleImportant(taskId);
  };

  const handleEdit = () => {
    setShowEditSidebar(true);
  };

  const handleDelete = () => {
    deleteTask(taskId);
  };

  const handleDuplicate = () => {
    addTask(title, listId, {
      important,
      dueDate,
      reminder,
      notes,
      myDay,
      repeat,
      repeatDays,
    });
  };

  const handleToggleMyDay = () => {
    toggleMyDay(taskId);
  };

  const handleTogglePin = () => {
    togglePin(taskId);
  };

  const handleToggleGlobalPin = () => {
    toggleGlobalPin(taskId);
  };

  const handleToggleStep = (stepId: string) => {
    toggleSubTask(taskId, stepId);
  };

  const handleTaskClick = () => {
    // Toggle details if the task has additional information
    if (steps.length > 0 || notes || taskCategories.length > 0) {
      setShowDetails(!showDetails);
    }
  };

  // Context menu handler
  const handleContextMenu = useContextMenuHandler(() => {
    return createTaskContextMenu(task, {
      onEdit: handleEdit,
      onDelete: handleDelete,
      onToggleComplete: handleToggleComplete,
      onToggleImportant: handleToggleImportant,
      onToggleMyDay: handleToggleMyDay,
      onTogglePin: handleTogglePin,
      onToggleGlobalPin: handleToggleGlobalPin,
      onDuplicate: handleDuplicate,
      onSetDueDate: handleEdit,
      onManageCategories: handleEdit,
    });
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Determine task item style classes
  const taskItemClasses = cn(
    'task-item group',
    completed && 'task-item-completed',
    important && !completed && 'task-item-important',
    pinnedGlobally && !completed && 'task-item-pinned',
    isOverdue && 'task-item-overdue',
    (steps.length > 0 || notes || taskCategories.length > 0) && 'cursor-pointer',
    isDragging && !isOverlay && 'opacity-50',
    activeTaskId && activeTaskId !== taskId && !isDragging && 'opacity-40'
  );

  return (
    <>
      <div 
        ref={setNodeRef}
        style={style}
        className={taskItemClasses}
        onClick={handleTaskClick}
        onContextMenu={handleContextMenu}
      >
        {/* Left border accent for list color */}
        {listColor && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
            style={{ backgroundColor: listColor }}
          />
        )}
        
        <div className={cn(
          'grid gap-3 items-start',
          isDragEnabled ? "grid-cols-[auto_auto_1fr_auto]" : "grid-cols-[auto_1fr_auto]"
        )}>
          {/* Drag Handle */}
          {isDragEnabled && (
            <div
              {...(isDragging && sortable.active ? {} : { ...attributes, ...listeners })}
              className={cn(
                "mt-0.5 p-1 rounded flex-shrink-0 transition-all duration-200",
                isDragging ? "text-primary-600 dark:text-primary-400 cursor-grabbing" : "text-gray-400 dark:text-gray-500 cursor-grab opacity-0 group-hover:opacity-100 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              <GripVertical size={16} />
            </div>
          )}
          
          {/* Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleComplete();
            }}
            className={cn(
              'mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 focus-visible',
              completed
                ? 'bg-success-600 border-success-600 text-white shadow-sm'
                : important
                ? 'border-warning-400 hover:border-warning-500 hover:bg-warning-50 dark:hover:bg-warning-950'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950'
            )}
          >
            {completed && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          {/* Task Content */}
          <div className="task-content min-w-0 flex-1">
            {/* Title and List Badge Row */}
            <div className="flex items-start gap-2 mb-2">
              <h3 className={cn(
                'text-sm font-medium leading-5 flex-1 min-w-0',
                completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'
              )}>
                {title}
              </h3>
              
              {/* Custom list badge - only for non-system lists */}
              {taskList && !taskList.isSystem && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {displayEmoji && (
                    <span className="text-xs">{displayEmoji}</span>
                  )}
                  <span 
                    className="badge badge-subtle text-2xs px-1.5 py-0.5"
                    style={taskList.color ? {
                      color: taskList.color,
                      backgroundColor: `${taskList.color}15`
                    } : undefined}
                  >
                    {taskList.name}
                  </span>
                </div>
              )}
            </div>

            {/* Primary Metadata - Always visible for important info */}
            <div className="flex items-center gap-2 flex-wrap metadata-row">
              {/* Due Date */}
              {dueDate && (
                <div className={cn(
                  "badge",
                  isOverdue ? "badge-danger" : isDueSoon ? "badge-warning" : "badge-primary"
                )}>
                  <Calendar size={12} />
                  <span>{formatDate(dueDate)}</span>
                </div>
              )}

              {/* Important Star - always visible when set */}
              {important && (
                <div className="badge badge-warning">
                  <Star size={12} className="fill-current" />
                  <span>Important</span>
                </div>
              )}

              {/* My Day */}
              {myDay && (
                <div className="badge badge-warning">
                  <Sun size={12} />
                  <span>My Day</span>
                </div>
              )}

              {/* Reminder - only if today or overdue */}
              {reminder && new Date(reminder) <= new Date(Date.now() + 24 * 60 * 60 * 1000) && (
                <div className="badge badge-warning">
                  <Bell size={12} />
                  <span>Reminder</span>
                </div>
              )}

              {/* Global Pin */}
              {pinnedGlobally && (
                <div className="badge badge-primary">
                  <Pin size={12} className="fill-current" />
                  <span>Pinned</span>
                </div>
              )}

              {/* Repeat indicator - simplified */}
              {repeat && repeat !== 'none' && (
                <div className="badge badge-neutral">
                  <Repeat size={12} />
                  <span className="capitalize">{repeat}</span>
                </div>
              )}
            </div>

            {/* Secondary Metadata - Shown when details are expanded */}
            {showDetails && (
              <div className="mt-3 space-y-3 animate-fade-in">
                {/* Categories */}
                {taskCategories.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {taskCategories.map((category) => (
                      <CategoryBadge
                        key={category.id}
                        category={category}
                        size="sm"
                        variant="subtle"
                      />
                    ))}
                  </div>
                )}

                {/* Notes */}
                {notes && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md border border-gray-200 dark:border-gray-700">
                    <MarkdownDisplay 
                      content={notes} 
                      inline={true}
                      className="text-sm text-gray-700 dark:text-gray-300"
                    />
                  </div>
                )}
                
                {/* Steps */}
                {steps.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <CheckSquare size={12} />
                      <span>{steps.filter(s => s.completed).length} of {steps.length} steps completed</span>
                    </div>
                    <div className="space-y-1.5">
                      {steps.map((step) => (
                        <div 
                          key={step.id} 
                          className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800/30 rounded border border-gray-200 dark:border-gray-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={step.completed}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleStep(step.id);
                            }}
                            className="mt-0.5 w-3 h-3 rounded text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 flex-shrink-0"
                          />
                          <span className={cn(
                            "text-xs leading-relaxed flex-1",
                            step.completed 
                              ? 'line-through text-gray-500 dark:text-gray-400' 
                              : 'text-gray-700 dark:text-gray-300'
                          )}>
                            {step.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional metadata indicators */}
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  {reminder && new Date(reminder) > new Date(Date.now() + 24 * 60 * 60 * 1000) && (
                    <div className="flex items-center gap-1">
                      <Bell size={12} />
                      <span>Reminder set</span>
                    </div>
                  )}
                  {pinned && !pinnedGlobally && (
                    <div className="flex items-center gap-1">
                      <Pin size={12} />
                      <span>Pinned to list</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Info Indicators - shown when not expanded */}
            {!showDetails && (steps.length > 0 || notes || taskCategories.length > 0) && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {steps.length > 0 && (
                  <div className="flex items-center gap-1">
                    <CheckSquare size={12} />
                    <span>{steps.filter(s => s.completed).length}/{steps.length}</span>
                  </div>
                )}
                {notes && (
                  <div className="flex items-center gap-1">
                    <FileText size={12} />
                    <span>Notes</span>
                  </div>
                )}
                {taskCategories.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span>{taskCategories.length} categories</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Important Star - always visible */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleImportant();
              }}
              className={cn(
                'p-1.5 w-7 h-7 rounded-md transition-all duration-200',
                important 
                  ? 'text-warning-600 bg-warning-50 dark:bg-warning-950/30 shadow-sm' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-950/30'
              )}
            >
              <Star size={14} className={important ? 'fill-current' : ''} />
            </Button>

            {/* Edit - visible on hover */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              className="p-1.5 w-7 h-7 text-gray-400 dark:text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 opacity-0 group-hover:opacity-100 transition-all duration-200"
            >
              <Edit3 size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Task Detail Sidebar */}
      <TaskDetailSidebar
        task={task}
        isOpen={showEditSidebar}
        onClose={() => setShowEditSidebar(false)}
        mode="edit"
      />
    </>
  );
}

// Memoized component with optimized comparison
export const TaskItem = memo(TaskItemComponent, (prevProps, nextProps) => {
  // Always re-render if task data changed
  if (prevProps.task !== nextProps.task) return false;
  
  // Always re-render if drag state changed for THIS specific task
  if (prevProps.isDragEnabled !== nextProps.isDragEnabled) return false;
  if (prevProps.isDragging !== nextProps.isDragging) return false;
  if (prevProps.isOverlay !== nextProps.isOverlay) return false;
  
  // Only re-render when activeTaskId changes in meaningful ways
  const prevActive = !!prevProps.activeTaskId;
  const nextActive = !!nextProps.activeTaskId;
  const prevIsThisTask = prevProps.activeTaskId === prevProps.task.id;
  const nextIsThisTask = nextProps.activeTaskId === nextProps.task.id;
  
  // Re-render if drag state or active task state changed
  if (prevActive !== nextActive) return false;
  if (prevIsThisTask !== nextIsThisTask) return false;
  
  // No re-render needed
  return true;
});
