import { useState, useEffect } from 'react';
import { X, Star, Calendar, Clock, Repeat, FileText, Plus, Sun } from 'lucide-react';
import type { Task } from '../types/index.ts';
import { useTaskStore } from '../stores/taskStore.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { DateTimePicker } from './DateTimePicker.tsx';
import { cn } from '../utils/cn.ts';
import { formatDate } from '../utils/dateUtils.ts';

interface TaskDetailSidebarProps {
  task?: Task;
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialListId?: string;
}

export function TaskDetailSidebar({ task, isOpen, onClose, mode, initialListId }: TaskDetailSidebarProps) {
  const { addTask, updateTask, toggleTask, deleteTask, addSubTask, toggleSubTask, deleteSubTask } = useTaskStore();
  
  // Form state
  const [title, setTitle] = useState(task?.title || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [important, setImportant] = useState(task?.important || false);
  const [myDay, setMyDay] = useState(task?.myDay || false);
  const [dueDate, setDueDate] = useState<Date | undefined>(task?.dueDate);
  const [repeat, setRepeat] = useState<string>(task?.repeat || 'none');
  const [repeatDays, setRepeatDays] = useState<number[]>(task?.repeatDays || [1, 2, 3, 4, 5, 6, 0]); // Default to all days
  const [reminder, setReminder] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showRepeatOptions, setShowRepeatOptions] = useState(false);
  
  // Step management state
  const [newStepTitle, setNewStepTitle] = useState('');
  const [showAddStep, setShowAddStep] = useState(false);

  // Reset form when task changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle(task?.title || '');
      setNotes(task?.notes || '');
      setImportant(task?.important || false);
      setMyDay(task?.myDay || false);
      setDueDate(task?.dueDate ? new Date(task.dueDate) : undefined);
      setRepeat(task?.repeat || 'none');
      setRepeatDays(task?.repeatDays || [1, 2, 3, 4, 5, 6, 0]); // Default to all days
      setReminder(task?.reminder ? new Date(task.reminder) : undefined);
      setShowDatePicker(false);
      setShowReminderPicker(false);
      setShowRepeatOptions(false);
      setNewStepTitle('');
      setShowAddStep(false);
    }
  }, [isOpen, task]);

  const handleSave = () => {
    if (!title.trim()) return;

    if (mode === 'create') {
      addTask(title.trim(), initialListId || 'all', {
        important,
        myDay,
        dueDate,
        reminder,
        notes: notes.trim() || undefined,
        repeat,
        repeatDays: repeat === 'daily' ? repeatDays : undefined,
      });
    } else if (task) {
      updateTask(task.id, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        important,
        myDay,
        dueDate,
        reminder,
        repeat: repeat as Task['repeat'],
        repeatDays: repeat === 'daily' ? repeatDays : undefined,
      });
    }

    onClose();
  };

  const handleToggleComplete = () => {
    if (task) {
      toggleTask(task.id);
    }
  };

  const handleDelete = () => {
    if (task && confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
      onClose();
    }
  };

  const handleDateSelect = (date: Date | null) => {
    setDueDate(date || undefined);
    setShowDatePicker(false);
  };

  const handleReminderSelect = (date: Date | null) => {
    setReminder(date || undefined);
    setShowReminderPicker(false);
  };

  const removeDueDate = () => {
    setDueDate(undefined);
  };

  const removeReminder = () => {
    setReminder(undefined);
  };

  // Step management functions
  const handleAddStep = () => {
    if (!newStepTitle.trim() || !task) return;
    addSubTask(task.id, newStepTitle.trim());
    setNewStepTitle('');
    setShowAddStep(false);
  };

  const handleToggleStep = (stepId: string) => {
    if (!task) return;
    toggleSubTask(task.id, stepId);
  };

  const handleDeleteStep = (stepId: string) => {
    if (!task) return;
    deleteSubTask(task.id, stepId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddStep();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="flex-1 bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="w-[400px] bg-white dark:bg-gray-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
            {mode === 'create' ? 'New Task' : 'Task Details'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Task Title Section */}
          <div className="mb-8">
            <div className="flex items-start gap-4">
              {task && (
                <button
                  onClick={handleToggleComplete}
                  className={cn(
                    'mt-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0',
                    'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    task.completed
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md hover:bg-blue-700'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  )}
                >
                  {task.completed && (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              )}
              
              <div className="flex-1 min-w-0">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="text-xl font-medium border-none shadow-none p-0 focus-visible:ring-0 bg-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  autoFocus={mode === 'create'}
                />
                {mode === 'edit' && task && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Created {new Date(task.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImportant(!important)}
                className={cn(
                  'p-2.5 rounded-full transition-all duration-200 flex-shrink-0',
                  'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2',
                  important 
                    ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                )}
              >
                <Star size={20} className={important ? 'fill-current' : ''} />
              </Button>
            </div>
          </div>

          {/* Add Step Section - Prominent at top */}
          {mode === 'edit' && task && (
            <div className="mb-8">
              <div className="rounded-xl border bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 hover:shadow-sm">
                {!showAddStep ? (
                  <Button
                    variant="ghost"
                    onClick={() => setShowAddStep(true)}
                    className="w-full justify-start gap-4 h-16 text-left px-5 py-4 rounded-xl hover:bg-transparent"
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-800">
                      <Plus size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-base text-gray-900 dark:text-white">Add step</span>
                  </Button>
                ) : (
                  <div className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-800">
                        <Plus size={20} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium text-base text-gray-900 dark:text-white">Add step</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newStepTitle}
                        onChange={(e) => setNewStepTitle(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter step description..."
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        onClick={handleAddStep}
                        size="sm"
                        disabled={!newStepTitle.trim()}
                        className="px-4"
                      >
                        Add
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAddStep(false);
                          setNewStepTitle('');
                        }}
                        className="px-3"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Steps List - Always visible when steps exist */}
          {mode === 'edit' && task && task.steps.length > 0 && (
            <div className="mb-8">
              <div className="rounded-xl border bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 transition-all duration-200">
                <div className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {task.steps.filter(step => step.completed).length}/{task.steps.length}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-base text-gray-900 dark:text-white">Steps</span>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {task.steps.filter(step => step.completed).length} of {task.steps.length} completed
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {task.steps.map((step) => (
                      <div key={step.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600 group min-h-fit">
                        <input
                          type="checkbox"
                          checked={step.completed}
                          onChange={() => handleToggleStep(step.id)}
                          className="rounded text-blue-600 focus:ring-blue-500 mt-1 flex-shrink-0"
                        />
                        <div className={cn(
                          "text-sm flex-1 leading-relaxed",
                          step.completed 
                            ? 'line-through text-gray-500 dark:text-gray-400' 
                            : 'text-gray-900 dark:text-gray-100'
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
                          {step.title}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStep(step.id)}
                          className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-full"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2 mb-8">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 tracking-wide uppercase">Quick Actions</h3>
            
            {/* Add to My Day */}
            <div className={cn(
              "rounded-xl border transition-all duration-200 hover:shadow-sm",
              myDay 
                ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800" 
                : "bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            )}>
              <Button
                variant="ghost"
                onClick={() => setMyDay(!myDay)}
                className="w-full justify-start gap-4 h-16 text-left px-5 py-4 rounded-xl hover:bg-transparent"
              >
                <div className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-lg transition-colors",
                  myDay ? "bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}>
                  <Sun size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-medium text-base",
                    myDay ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"
                  )}>
                    {myDay ? 'Added to My Day' : 'Add to My Day'}
                  </div>
                  {myDay && (
                    <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      This task will appear in My Day
                    </div>
                  )}
                </div>
              </Button>
            </div>

            {/* Reminder */}
            <div className="rounded-xl border bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 hover:shadow-sm">
              <div className="flex items-center">
                <button
                  onClick={() => setShowReminderPicker(!showReminderPicker)}
                  className="flex-1 flex items-center gap-4 h-16 text-left px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <Clock size={20} className="text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base text-gray-900 dark:text-white">Remind me</div>
                    {reminder && (
                      <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                        {formatDate(reminder)}
                      </div>
                    )}
                  </div>
                </button>
                {reminder && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeReminder}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 mr-3"
                  >
                    <X size={16} className="text-gray-500" />
                  </Button>
                )}
              </div>
            </div>

            {/* Due Date */}
            <div className="rounded-xl border bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 hover:shadow-sm">
              <div className="flex items-center">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex-1 flex items-center gap-4 h-16 text-left px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <Calendar size={20} className="text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base text-gray-900 dark:text-white">Add due date</div>
                    {dueDate && (
                      <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                        {formatDate(dueDate)}
                      </div>
                    )}
                  </div>
                </button>
                {dueDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeDueDate}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 mr-3"
                  >
                    <X size={16} className="text-gray-500" />
                  </Button>
                )}
              </div>
            </div>

            {/* Repeat */}
            <div className="rounded-xl border bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 hover:shadow-sm">
              <div className="flex items-center">
                <button
                  onClick={() => setShowRepeatOptions(!showRepeatOptions)}
                  className="flex-1 flex items-center gap-4 h-16 text-left px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <Repeat size={20} className="text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base text-gray-900 dark:text-white">Repeat</div>
                    {repeat !== 'none' && (
                      <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                        <span className="capitalize">{repeat}</span>
                        {repeat === 'daily' && repeatDays.length > 0 && repeatDays.length < 7 && (
                          <span className="ml-1">
                            ({repeatDays.length === 5 && repeatDays.includes(1) && repeatDays.includes(2) && repeatDays.includes(3) && repeatDays.includes(4) && repeatDays.includes(5) ? 'weekdays' : 
                              repeatDays.length === 2 && repeatDays.includes(0) && repeatDays.includes(6) ? 'weekends' :
                              `${repeatDays.length} day${repeatDays.length > 1 ? 's' : ''}`})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
                {repeat !== 'none' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRepeat('none')}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 mr-3"
                  >
                    <X size={16} className="text-gray-500" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Repeat Options */}
          {showRepeatOptions && (
            <div className="mb-6 p-5 border rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Repeat frequency</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRepeatOptions(false)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                >
                  <X size={16} className="text-gray-500" />
                </Button>
              </div>
              <div className="space-y-2">
                {[
                  { value: 'none', label: 'Never' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRepeat(option.value);
                      setShowRepeatOptions(false);
                    }}
                    className={cn(
                      "w-full justify-start h-10 rounded-lg transition-colors",
                      repeat === option.value 
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium" 
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Day Selector for Daily Repeat */}
          {repeat === 'daily' && (
            <div className="mb-6 p-5 border rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 shadow-sm">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Repeat on days</h4>
              <div className="grid grid-cols-7 gap-2">
                {[
                  { day: 0, label: 'S', fullLabel: 'Sunday' },
                  { day: 1, label: 'M', fullLabel: 'Monday' },
                  { day: 2, label: 'T', fullLabel: 'Tuesday' },
                  { day: 3, label: 'W', fullLabel: 'Wednesday' },
                  { day: 4, label: 'T', fullLabel: 'Thursday' },
                  { day: 5, label: 'F', fullLabel: 'Friday' },
                  { day: 6, label: 'S', fullLabel: 'Saturday' },
                ].map((item) => (
                  <button
                    key={item.day}
                    onClick={() => {
                      if (repeatDays.includes(item.day)) {
                        setRepeatDays(repeatDays.filter(d => d !== item.day));
                      } else {
                        setRepeatDays([...repeatDays, item.day]);
                      }
                    }}
                    className={cn(
                      "h-10 w-10 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center",
                      repeatDays.includes(item.day)
                        ? "bg-blue-600 text-white shadow-sm transform scale-105"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    )}
                    title={item.fullLabel}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRepeatDays([1, 2, 3, 4, 5])}
                  className="text-xs px-3 py-1 h-7 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Weekdays
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRepeatDays([0, 6])}
                  className="text-xs px-3 py-1 h-7 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Weekends
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRepeatDays([0, 1, 2, 3, 4, 5, 6])}
                  className="text-xs px-3 py-1 h-7 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  All days
                </Button>
              </div>
            </div>
          )}

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 tracking-wide uppercase">Notes</h3>
            
            {/* Notes */}
            <div className="rounded-xl border bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 hover:shadow-sm">
              <div className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <FileText size={20} className="text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="font-medium text-base text-gray-900 dark:text-white">Add note</span>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a detailed description or note about this task..."
                  className="w-full p-4 border rounded-xl dark:bg-gray-900/50 dark:border-gray-600 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  rows={4}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              {mode === 'edit' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
                >
                  Delete task
                </Button>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                disabled={!title.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {mode === 'create' ? 'Add task' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={dueDate}
          onChange={handleDateSelect}
          onClose={() => setShowDatePicker(false)}
          mode="date"
          title="Set Due Date"
        />
      )}

      {/* Reminder Picker Modal */}
      {showReminderPicker && (
        <DateTimePicker
          value={reminder}
          onChange={handleReminderSelect}
          onClose={() => setShowReminderPicker(false)}
          mode="datetime"
          title="Set Reminder"
        />
      )}
    </div>
  );
}
