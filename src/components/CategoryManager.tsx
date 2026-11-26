import { useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey.ts';
import type { Category } from '../types/index.ts';
import { useTaskStore } from '../stores/taskStore.ts';
import { useShallow } from 'zustand/react/shallow';
import { CategoryForm } from './CategoryForm.tsx';
import { CategoryBadge } from './CategoryBadge.tsx';
import { Button } from './ui/Button.tsx';
import { cn } from '../utils/cn.ts';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

interface CategoryManagerProps {
  onClose?: () => void;
  className?: string;
}

type ModalState = {
  type: 'create' | 'edit' | 'delete' | null;
  category?: Category;
};

export function CategoryManager({ onClose, className }: CategoryManagerProps) {
  // Selected: only what is used here. `tasks` is listed too because the getters below read it; without it a change would not re-render.
  const { categories, addCategory, updateCategory, deleteCategory, getTaskCountForCategory } = useTaskStore(useShallow((state) => ({ categories: state.categories, addCategory: state.addCategory, updateCategory: state.updateCategory, deleteCategory: state.deleteCategory, getTaskCountForCategory: state.getTaskCountForCategory, tasks: state.tasks })));
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Escape closes the open form or confirmation first, then the whole manager
  useEscapeKey(Boolean(onClose), () => {
    if (modal.type !== null) setModal({ type: null });
    else onClose?.();
  }, { back: true });

  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  const handleCreateCategory = async (data: { name: string; color?: string; emoji?: string; description?: string }) => {
    setIsSubmitting(true);
    try {
      addCategory(data.name, data.color, data.emoji, data.description);
      setModal({ type: null });
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategory = async (data: { name: string; color?: string; emoji?: string; description?: string }) => {
    if (!modal.category) return;
    
    setIsSubmitting(true);
    try {
      updateCategory(modal.category.id, {
        ...data,
        updatedAt: new Date(),
      });
      setModal({ type: null });
    } catch (error) {
      console.error('Failed to update category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!modal.category) return;
    
    setIsSubmitting(true);
    try {
      deleteCategory(modal.category.id);
      setModal({ type: null });
    } catch (error) {
      console.error('Failed to delete category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (category: Category) => {
    setModal({ type: 'delete', category });
  };

  return (
    <div className={cn('bg-canvas sm:rounded-lg sm:shadow-lg flex flex-col max-h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-line flex-shrink-0">
        <h2 className="text-xl font-semibold text-ink">
          Manage tags
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModal({ type: 'create' })}
          >
            <Plus className="h-4 w-4 mr-2" />
            New tag
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="p-6 overflow-y-auto flex-1 min-h-0">
        {modal.type === 'create' && (
          <div className="mb-6 p-4 border border-accent/30 rounded-lg bg-accent/10">
            <h3 className="text-lg font-medium text-ink mb-4">
              Create new tag
            </h3>
            <CategoryForm
              onSave={handleCreateCategory}
              onCancel={() => setModal({ type: null })}
              isSubmitting={isSubmitting}
            />
          </div>
        )}

        {modal.type === 'edit' && modal.category && (
          <div className="mb-6 p-4 border border-accent/30 rounded-lg bg-accent/10">
            <h3 className="text-lg font-medium text-ink mb-4">
              Edit tag
            </h3>
            <CategoryForm
              key={modal.category.id}
              category={modal.category}
              onSave={handleUpdateCategory}
              onCancel={() => setModal({ type: null })}
              isSubmitting={isSubmitting}
            />
          </div>
        )}

        {modal.type === 'delete' && modal.category && (
          <div className="mb-6 p-4 border border-overdue/30 rounded-lg bg-overdue/10">
            <h3 className="text-lg font-medium text-ink mb-2">
              Remove tag
            </h3>
            <p className="text-sm text-muted mb-4">
              Are you sure you want to remove "{modal.category.name}"? This will remove the tag from all tasks and cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteCategory}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Removing...' : 'Remove tag'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setModal({ type: null })}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Tags list */}
        <div>
          {sortedCategories.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted text-lg mb-2">
                📂
              </div>
              <p className="text-muted mb-4">
                No tags yet
              </p>
              <Button
                variant="secondary"
                onClick={() => setModal({ type: 'create' })}
              >
                Create your first tag
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map((category) => {
                const taskCount = getTaskCountForCategory(category.id);
              
                return (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 border border-line rounded-lg hover:bg-hover transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CategoryBadge category={category} size="md" showEmoji />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ink truncate">
                            {category.name}
                          </span>
                          <span className="text-xs text-muted flex-shrink-0">
                            {taskCount} task{taskCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {category.description && (
                          <p className="text-xs text-muted truncate">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setModal({ type: 'edit', category })}
                        className="h-8 w-8 p-0"
                        aria-label={`Edit tag ${category.name}`}
                      >
                        <Edit2 className="h-3 w-3" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDelete(category)}
                        className="h-8 w-8 p-0 text-overdue hover:text-overdue/80 hover:bg-overdue/10"
                        aria-label={`Delete tag ${category.name}`}
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
