import { useState, useRef, useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap.ts';
import { Plus, X } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { useShallow } from 'zustand/react/shallow';
import { useToastStore } from '../stores/toastStore.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { addTaskFromText } from '../utils/addTaskFromText.ts';
import { planQuickAdd } from '../utils/quickAdd.ts';
import { dueWords } from '../utils/addedTask.ts';

interface QuickAddTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onFullFormRequested?: () => void;
  initialTitle?: string;
}

export function QuickAddTaskForm({ isOpen, onClose, onFullFormRequested, initialTitle = '' }: QuickAddTaskFormProps) {
  const { currentView, currentListId, currentCategoryId, categories, lists } = useTaskStore(useShallow((state) => ({ currentView: state.currentView, currentListId: state.currentListId, currentCategoryId: state.currentCategoryId, categories: state.categories, lists: state.lists })));
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

    setIsSubmitting(true);

    try {
      // "Ship invoice #work ! friday @Clients" becomes a task with a tag, importance, a date and a list; the current
      // view's own needs (list, tag, My Day, ...) still apply. The store checks the title and shows what is wrong.
      // Only clear and close when the task was actually created, so typed text isn't lost on failure
      if (addTaskFromText(title)) {
        setTitle('');
        onClose();
      }
    } catch {
      showError('Error', 'Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // What the typed symbols will do, shown under the field, so #tag, @list, ! and dates can be checked before adding
  const preview = (() => {
    if (!title.trim()) return '';
    const plan = planQuickAdd(title, { view: currentView, currentListId, currentCategoryId, categories, lists });
    const { parsed } = plan;
    const parts: string[] = [];
    if (parsed.listName) parts.push(`List ${parsed.listName}`);
    if (parsed.tagNames.length > 0) parts.push(`Tagged ${parsed.tagNames.map((name) => `#${name}`).join(' ')}`);
    if (parsed.important) parts.push('Important');
    if (parsed.dueDate) parts.push(`Due ${dueWords(parsed.dueDate)}`);
    if (parsed.unmatched.length > 0) parts.push(`${parsed.unmatched.join(' ')} not found, so it stays in the title`);
    if (parts.length === 0) return '';
    return `${plan.title}: ${parts.join(' · ')}`;
  })();

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
              aria-describedby="quick-add-hint"
            />
            {/* The hint is always there for screen readers; sighted users see what was recognised, or the tip while empty */}
            <p id="quick-add-hint" role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-muted">
              {preview || 'Tip: add #tag, @list, ! for important, or a day such as "friday".'}
            </p>
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
