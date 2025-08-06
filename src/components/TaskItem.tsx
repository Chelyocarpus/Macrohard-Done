import { useState } from 'react';
import { Star, Calendar, Edit3 } from 'lucide-react';
import type { Task } from '../types/index.ts';
import { useTaskStore } from '../stores/taskStore.ts';
import { Button } from './ui/Button.tsx';
import { cn } from '../utils/cn.ts';
import { formatDate } from '../utils/dateUtils.ts';
import { TaskDetailSidebar } from './TaskDetailSidebar.tsx';

interface TaskItemProps {
  task: Task;
}

export function TaskItem({ task }: TaskItemProps) {
  const { toggleTask, toggleImportant, toggleSubTask, lists } = useTaskStore();
  const [showEditSidebar, setShowEditSidebar] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // Get the list this task belongs to
  const taskList = lists.find(list => list.id === task.listId);
  const listColor = taskList?.color;

  const handleToggleComplete = () => {
    toggleTask(task.id);
  };

  const handleToggleImportant = () => {
    toggleImportant(task.id);
  };

  const handleEdit = () => {
    setShowEditSidebar(true);
  };

  const handleToggleStep = (stepId: string) => {
    toggleSubTask(task.id, stepId);
  };  return (
    <>
      <div 
        className={cn(
          'task-item group p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors relative overflow-hidden',
          task.completed && 'opacity-75'
        )}
        style={listColor ? {
          borderLeft: `3px solid ${listColor}`,
          backgroundColor: `${listColor}05`
        } : undefined}
      >
        {listColor && (
          <div 
            className="absolute top-0 left-0 bottom-0 w-1 opacity-60"
            style={{ backgroundColor: listColor }}
          />
        )}
        <div className="grid grid-cols-[auto_1fr_80px] gap-3 items-start relative z-10">
          {/* Checkbox */}
          <button
            onClick={handleToggleComplete}
            className={cn(
              'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0',
              task.completed
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
            )}
          >
            {task.completed && (
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
            <div className={cn(
              'text-gray-900 dark:text-white font-medium leading-normal',
              task.completed && 'line-through'
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
              {task.title}
            </div>

            {/* Task metadata - Always visible */}
            <div className="mt-2 space-y-2 min-w-0 overflow-hidden">
              {/* Basic metadata row */}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap min-w-0 overflow-hidden">
                {task.dueDate && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Calendar size={12} />
                    <span className="whitespace-nowrap">{formatDate(task.dueDate)}</span>
                  </div>
                )}
                {task.steps.length > 0 && (
                  <button
                    onClick={() => setShowSteps(!showSteps)}
                    className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                  >
                    <span className="whitespace-nowrap">
                      {task.steps.filter(step => step.completed).length} of {task.steps.length} steps
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
                {task.repeat && task.repeat !== 'none' && (
                  <span className="capitalize whitespace-nowrap">Repeats {task.repeat}</span>
                )}
                {task.myDay && (
                  <span className="text-blue-600 dark:text-blue-400 whitespace-nowrap">☀️ My Day</span>
                )}
              </div>

              {/* Notes - Always visible if they exist */}
              {task.notes && (
                <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/30 p-3 rounded border border-gray-100 dark:border-gray-700 leading-relaxed"
                style={{
                  wordWrap: 'break-word',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  width: '100%',
                  minHeight: 'auto'
                }}
                >
                  {task.notes}
                </div>
              )}
              
              {/* Steps - Expandable if they exist */}
              {task.steps.length > 0 && showSteps && (
                <div className="w-full min-w-0 overflow-hidden">
                  <div className="space-y-2">
                    {task.steps.map((step) => (
                      <div key={step.id} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800/30 rounded border border-gray-100 dark:border-gray-700 w-full min-h-fit" style={{ maxWidth: '100%' }}>
                        <input
                          type="checkbox"
                          checked={step.completed}
                          onChange={() => handleToggleStep(step.id)}
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
          <div className="flex items-center gap-1">
            {/* Star - always visible and more prominent */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleImportant}
              className={cn(
                'p-2 h-8 w-8 rounded-full transition-all duration-200 flex-shrink-0',
                task.important 
                  ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 shadow-sm' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
              )}
            >
              <Star size={16} className={task.important ? 'fill-current' : ''} />
            </Button>

            {/* Edit - only visible on hover */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="p-2 h-8 w-8 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <Edit3 size={16} />
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
