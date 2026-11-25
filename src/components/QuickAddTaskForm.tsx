import { useState, useRef, useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap.ts';
import { Plus, X } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { useShallow } from 'zustand/react/shallow';
import { useToastStore } from '../stores/toastStore.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { getNewTaskDefaults } from '../utils/newTaskDefaults.ts';

interface QuickAddTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onFullFormRequested?: () => void;
  initialTitle?: string;
}

export function QuickAddTaskForm({ isOpen, onClose, onFullFormRequested, initialTitle = '' }: QuickAddTaskFormProps) {
  const { addTask, currentView, currentListId, currentCategoryId } = useTaskStore(useShallow((state) => ({ addTask: state.addTask, currentView: state.currentView, currentListId: state.currentListId, currentCategoryId: state.currentCategoryId })));
  const { showError } = useToastStore();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      // Small delay to ensure modal is rendered before focusing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      showError('Invalid input', 'Task title cannot be empty');
      return;
    }

    if (title.trim().length > 200) {
      showError('Title too long', 'Task title must be 200 characters or less');
      return;
    }

    setIsSubmitting(true);

    try {
      // The task starts with whatever the current view needs (list, category, My Day, ...) so it shows up there
      const { listId, ...options } = getNewTaskDefaults(currentView, currentListId, currentCategoryId);

      // Create the task with minimal data
      // Only clear and close when the task was actually created, so typed text isn't lost on failure
      if (addTask(title.trim(), listId, options)) {
        setTitle('');
        onClose();
      }
    } catch {
      showError('Error', 'Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Quick add task"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      {/* Modal */}
      {/* Phones: fills the whole screen (content at the top, clear of the keyboard); larger screens: centred card */}
      <div className="relative bg-canvas sm:rounded-2xl shadow-2xl sm:border border-line p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-6 w-full h-full sm:h-auto sm:max-w-md mx-auto transform transition-all duration-200 scale-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink">
            Quick Add Task
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 h-8 w-8 rounded-full hover:bg-hover"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              ref={inputRef}
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-base border-line focus:border-accent"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="flex justify-between items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onFullFormRequested}
              className="text-accent hover:text-accent"
            >
              Need more options?
            </Button>
            
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="secondary" 
                size="sm" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                size="sm" 
                disabled={!title.trim() || isSubmitting}
                className="min-w-[80px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Adding...</span>
                  </div>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Task
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
