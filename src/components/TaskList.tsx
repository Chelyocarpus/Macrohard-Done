import { useEffect, useState } from 'react';
import { useTaskStore } from '../stores/taskStore.ts';
import { useShallow } from 'zustand/react/shallow';
import { TaskItem } from './TaskItem.tsx';
import { MyDaySuggestions } from './MyDaySuggestions.tsx';
import { EmptyViewMessage } from './EmptyViewMessage.tsx';
import { useUiStore } from '../stores/uiStore.ts';
import { useCompletionHoldStore } from '../stores/completionHoldStore.ts';
import { filterTasksByTag } from '../utils/tagFilter.ts';
import { sortTasks } from '../utils/taskSort.ts';
import { getPlannedDate, sortByPlannedDate } from '../utils/planned.ts';
import { PLANNED_BUCKETS, getPlannedBucket } from '../utils/dateUtils.ts';

import { ChevronDown, ChevronUp, Pin } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

// Tasks are cards (see TaskItem); this puts an 8px gap between them.
const FEED_CLASSES = 'space-y-2';

// Section titles line up with the edge of the cards, with a little inset
const SECTION_LABEL_PADDING = 'px-1';

export function TaskList() {
  // Selected: only what is used here. `tasks` is listed too because the getters below read it; without it a change would not re-render.
  const { getTasksForCurrentView, reorderTasks, currentView, currentListId, lists, categories } = useTaskStore(useShallow((state) => ({ getTasksForCurrentView: state.getTasksForCurrentView, reorderTasks: state.reorderTasks, currentView: state.currentView, currentListId: state.currentListId, currentCategoryId: state.currentCategoryId, lists: state.lists, categories: state.categories, tasks: state.tasks })));

  // "Show only tasks with this tag" (set by clicking a tag in the task details)
  const tagFilter = useUiStore((state) => state.tagFilter);
  const filterTag = tagFilter ? categories.find((category) => category.id === tagFilter) : undefined;
  const [activeId, setActiveId] = useState<string | null>(null);

  const [showCompleted, setShowCompleted] = useState(true);

  // The list's own settings (sort order, whether completed tasks are shown)
  const currentList = currentView === 'list' ? lists.find((list) => list.id === currentListId) : undefined;
  const sortMode = currentList?.sortMode ?? 'manual';
  const sortReverse = currentList?.sortReverse === true;
  const completedSectionAllowed = currentList?.showCompleted !== false;

  // Planned is ordered by due date, a list by its sort setting, everything else keeps the store's order
  const allTasks = (() => {
    const tasks = filterTasksByTag(getTasksForCurrentView(), tagFilter);
    if (currentView === 'planned') return sortByPlannedDate(tasks);
    if (currentView === 'list') return sortTasks(tasks, sortMode, sortReverse);
    return tasks;
  })();

  // Drag and drop only makes sense for a single list in its manual order
  const isDragEnabled = currentView === 'list' && !!currentListId && sortMode === 'manual' && !sortReverse;
  
  // Split tasks into active and completed
  // A task that was just completed stays among the active ones for a moment (see completionHoldStore.ts)
  const holdPhases = useCompletionHoldStore((state) => state.phases);
  const isHeld = (task: (typeof allTasks)[number]) => task.completed && !!holdPhases[task.id];
  const activeTasks = allTasks.filter(task => !task.completed || isHeld(task));
  const completedTasks = allTasks.filter(task => task.completed && !isHeld(task));

  // Pinned tasks (the store already sorts them first) get a section of their own so they are visibly
  // separate from the rest. The labels only appear when something is pinned.
  const isPinnedTask = (task: (typeof activeTasks)[number]) => task.pinned || task.pinnedGlobally;
  const pinnedTasks = activeTasks.filter(isPinnedTask);
  const otherTasks = activeTasks.filter((task) => !isPinnedTask(task));

  // Planned: Earlier, Today, Tomorrow, This week, Later (empty parts are left out)
  const plannedSections = currentView === 'planned'
    ? (() => {
        const now = new Date();
        return PLANNED_BUCKETS
          .map((bucket) => ({
            ...bucket,
            tasks: activeTasks.filter((task) => {
              const plannedDate = getPlannedDate(task);
              return !!plannedDate && getPlannedBucket(plannedDate, now) === bucket.id;
            }),
          }))
          .filter((section) => section.tasks.length > 0);
      })()
    : [];

  // Keyboard: Tab reaches ONE row of the list (the selected one, else the first on screen); the arrow
  // keys move between the others. `visibleIds` follows the order the rows are drawn in.
  const selectedTaskId = useUiStore((state) => state.selectedTaskId);
  const visibleIds = [
    ...(currentView === 'planned' ? plannedSections.flatMap((section) => section.tasks) : [...pinnedTasks, ...otherTasks]),
    ...(completedSectionAllowed && showCompleted ? completedTasks : []),
  ].map((task) => task.id);
  const tabbableId = selectedTaskId && visibleIds.includes(selectedTaskId) ? selectedTaskId : visibleIds[0] ?? null;

  // Ticked tasks that are no longer shown (deleted, filtered out, a collapsed "Completed" section) are unticked, so a
  // bulk action never reaches a task that is not on screen
  const visibleKey = visibleIds.join('|');
  useEffect(() => {
    useUiStore.getState().retainChecked(visibleKey ? visibleKey.split('|') : []);
  }, [visibleKey]);

  // MouseSensor (not PointerSensor) so finger touches are handled only by TouchSensor's press-and-hold;
  // otherwise a swipe to scroll the list would also start a drag.
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    // Space and Enter belong to "complete" and "open details" now, so the keyboard sensor must not start a
    // drag from them; moving a task by keyboard is Alt+Up / Alt+Down (see hooks/useKeyboardShortcuts.ts).
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: [], cancel: ['Escape'], end: ['Space', 'Enter', 'Tab'] },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };



  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);


    if (!over || active.id === over.id || !isDragEnabled) {
      return;
    }

    // For list view, only allow reordering within active tasks section
    const oldIndex = activeTasks.findIndex(task => task.id === active.id);
    const newIndex = activeTasks.findIndex(task => task.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    // Create reordered array using the current tasks order
    const reorderedTasks = [...activeTasks];
    const [movedTask] = reorderedTasks.splice(oldIndex, 1);
    reorderedTasks.splice(newIndex, 0, movedTask);
    
    // Get the IDs in the new order
    const taskIds = reorderedTasks.map(task => task.id);
    
    // For completed tasks, maintain their original order after the active tasks
    completedTasks.forEach(task => {
      taskIds.push(task.id);
    });
    
    reorderTasks(taskIds, currentListId!);
  };



  // Each group of cards is a list (its rows are list items, see TaskItem), so a screen reader can say how many tasks
  // there are and which one it is on
  const renderGroup = (tasks: typeof activeTasks, isDraggable: boolean, label: string) => (
    <div className={FEED_CLASSES} role="list" aria-label={label}>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          isDragEnabled={isDragEnabled && isDraggable}
          isDragging={isDragEnabled && isDraggable ? activeId === task.id : undefined}
          activeTaskId={activeId}
          tabbable={task.id === tabbableId}
        />
      ))}
    </div>
  );

  const renderPlannedTasks = () => {
    return plannedSections.map((section, index) => (
      <section key={section.id} aria-label={section.label} className={index > 0 ? 'mt-6' : undefined}>
        <h3 className={`flex items-center gap-1.5 mb-2 ${SECTION_LABEL_PADDING} text-xs font-semibold uppercase tracking-wide text-muted`}>
          {section.label}
          <span className="font-normal normal-case tracking-normal text-muted">{section.tasks.length}</span>
        </h3>
        {renderGroup(section.tasks, false, `${section.label} tasks`)}
      </section>
    ));
  };

  const renderActiveTasks = (isDraggable: boolean) => {
    if (activeTasks.length === 0) return null;
    if (currentView === 'planned') return renderPlannedTasks();
    const hasPinned = pinnedTasks.length > 0;

    const sections = (
      <>
        {hasPinned && (
          <section aria-label="Pinned tasks">
            <h3 className={`flex items-center gap-1.5 mb-2 ${SECTION_LABEL_PADDING} text-xs font-semibold uppercase tracking-wide text-muted`}>
              <Pin size={12} className="fill-current" aria-hidden="true" />
              Pinned
              <span className="font-normal normal-case tracking-normal text-muted">{pinnedTasks.length}</span>
            </h3>
            {renderGroup(pinnedTasks, isDraggable, 'Pinned tasks')}
          </section>
        )}
        {otherTasks.length > 0 && (
          <section aria-label={hasPinned ? 'Other tasks' : undefined} className={hasPinned ? 'mt-6' : undefined}>
            {hasPinned && (
              <h3 className={`mb-2 ${SECTION_LABEL_PADDING} text-xs font-semibold uppercase tracking-wide text-muted`}>
                Other tasks
              </h3>
            )}
            {renderGroup(otherTasks, isDraggable, hasPinned ? 'Other tasks' : 'Tasks')}
          </section>
        )}
      </>
    );

    if (isDragEnabled && isDraggable) {
      return (
        <SortableContext items={activeTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {sections}
        </SortableContext>
      );
    }
    return sections;
  };

  // Completed tasks are never dragged
  const renderTaskItems = (tasks: typeof activeTasks) => {
    if (tasks.length === 0) return null;

    return (
      <div className={FEED_CLASSES} role="list" aria-label="Completed tasks">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} isDragEnabled={false} activeTaskId={activeId} tabbable={task.id === tabbableId} />
        ))}
      </div>
    );
  };

  return (
    <div className="px-3 py-3 md:px-4 md:py-4 w-full relative">
      {/* My Day: overdue and important tasks that can be added with one click */}
      {currentView === 'my-day' && <MyDaySuggestions />}

      {/* No Tasks Message */}
      {allTasks.length === 0 ? (
        <EmptyViewMessage view={currentView} tagName={filterTag?.name} />
      ) : isDragEnabled ? (

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div>
              {/* Active Tasks */}
              {renderActiveTasks(true)}
          
              {/* Completed Tasks Section (if any exist) */}
              {completedSectionAllowed && completedTasks.length > 0 && (
                <div className="mt-8">
                  <button 
                    className={`flex items-center gap-2 text-muted text-sm font-medium mb-2 ${SECTION_LABEL_PADDING} hover:text-accent transition-colors`}
                    onClick={() => setShowCompleted(!showCompleted)}
                  >
                    {showCompleted ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                    <span>Completed ({completedTasks.length})</span>
                  </button>
                  
                  {/* Conditionally render completed tasks */}
                  {showCompleted && (
                    <div className="opacity-80">
                      {renderTaskItems(completedTasks)}
                    </div>
                  )}
                </div>
              )}
            </div>
          
            <DragOverlay>
              {activeId ? (
                <div>
                  <TaskItem
                    task={activeTasks.find(task => task.id === activeId)!} 
                    isDragEnabled={true}
                    isDragging={true}
                    isOverlay={true}
                    activeTaskId={activeId}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

      ) : (
        <>
          {/* Active Tasks */}
          {renderActiveTasks(false)}

          {/* Completed Tasks Section (if any exist) */}
          {completedSectionAllowed && completedTasks.length > 0 && (
            <div className="mt-8">
              <button 
                className={`flex items-center gap-2 text-muted text-sm font-medium mb-2 ${SECTION_LABEL_PADDING} hover:text-accent transition-colors`}
                onClick={() => setShowCompleted(!showCompleted)}
              >
                {showCompleted ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
                <span>Completed ({completedTasks.length})</span>
              </button>
              
              {/* Conditionally render completed tasks */}
              {showCompleted && (
                <div className="opacity-80">
                  {renderTaskItems(completedTasks)}
                </div>
              )}
            </div>
          )}
        </>
      )}
      
      {/* Completed tasks hidden through the list's settings */}
      {!completedSectionAllowed && completedTasks.length > 0 && (
        <p className={`mt-6 ${SECTION_LABEL_PADDING} text-sm text-muted`}>
          {completedTasks.length} completed task{completedTasks.length > 1 ? 's' : ''} hidden. You can show them in the list's sort and view options.
        </p>
      )}

      {/* Global spacer to prevent FAB overlap - always present regardless of task list state */}
      {allTasks.length > 0 && (
        <div 
          className="h-24 sm:h-20"
          aria-hidden="true"
          data-testid="fab-spacer"
          title="Space to prevent floating action button overlap"
        />
      )}
    </div>
  );
}
