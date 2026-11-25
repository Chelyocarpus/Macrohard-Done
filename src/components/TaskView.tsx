import { Sun, Star, Calendar, CheckSquare, Tag, Search, Settings, List, Pencil } from 'lucide-react';
import { Tooltip } from './ui/Tooltip.tsx';
import { ViewHeader } from './ViewHeader.tsx';
import { headerSubtitle } from '../utils/headerSubtitle.ts';
import { getListDisplayInfo, groupIconOverride } from '../utils/emojiUtils.ts';
import { FOCUS_SEARCH_EVENT } from '../hooks/useKeyboardShortcuts.ts';
import { accentVars } from '../utils/accentTheme.ts';
import { getNewTaskDefaults } from '../utils/newTaskDefaults.ts';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../stores/taskStore.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { CategoryBadge } from './CategoryBadge.tsx';
import { TaskList } from './TaskList.tsx';
import { SearchView } from './SearchView.tsx';
import { SettingsView } from './SettingsView.tsx';
import { TaskDetailSidebar } from './TaskDetailSidebar.tsx';
import { ListEditSidebar } from './ListEditSidebar.tsx';
import { Button } from './ui/Button.tsx';
import { ListOptionsMenu } from './ListOptionsMenu.tsx';
import { useState, useEffect, type ReactNode } from 'react';
import type { TaskList as TaskListType } from '../types/index.ts';

import { useContextMenuHandler } from './ui/useContextMenu.ts';
import { createEmptyAreaContextMenu } from './ui/contextMenus.tsx';
import { FloatingActionButton } from './FloatingActionButton.tsx';
import { QuickAddTaskForm } from './QuickAddTaskForm.tsx';
import { useEscapeKey } from '../hooks/useEscapeKey.ts';

interface TaskViewProps {
  /** Phone layout only: go back to the Lists screen (the button is hidden on larger screens) */
  onBack?: () => void;
}

export function TaskView({ onBack }: TaskViewProps) {
  const { currentView, currentListId, currentCategoryId, lists, categories, listGroups } = useTaskStore(useShallow((state) => ({
    currentView: state.currentView,
    currentListId: state.currentListId,
    currentCategoryId: state.currentCategoryId,
    lists: state.lists,
    categories: state.categories,
    listGroups: state.listGroups,
  })));
  const darkMode = useTaskStore((state) => state.darkMode);
  const [showAddSidebar, setShowAddSidebar] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [showListEditSidebar, setShowListEditSidebar] = useState(false);
  const [editingList, setEditingList] = useState<TaskListType | null>(null);

  // The tag filter belongs to the view it was set in: it ends when you go elsewhere, or when the tag is deleted
  const tagFilter = useUiStore((state) => state.tagFilter);
  const filterTag = tagFilter ? categories.find((category) => category.id === tagFilter) : undefined;
  useEffect(() => {
    useUiStore.getState().setTagFilter(null);
  }, [currentView, currentListId, currentCategoryId]);
  useEffect(() => {
    if (tagFilter && !filterTag) useUiStore.getState().setTagFilter(null);
  }, [tagFilter, filterTag]);

  // Track if any sidebar is opening for immediate FAB response
  const isAnySidebarOpen = showAddSidebar || showListEditSidebar || !!editingList;

  // Add keyboard shortcuts for task creation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N to create new task
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowQuickAdd(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Escape closes the quick add form, or the new-task panel, as one layer (the panel registers its own layer, so a
  // date picker open over it is closed first)
  useEscapeKey(showQuickAdd, () => setShowQuickAdd(false), { back: true });

  // Context menu for empty areas
  const handleEmptyAreaContextMenu = useContextMenuHandler(() => {
    return createEmptyAreaContextMenu({
      onCreateTask: () => setShowQuickAdd(true),
      onCreateList: () => setShowListEditSidebar(true),
    });
  });

  const getViewTitle = () => {
    switch (currentView) {
      case 'my-day':
        return 'My Day';
      case 'important':
        return 'Important';
      case 'planned':
        return 'Planned';
      case 'all':
        return 'Tasks';
      case 'search':
        return 'Search';
      case 'settings':
        return 'Settings';
      case 'list': {
        const list = lists.find(l => l.id === currentListId);
        return list?.name || 'List';
      }
      case 'category': {
        const category = categories.find(c => c.id === currentCategoryId);
        return category ? `#${category.name}` : 'Tag';
      }
      default:
        return 'Tasks';
    }
  };

  const getViewIcon = () => {
    switch (currentView) {
      case 'my-day':
        return Sun;
      case 'important':
        return Star;
      case 'planned':
        return Calendar;
      case 'all':
        return CheckSquare;
      case 'category':
        return Tag;
      case 'search':
        return Search;
      case 'settings':
        return Settings;
      default:
        return null;
    }
  };

  const getCurrentList = (): TaskListType | null => {
    if (currentView === 'list' && currentListId) {
      return lists.find(l => l.id === currentListId) || null;
    }
    return null;
  };

  const newTaskDefaults = getNewTaskDefaults(currentView, currentListId, currentCategoryId);
  const currentList = getCurrentList();
  const isCustomList = currentList && !currentList.isSystem;

  const handleQuickAddToFullForm = () => {
    setShowQuickAdd(false);
    setShowAddSidebar(true);
  };

  const handleQuickAdd = (title?: string) => {
    if (title) {
      setQuickAddTitle(title);
    }
    setShowQuickAdd(true);
  };

  const handleInlineTaskCreate = (title: string): boolean => {
    const { addTask } = useTaskStore.getState();
    const { showError } = useToastStore.getState();

    try {
      // The task starts with whatever the current view needs (list, category, My Day, ...) so it shows up there
      const { listId, ...options } = getNewTaskDefaults(currentView, currentListId, currentCategoryId);

      // Create the task directly
      return addTask(title, listId, options);
    } catch {
      // Show error feedback
      showError('Error', 'Failed to create task. Please try again.');
      return false;
    }
  };

  // The colour of the list or tag on show. It tints the header and page and colours the add button and bars; with
  // none, those stay the normal blue. (See utils/accentTheme.ts.)
  const shownTag = currentView === 'category' ? categories.find((c) => c.id === currentCategoryId) : undefined;
  const themeColor = (isCustomList ? currentList?.color : undefined) ?? shownTag?.color;
  const themeVars = accentVars(themeColor, darkMode);

  // Header: an emoji written in a list's name moves into the tile (as in the sidebar); a page without one gets its icon
  const listInfo = isCustomList && currentList ? getListDisplayInfo(currentList) : undefined;
  // A group can set one icon for all its lists
  const groupIcon = currentList?.groupId ? groupIconOverride(listGroups.find((group) => group.id === currentList.groupId)) : undefined;
  const headerTitle = listInfo ? listInfo.displayName || currentList!.name : getViewTitle();
  const ViewIcon = getViewIcon();
  const headerGlyph: ReactNode = listInfo
    ? (groupIcon ?? listInfo.icon ?? <List size={22} />)
    : currentView === 'category'
      ? (shownTag?.emoji || <span className="text-xl font-semibold">#</span>)
      : ViewIcon
        ? <ViewIcon size={22} />
        : <List size={22} />;
  // Open tasks in what is shown: the same numbers as the sidebar's counters
  const openCount = useTaskStore((state) => {
    if (currentView === 'category') return currentCategoryId ? state.getTaskCountForCategory(currentCategoryId) : 0;
    const id = currentView === 'list' ? currentListId : currentView;
    return id ? state.getTaskCountForList(id) : 0;
  });

  return (
    // `contents`: no box of its own, it only hands the colour variables down to everything below, add button included
    <div className="contents" style={themeVars}>
      <div className="flex flex-col h-full relative">
        {/* Header: icon tile, title with a quiet line under it, buttons on the right */}
        <ViewHeader
          glyph={headerGlyph}
          title={headerTitle}
          subtitle={headerSubtitle(currentView, openCount)}
          tinted={!!themeVars}
          onBack={onBack}
          actions={
            <>
              {/* Phone: search is an icon in the header (there is no bottom bar) */}
              {currentView !== 'search' && currentView !== 'settings' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.dispatchEvent(new CustomEvent(FOCUS_SEARCH_EVENT))}
                  aria-label="Search"
                  aria-keyshortcuts="f Control+F Meta+F"
                  className="md:hidden h-11 w-11 p-0 rounded-full"
                >
                  <Search size={20} aria-hidden="true" />
                </Button>
              )}
              {isCustomList && currentList && (
                <>
                  {/* Same size and look as the sort and view button beside it */}
                  <Tooltip label="Edit list" side="bottom">
                    <button
                      type="button"
                      onClick={() => setEditingList(currentList)}
                      aria-label={`Edit list ${headerTitle}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-list/10 hover:text-list-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Pencil size={20} aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <ListOptionsMenu list={currentList} />
                </>
              )}
            </>
          }
        />

        {/* Tag filter: shown after clicking a tag in the task details */}
        {filterTag && currentView !== 'search' && (
          <div className="flex flex-wrap items-center gap-2 px-4 md:px-6 py-2 border-b border-line text-sm text-muted">
            <span>Showing only</span>
            <CategoryBadge category={filterTag} size="md" />
            <button
              type="button"
              onClick={() => useUiStore.getState().setTagFilter(null)}
              className="rounded-md px-2 py-1 text-accent hover:bg-accent/10"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Task List */}
        <div
          className="flex-1 overflow-y-auto w-full"
          // The page itself takes a whisper of the list's colour (rows are see-through, so it shows behind them)
          style={themeVars ? { backgroundColor: 'rgb(var(--c-list) / var(--list-wash))' } : undefined}
          onContextMenu={handleEmptyAreaContextMenu}
        >
          {currentView === 'search' ? <SearchView /> : currentView === 'settings' ? <SettingsView /> : <TaskList />}
        </div>
      </div>

      {/* Floating Action Button */}
      {currentView !== 'settings' && (
      <FloatingActionButton
        onQuickAdd={() => handleQuickAdd()}
        onInlineTaskCreate={handleInlineTaskCreate}
        isAnySidebarOpening={isAnySidebarOpen}
      />
      )}

      {/* Quick Add Task Modal */}
      <QuickAddTaskForm
        isOpen={showQuickAdd}
        onClose={() => {
          setShowQuickAdd(false);
          setQuickAddTitle('');
        }}
        initialTitle={quickAddTitle}
        onFullFormRequested={handleQuickAddToFullForm}
      />

      {/* Full Task Form Sidebar */}
      <TaskDetailSidebar
        isOpen={showAddSidebar}
        onClose={() => setShowAddSidebar(false)}
        mode="create"
        initialListId={newTaskDefaults.listId}
        initialCategoryId={newTaskDefaults.categoryIds?.[0]}
        initialMyDay={newTaskDefaults.myDay}
        initialImportant={newTaskDefaults.important}
        initialDueDate={newTaskDefaults.dueDate}
      />

      {/* List Edit Sidebar */}
      {editingList && (
        <ListEditSidebar
          list={editingList}
          isOpen={!!editingList}
          mode="edit"
          onClose={() => setEditingList(null)}
        />
      )}

      {/* Create List Sidebar */}
      <ListEditSidebar
        isOpen={showListEditSidebar}
        mode="create"
        onClose={() => setShowListEditSidebar(false)}
      />
    </div>
  );
}
