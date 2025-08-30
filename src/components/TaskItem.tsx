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
  const [showSteps, setShowSteps] = useState(false);

  // Get the list this task belongs to
  const taskList = lists.find(list => list.id === listId);
  const listColor = taskList?.color;

  // Check if group has icon override enabled
  const group = taskList ? getGroupForList(taskList.id) : null;
  const displayEmoji = (group?.overrideListIcons && group.emoji) ? group.emoji : taskList?.emoji;

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
    // Only toggle steps if the task has steps
    if (steps.length > 0) {
      setShowSteps(!showSteps);
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
      onSetDueDate: handleEdit, // Opens edit sidebar for now
      onManageCategories: handleEdit, // Opens edit sidebar where categories can be managed
    });
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(listColor ? {
      borderLeft: `3px solid ${listColor}`,
      backgroundColor: `${listColor}05`
    } : {})
  };

  return (
    <>
      <div 
        ref={setNodeRef}
        style={style}
        className={cn(
          'task-item group p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors relative overflow-hidden',
          completed && 'opacity-75',
          steps.length > 0 && 'cursor-pointer',
          isDragging && !isOverlay && 'opacity-0',
          activeTaskId && activeTaskId !== taskId && !isDragging && 'opacity-40',
          pinnedGlobally && 'bg-blue-25 dark:bg-blue-950/20 border-l-2 border-blue-400',
          pinned && !pinnedGlobally && 'bg-gray-25 dark:bg-gray-800/30 border-l-2 border-gray-400'
        )}
        onClick={handleTaskClick}
        onContextMenu={handleContextMenu}
      >
        {listColor && (
          <div 
            className="absolute top-0 left-0 bottom-0 w-1 opacity-60"
            style={{ backgroundColor: listColor }}
          />
        )}
        <div className={cn(
          `grid gap-3 items-start relative z-10`,
          isDragEnabled ? "grid-cols-[auto_auto_1fr_120px]" : "grid-cols-[auto_1fr_120px]"
        )}>
          {/* Drag Handle - always show if drag is enabled or the item is being dragged */}
          {isDragEnabled && (
            <div
              {...(isDragging && sortable.active ? {} : { ...attributes, ...listeners })}
              className={cn(
                "mt-0.5 p-1 rounded flex-shrink-0 text-gray-400",
                isDragging ? "opacity-100 cursor-grabbing text-blue-600 dark:text-blue-400" : "cursor-grab opacity-60 group-hover:opacity-100 hover:text-gray-600 dark:hover:text-gray-300",
                "transition-opacity"
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
              'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0',
              completed
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
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

          {/* Task Content - grid column */}
          <div className="task-content min-w-0">
            <div className="flex items-start gap-2">
              <div className={cn(
                'text-gray-900 dark:text-white font-medium leading-normal flex-1',
                completed && 'line-through'
              )}
              style={{ 
                wordWrap: 'break-word',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                width: '100%',
                minHeight: 'auto'
              }}
              >
                {title}
              </div>
              
              {/* Custom list name tag - positioned close to the color border */}
              {taskList && !taskList.isSystem && (
                <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                  {displayEmoji && (
                    <span className="text-xs">{displayEmoji}</span>
                  )}
                  <span 
                    className="text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap"
                    style={taskList.color ? {
                      borderColor: taskList.color,
                      color: taskList.color,
                      backgroundColor: `${taskList.color}10`
                    } : {
                      borderColor: '#d1d5db',
                      color: '#6b7280',
                      backgroundColor: '#f9fafb'
                    }}
                  >
                    {taskList.name}
                  </span>
                </div>
              )}
            </div>

            {/* Task metadata - Always visible */}
            <div className="mt-2 space-y-2 min-w-0 overflow-hidden">
              {/* Primary metadata row - High priority items */}
              <div className="flex items-center gap-3 text-sm flex-wrap min-w-0 overflow-hidden">
                {/* Due Date with enhanced visual hierarchy */}
                {dueDate && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border flex-shrink-0",
                    "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                  )}>
                    <Calendar size={14} className="flex-shrink-0" />
                    <span className="whitespace-nowrap text-xs font-medium">{formatDate(dueDate)}</span>
                  </div>
                )}

                {/* Reminder indicator */}
                {reminder && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border flex-shrink-0",
                    "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                  )}>
                    <Bell size={14} className="flex-shrink-0" />
                    <span className="whitespace-nowrap text-xs font-medium">Reminder</span>
                  </div>
                )}

                {/* My Day indicator with enhanced styling */}
                {myDay && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border flex-shrink-0",
                    "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300"
                  )}>
                    <Sun size={14} className="flex-shrink-0" />
                    <span className="whitespace-nowrap text-xs font-medium">My Day</span>
                  </div>
                )}

                {/* Global Pin indicator */}
                {pinnedGlobally && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border flex-shrink-0",
                    "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                  )}>
                    <Pin size={14} className="flex-shrink-0 fill-current" />
                    <span className="whitespace-nowrap text-xs font-medium">Pinned Globally</span>
                  </div>
                )}

                {/* List Pin indicator (only show if not globally pinned) */}
                {pinned && !pinnedGlobally && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border flex-shrink-0",
                    "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                  )}>
                    <Pin size={14} className="flex-shrink-0 fill-current" />
                    <span className="whitespace-nowrap text-xs font-medium">Pinned</span>
                  </div>
                )}

                {/* Repeat indicator with icon */}
                {repeat && repeat !== 'none' && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border flex-shrink-0",
                    "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
                  )}>
                    <Repeat size={14} className="flex-shrink-0" />
                    <span className="whitespace-nowrap text-xs font-medium capitalize">{repeat}</span>
                  </div>
                )}

                {/* Category badges */}
                {taskCategories.map((category) => (
                  <CategoryBadge
                    key={category.id}
                    category={category}
                    size="sm"
                    variant="subtle"
                  />
                ))}
              </div>

              {/* Secondary metadata row - Additional info */}
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap min-w-0 overflow-hidden">
                {/* Steps indicator with enhanced styling */}
                {steps.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSteps(!showSteps);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all duration-200 flex-shrink-0",
                      "hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600",
                      "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                    )}
                  >
                    <CheckSquare size={14} className="flex-shrink-0" />
                    <span className="whitespace-nowrap text-xs font-medium">
                      {steps.filter((step) => step.completed).length} of {steps.length} steps
                    </span>
                    <svg 
                      className={cn("w-3 h-3 transition-transform", showSteps && "rotate-180")} 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}

                {/* Notes indicator */}
                {notes && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border flex-shrink-0",
                    "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                  )}>
                    <FileText size={14} className="flex-shrink-0" />
                    <span className="whitespace-nowrap text-xs font-medium">Notes</span>
                  </div>
                )}
              </div>

              {/* Notes - Always visible if they exist */}
              {notes && (
                <div className="bg-gray-50 dark:bg-gray-800/30 p-3 rounded border border-gray-100 dark:border-gray-700">
                  <MarkdownDisplay 
                    content={notes} 
                    inline={true}
                    className="text-sm"
                  />
                </div>
              )}
              
              {/* Steps - Expandable if they exist */}
              {steps.length > 0 && showSteps && (
                <div className="w-full min-w-0 overflow-hidden">
                  <div className="space-y-2">
                    {steps.map((step) => (
                      <div 
                        key={step.id} 
                        className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800/30 rounded border border-gray-100 dark:border-gray-700 w-full min-h-fit" 
                        style={{ maxWidth: '100%' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={step.completed}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleStep(step.id);
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3 flex-shrink-0 mt-1"
                        />
                        <div className={cn(
                          "text-xs flex-1 leading-relaxed",
                          step.completed 
                            ? 'line-through text-gray-500 dark:text-gray-400' 
                            : 'text-gray-700 dark:text-gray-300'
                        )}
                        style={{ 
                          wordWrap: 'break-word',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          minHeight: 'auto',
                          width: '100%'
                        }}
                        >
                          {step.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions - grid column, never overlaps */}
          <div className="flex items-center gap-0.5">
            {/* Star - always visible and more prominent */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleImportant();
              }}
              className={cn(
                'p-1.5 h-7 w-7 rounded-full transition-all duration-200 flex-shrink-0',
                important 
                  ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 shadow-sm' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
              )}
            >
              <Star size={14} className={important ? 'fill-current' : ''} />
            </Button>

            {/* Pin - always visible when pinned, hover visible when not */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePin();
              }}
              className={cn(
                'p-1.5 h-7 w-7 rounded-full transition-all duration-200 flex-shrink-0',
                pinned || pinnedGlobally
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 shadow-sm' 
                  : 'text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              )}
            >
              <Pin size={14} className={(pinned || pinnedGlobally) ? 'fill-current' : ''} />
            </Button>

            {/* Edit - only visible on hover */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              className="p-1.5 h-7 w-7 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
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
  
  // Re-render if:
  // 1. Drag state started/stopped (null to non-null or vice versa)
  // 2. This task became the dragged task or stopped being the dragged task
  if (prevActive !== nextActive) return false;
  if (prevIsThisTask !== nextIsThisTask) return false;
  
  // No re-render needed - the visual state is the same
  return true;
});
