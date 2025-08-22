import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';

interface QuickAddTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onFullFormRequested?: () => void;
  initialTitle?: string;
}

export function QuickAddTaskForm({ isOpen, onClose, onFullFormRequested, initialTitle = '' }: QuickAddTaskFormProps) {
  const { addTask, currentView, currentListId } = useTaskStore();
  const { showError, showSuccess } = useToastStore();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      // Determine which list to add the task to
      let listId = 'all';
      if (currentView === 'list' && currentListId) {
        listId = currentListId;
      }

      // Create the task with minimal data
      addTask(title.trim(), listId);
      
      showSuccess('Task created', `"${title.trim()}" has been added`);
      setTitle('');
      onClose();
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md mx-auto transform transition-all duration-200 scale-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Add Task
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
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
              className="text-base border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="flex justify-between items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onFullFormRequested}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
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
