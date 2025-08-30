import { useState } from 'react';
import type { Category } from '../types/index.ts';
import { useTaskStore } from '../stores/taskStore.ts';
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
  const { categories, addCategory, updateCategory, deleteCategory, getTaskCountForCategory } = useTaskStore();
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className={cn('bg-white dark:bg-gray-900 rounded-lg shadow-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Manage Categories
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModal({ type: 'create' })}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Category
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {modal.type === 'create' && (
          <div className="mb-6 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Create New Category
            </h3>
            <CategoryForm
              onSave={handleCreateCategory}
              onCancel={() => setModal({ type: null })}
              isSubmitting={isSubmitting}
            />
          </div>
        )}

        {modal.type === 'edit' && modal.category && (
          <div className="mb-6 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Edit Category
            </h3>
            <CategoryForm
              category={modal.category}
              onSave={handleUpdateCategory}
              onCancel={() => setModal({ type: null })}
              isSubmitting={isSubmitting}
            />
          </div>
        )}

        {modal.type === 'delete' && modal.category && (
          <div className="mb-6 p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Delete Category
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete "{modal.category.name}"? This action will remove the category from all tasks and cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteCategory}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete Category'}
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

        {/* Categories List */}
        <div className="space-y-3">
          {sortedCategories.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 dark:text-gray-600 text-lg mb-2">
                📂
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No categories yet
              </p>
              <Button
                variant="secondary"
                onClick={() => setModal({ type: 'create' })}
              >
                Create your first category
              </Button>
            </div>
          ) : (
            sortedCategories.map((category) => {
              const taskCount = getTaskCountForCategory(category.id);
              
              return (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <CategoryBadge category={category} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {category.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {taskCount} task{taskCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {category.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
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
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDelete(category)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
