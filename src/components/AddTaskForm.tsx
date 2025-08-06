import { useState, useRef, useEffect } from 'react';
import { Calendar, Star, X } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { cn } from '../utils/cn.ts';
import { formatDate } from '../utils/dateUtils.ts';

interface AddTaskFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

export function AddTaskForm({ onSubmit, onCancel }: AddTaskFormProps) {
  const { addTask, currentView, currentListId } = useTaskStore();
  const [title, setTitle] = useState('');
  const [important, setImportant] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    // Determine which list to add the task to
    let listId = 'all';
    if (currentView === 'list' && currentListId) {
      listId = currentListId;
    }

    addTask(title.trim(), listId, {
      important,
      dueDate,
    });
    
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleDateSelect = (date: Date) => {
    setDueDate(date);
    setShowDatePicker(false);
  };

  const handleRemoveDate = () => {
    setDueDate(undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 mt-1 rounded-full border-2 border-gray-300 dark:border-gray-600" />
        
        <div className="flex-1 space-y-3">
          <Input
            ref={inputRef}
            placeholder="Add a task"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-none shadow-none p-0 text-base placeholder:text-gray-400 focus-visible:ring-0"
          />
          
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setImportant(!important)}
              className={cn(
                'flex items-center gap-2',
                important && 'text-yellow-500'
              )}
            >
              <Star size={16} className={important ? 'fill-current' : ''} />
              {important ? 'Important' : 'Mark important'}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={cn(
                'flex items-center gap-2',
                dueDate && 'text-blue-600'
              )}
            >
              <Calendar size={16} />
              {dueDate ? formatDate(dueDate) : 'Add due date'}
            </Button>
            
            {dueDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveDate}
                className="text-red-500 hover:text-red-700"
              >
                <X size={16} />
              </Button>
            )}
          </div>
          
          {/* Simple Date Picker */}
          {showDatePicker && (
            <div className="mt-2 p-3 border rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateSelect(new Date())}
                  className="text-left justify-start"
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    handleDateSelect(tomorrow);
                  }}
                  className="text-left justify-start"
                >
                  Tomorrow
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    handleDateSelect(nextWeek);
                  }}
                  className="text-left justify-start"
                >
                  Next Week
                </Button>
              </div>
              <div className="mt-2">
                <input
                  type="date"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleDateSelect(new Date(e.target.value + 'T12:00:00'));
                    }
                  }}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          )}
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="p-1"
        >
          <X size={16} />
        </Button>
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!title.trim()}>
          Add Task
        </Button>
      </div>
    </form>
  );
}
