import { useState, memo, Fragment, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Star, Sun, Pin, MoreHorizontal, Check, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types/index.ts';
import { useTaskStore } from '../stores/taskStore.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { useCompletionHoldStore } from '../stores/completionHoldStore.ts';
import { toggleTaskWithHold } from '../utils/completeTask.ts';
import { focusTaskRowSoon } from '../utils/taskDom.ts';
import { groupIconOverride } from '../utils/emojiUtils.ts';
import { highlightSegments, sameTerms } from '../utils/search.ts';
import { useSwipeRow } from '../hooks/useSwipeRow.ts';
import { Button } from './ui/Button.tsx';
import { Tooltip } from './ui/Tooltip.tsx';
import { cn } from '../utils/cn.ts';
import { formatDate } from '../utils/dateUtils.ts';
import { useDateTimePrefs } from '../stores/dateFormatStore.ts';
import { TaskDetailSidebar } from './TaskDetailSidebar.tsx';
import { TaskMeta, TaskMinimalMeta, TaskFooter, TaskDescription } from './TaskMeta.tsx';
import { useContextMenuHandler, useContextMenuButtonHandler } from './ui/useContextMenu.ts';
import { createTaskContextMenu } from './ui/contextMenus.tsx';

interface TaskItemProps {
  task: Task;
  isDragEnabled?: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
  activeTaskId?: string | null;
  /** The one row in the list that Tab can reach (the selected one, or the first). The others are reached with the arrow keys. */
  tabbable?: boolean;
  /** Search view: words to highlight in the title */
  highlight?: readonly string[];
  /** Search view: a line shown under the title (e.g. where the words were found in the notes) */
  extra?: ReactNode;
  /** Search view: always show the list's name, also for the default Tasks list */
  showListName?: boolean;
}

function TaskItemComponent({ task, isDragEnabled = false, isDragging: providedIsDragging = false, isOverlay = false, activeTaskId = null, tabbable = false, highlight, extra, showListName = false }: TaskItemProps) {
  useDateTimePrefs(); // dates here follow the chosen style, so draw again when it changes
  // Select only what this item needs (actions are stable; lists/groups change rarely) so
  // unrelated store updates, such as editing another task, don't re-render every item.
  const {
    toggleImportant, toggleSubTask, deleteTask, addTask, toggleMyDay, togglePin, toggleGlobalPin,
    lists, listGroups, currentView, categories, rowDensity,
  } = useTaskStore(useShallow((state) => ({
    toggleImportant: state.toggleImportant,
    toggleSubTask: state.toggleSubTask,
    deleteTask: state.deleteTask,
    addTask: state.addTask,
    toggleMyDay: state.toggleMyDay,
    togglePin: state.togglePin,
    toggleGlobalPin: state.toggleGlobalPin,
    lists: state.lists,
    listGroups: state.listGroups,
    currentView: state.currentView,
    categories: state.categories,
    rowDensity: state.rowDensity,
  })));

  // Destructure task properties for cleaner code
  const { 
    id: taskId, 
    title, 
    listId, 
    completed, 
    important, 
    myDay, 
    dueDate, 
    reminder, 
    notes, 
    repeat, 
    repeatDays, 
    steps, 
    pinned, 
    pinnedGlobally
  } = task;
  

  
  // Only use sortable hook if drag is enabled
  const sortable = useSortable({ 
    id: taskId,
    disabled: !isDragEnabled
  });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = sortable;
  
  // Use provided isDragging or sortable.isDragging
  const isDragging = providedIsDragging || sortableIsDragging;
  // Selection and the open details panel live in a small shared store so the keyboard shortcuts can
  // drive them. These selectors return plain values, so only the affected rows re-render.
  const selected = useUiStore((state) => state.selectedTaskId === taskId);
  const showEditSidebar = useUiStore((state) => state.openTask?.id === taskId);
  // The request object itself (new for every shortcut press), so the open details can react to a repeated D or R
  const detailRequest = useUiStore((state) => (state.openTask?.id === taskId ? state.openTask : null));
  const [showSteps, setShowSteps] = useState(false);
  // Only counts while the task is still completed: an Undo during the hold must not collapse an open task
  const collapsing = useCompletionHoldStore((state) => state.phases[taskId] === 'collapsing') && completed;

  // Touch: swipe right = My Day, swipe left = delete (with Undo). The "more" menu has both for every other input.
  const swipe = useSwipeRow({
    enabled: !isOverlay,
    onAction: (action) => {
      if (action === 'my-day') toggleMyDay(taskId);
      else deleteTask(taskId);
    },
  });

  // Get the list this task belongs to
  const taskList = lists.find(list => list.id === listId);

  // Check if group has icon override enabled
  const group = taskList?.groupId ? listGroups.find(g => g.id === taskList.groupId) ?? null : null;
  const displayEmoji = groupIconOverride(group) ?? taskList?.emoji;

  // Completing keeps the row in place for a moment before it moves to "Completed" (see completeTask.ts)
  const handleToggleComplete = () => {
    toggleTaskWithHold(taskId);
  };

  const handleToggleImportant = () => {
    toggleImportant(taskId);
  };

  const handleEdit = () => {
    useUiStore.getState().openTaskDetails(taskId);
  };

  // From the right-click menu: open the details with the date picker already showing
  const handleSetDueDate = () => {
    useUiStore.getState().openTaskDetails(taskId, 'due');
  };

  const handleDelete = () => {
    deleteTask(taskId);
  };

  const handleDuplicate = () => {
    addTask(title, listId, {
      important,
      dueDate,
      reminder,
      notes,
      myDay,
      repeat,
      repeatDays,
      steps: steps.map(step => ({ title: step.title })),
      categoryIds: task.categoryIds,
    });
  };

  const handleToggleMyDay = () => {
    toggleMyDay(taskId);
  };

  const handleTogglePin = () => {
    togglePin(taskId);
  };

  const handleToggleGlobalPin = () => {
    toggleGlobalPin(taskId);
  };

  const handleToggleStep = (stepId: string) => {
    toggleSubTask(taskId, stepId);
  };

  // Clicking or tapping the row opens the task details (the steps have their own toggle button).
  // Pitfalls guarded against: clicks on links, buttons and inputs inside the row keep their own
  // behaviour, and finishing a text selection by dragging across the title must not open the panel.
  const handleTaskClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button, input, textarea, label, select')) return;
    if (window.getSelection()?.toString()) return;
    if (swipe.consumeClick()) return; // the tap a browser sends when a swipe ends
    handleEdit();
  };

  // The same menu opens from a right-click and from the visible "more" button (for touch screens)
  const getTaskMenu = () => createTaskContextMenu(task, {
    onEdit: handleEdit,
    onDelete: handleDelete,
    onToggleComplete: handleToggleComplete,
    onToggleImportant: handleToggleImportant,
    onToggleMyDay: handleToggleMyDay,
    onTogglePin: handleTogglePin,
    onToggleGlobalPin: handleToggleGlobalPin,
    onDuplicate: handleDuplicate,
    onSetDueDate: handleSetDueDate,
    onManageCategories: handleEdit, // Opens edit sidebar where categories can be managed
  });
  const handleContextMenu = useContextMenuHandler(getTaskMenu);
  const handleMenuButtonClick = useContextMenuButtonHandler(getTaskMenu);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // The list name only helps where tasks from several lists are mixed (My Day, Planned, ...), not inside a list
  const showListTag = !!taskList && (showListName || (currentView !== 'list' && !taskList.isSystem));
  const minimal = rowDensity === 'minimal';

  // "due tomorrow" but "due Nov 21, 2026": only the relative words are lower-cased
  const dueText = dueDate ? formatDate(dueDate) : '';
  const dueLabel = dueDate ? `, due ${['Today', 'Tomorrow', 'Yesterday'].includes(dueText) ? dueText.toLowerCase() : dueText}` : '';
  // The name stays the same; whether it is done is said by aria-pressed (a changing name plus aria-pressed says it twice)
  const checkLabel = `Complete task: ${title}${dueLabel}`;

  // The pin: one click pins to the top of the list, or unpins when it is pinned (also from "all views", which the
  // more menu can set)
  const handlePinClick = () => (pinnedGlobally ? handleToggleGlobalPin() : handleTogglePin());
  const pinLabel = pinnedGlobally ? 'Unpin from all views' : pinned ? 'Unpin from the top of the list' : 'Pin to the top of the list';

  // Hover only reveals the buttons that are still OFF. One that is set (in My Day, important, pinned) stays
  // visible as the row's state. A hidden button still takes its space, so rows don't shift, and it shows for
  // keyboard focus anywhere in the row. Touch screens have no hover: the star stays visible there, the sun and
  // pin appear only when set (the "more" menu and swipes reach them).
  // Narrow screens (under 640px) work like touch screens even with a mouse: a hidden button would still take about
  // 32px of a narrow card and cut the title short for nothing, so there the star and "more" are always shown, and
  // the sun and pin only when set.
  const REVEAL = 'sm:[@media(hover:hover)]:opacity-0 sm:[@media(hover:hover)]:group-hover:opacity-100 sm:[@media(hover:hover)]:group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity';
  const NO_TOUCH_WHEN_OFF = 'max-sm:hidden [@media(hover:none)]:hidden';

  // Touch screens get larger targets (44px) and no hover-only controls
  const ACTION_BUTTON = 'p-0 h-8 w-8 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 rounded-full flex-shrink-0';

  const row = (
      <div
        ref={setNodeRef}
        style={style}
        {...(isDragEnabled ? { ...attributes, ...listeners } : {})}
        // Keyboard: one row is in the Tab order (roving tabindex); the arrow keys move between rows (see
        // hooks/useKeyboardShortcuts.ts). The copy shown while dragging is not a real row.
        {...(isOverlay ? {} : { 'data-task-id': taskId })}
        tabIndex={!isOverlay && (selected || tabbable) ? 0 : -1}
        aria-current={selected ? 'true' : undefined}
        onFocus={() => useUiStore.getState().selectTask(taskId)}
        className={cn(
          // A card: its own rounded, bordered surface with a soft shadow, so each task stands out from the page
          // (the list puts a gap between cards). Colour is kept for the few things that carry meaning: overdue
          // (red), today (accent) and important (star).
          // The card keeps an opaque background; hover and selected tints are laid over it as a gradient, so the page's
          // faint list colour never shows through and the copy shown while dragging needs no extra background.
          'task-item group relative cursor-pointer transition-[background-color,border-color,box-shadow] px-4 py-2 rounded-xl border border-line bg-canvas shadow-sm [@media(pointer:coarse)]:touch-pan-y',
          'hover:bg-[image:linear-gradient(var(--row-hover),var(--row-hover))] hover:shadow-md',
          // Selected: a border in the list's colour plus a stronger tint than hover, so the two never look alike.
          // Focus ring: 2px accent, inside the card so the list can't clip it.
          selected && !isOverlay && 'border-list bg-[image:linear-gradient(var(--row-selected),var(--row-selected))]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
          // While swiping the content slides sideways; keep it inside the card so the list doesn't scroll sideways
          swipe.offset !== 0 && 'overflow-hidden',
          isOverlay && 'shadow-lg',
          isDragging && !isOverlay && 'opacity-0',
          activeTaskId && activeTaskId !== taskId && !isDragging && 'opacity-40'
        )}
        onClick={handleTaskClick}
        onContextMenu={handleContextMenu}
        {...swipe.handlers}
      >
        {/* Behind the row while it is being swiped: what letting go will do */}
        {swipe.offset !== 0 && (
          <div
            aria-hidden="true"
            className={cn(
              'absolute inset-0 flex items-center px-5 text-sm font-medium text-on-accent',
              swipe.offset > 0 ? 'justify-start bg-accent' : 'justify-end bg-overdue'
            )}
          >
            {swipe.offset > 0
              ? <span className="flex items-center gap-2"><Sun size={18} />{myDay ? 'Remove from My Day' : 'Add to My Day'}</span>
              : <span className="flex items-center gap-2">Delete<Trash2 size={18} /></span>}
          </div>
        )}
        <div
          className={cn(swipe.offset !== 0 && 'relative bg-canvas rounded-xl')}
          style={{
            transform: swipe.offset !== 0 ? `translateX(${swipe.offset}px)` : undefined,
            transition: swipe.dragging ? 'none' : 'transform 160ms ease-out',
          }}
        >
          <div className="flex items-start gap-3">
          {/* Checkbox: a 22px circle; hover previews the check, checked fills with the "done" colour */}
          <Tooltip label={completed ? 'Mark as not done' : 'Mark as done'}>
          <button
            type="button"
            aria-label={checkLabel}
            aria-pressed={completed}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleComplete();
            }}
            className={cn(
              // The invisible ::before grows the tap area to about 46px without changing the look
              'group/check relative before:content-[""] before:absolute before:-inset-3',
              'w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors duration-[120ms] flex-shrink-0',
              completed
                ? 'bg-done border-done'
                : 'border-muted hover:border-done'
            )}
          >
            <Check
              size={14}
              strokeWidth={3}
              aria-hidden="true"
              className={cn(
                completed ? 'text-white animate-check-in' : 'text-done opacity-0 group-hover/check:opacity-70 transition-opacity'
              )}
            />
          </button>
          </Tooltip>

          {/* Title */}
          <div className="task-content min-w-0 flex-1">
            <div
              className={cn(
                // Minimal cards keep the title to one line (cut with an ellipsis; the full title is in the tooltip and the details panel)
                'text-[15px] leading-[1.4] font-normal',
                minimal ? 'line-clamp-1' : 'line-clamp-2',
                completed ? 'line-through text-muted' : 'text-ink'
              )}
              style={{
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
              title={title} // Show full title on hover when truncated
            >
              {highlight && highlight.length > 0
                ? highlightSegments(title, highlight).map((segment, index) => (
                    segment.match
                      ? <mark key={index} className="rounded-sm bg-accent/20 text-inherit">{segment.text}</mark>
                      : <Fragment key={index}>{segment.text}</Fragment>
                  ))
                : title}
            </div>
          </div>

          {/* Actions on the right: sun (My Day), pin, star, and "more". Set ones always show; off ones show on hover. */}
          {/* The negative top and bottom margins cancel the buttons' extra height, so the note and details start right
              under the title instead of under the taller buttons. */}
          <div className="flex items-center self-start -my-1 -mr-1 [@media(pointer:coarse)]:-my-[11px]">
            <Tooltip label={myDay ? 'Remove from My Day' : 'Add to My Day'}>
            <Button
              variant="ghost"
              size="sm"
              aria-label={myDay ? 'Remove from My Day' : 'Add to My Day'}
              aria-pressed={myDay}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleMyDay();
              }}
              className={cn(
                ACTION_BUTTON,
                myDay ? 'text-accent' : cn('text-muted', REVEAL, NO_TOUCH_WHEN_OFF)
              )}
            >
              <Sun size={16} className={myDay ? 'fill-current' : ''} />
            </Button>
            </Tooltip>

            <Tooltip label={pinLabel}>
            <Button
              variant="ghost"
              size="sm"
              aria-label={pinLabel}
              aria-pressed={pinned || pinnedGlobally}
              onClick={(e) => {
                e.stopPropagation();
                handlePinClick();
              }}
              className={cn(
                ACTION_BUTTON,
                // pinned to all views reads as the accent, pinned to its list as normal text
                pinnedGlobally ? 'text-accent' : pinned ? 'text-ink' : cn('text-muted', REVEAL, NO_TOUCH_WHEN_OFF)
              )}
            >
              <Pin size={16} className={pinned || pinnedGlobally ? 'fill-current' : ''} />
            </Button>
            </Tooltip>

            <Tooltip label={important ? 'Remove importance' : 'Mark as important'}>
            <Button
              variant="ghost"
              size="sm"
              aria-label={important ? 'Remove importance' : 'Mark as important'}
              aria-pressed={important}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleImportant();
              }}
              className={cn(ACTION_BUTTON, important ? 'text-important' : cn('text-muted hover:text-important', REVEAL))}
            >
              <Star size={16} className={important ? 'fill-current' : ''} />
            </Button>
            </Tooltip>

            {/* More - same menu as right-click, so touch screens can reach every task action.
                On mouse devices it appears on hover or keyboard focus to keep the list quiet. */}
            <Tooltip label="More actions">
            <Button
              variant="ghost"
              size="sm"
              aria-label="More actions"
              aria-haspopup="menu"
              onClick={handleMenuButtonClick}
              className={cn(
                ACTION_BUTTON,
                'text-muted hover:text-ink',
                REVEAL
              )}
            >
              <MoreHorizontal size={16} />
            </Button>
            </Tooltip>
          </div>
          </div>

          {/* Everything under the title, on the full width of the card (not squeezed beside the action buttons, which
              matters on a phone): the note as a description, the date pills, the steps, and the tags and list. The left
              margin lines it up with the title: the 22px check plus the 12px gap. */}
          <div className="ml-[34px] min-w-0">
            {/* The note, as a description right under the title (minimal rows fold everything into one line below) */}
            {!minimal && <TaskDescription task={task} density={rowDensity} />}

            {extra}

            {minimal ? (
              <TaskMinimalMeta
                task={task}
                list={taskList}
                listEmoji={displayEmoji}
                showList={showListTag}
                categories={categories}
                stepsOpen={showSteps}
                onToggleSteps={() => setShowSteps((open) => !open)}
              />
            ) : (
              <TaskMeta
                task={task}
                density={rowDensity}
                stepsOpen={showSteps}
                onToggleSteps={() => setShowSteps((open) => !open)}
              />
            )}

            {/* Steps - expandable if they exist */}
            {steps.length > 0 && showSteps && (
              <div className="mt-2 w-full min-w-0 overflow-hidden space-y-1">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-2 py-0.5 w-full min-h-fit"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={step.completed}
                      aria-label={`Step: ${step.title}`}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleStep(step.id);
                      }}
                      className="rounded accent-accent focus:ring-accent w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                    />
                    <div className={cn(
                      'text-sm flex-1 leading-snug',
                      step.completed ? 'line-through text-muted' : 'text-ink'
                    )}
                    style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}
                    >
                      {step.title}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!minimal && <TaskFooter task={task} list={taskList} listEmoji={displayEmoji} showList={showListTag} categories={categories} density={rowDensity} />}
          </div>
        </div>
      </div>
  );

  return (
    <>
      {/* The finished row shrinks away (200ms) before it moves to "Completed"; the wrapper only exists
          during that, so dragging and the list's transforms are not clipped the rest of the time. */}
      {collapsing ? (
        <div className="row-collapse">
          <div className="min-h-0 overflow-hidden">{row}</div>
        </div>
      ) : row}

      {/* Task Detail Sidebar - mounted only while open so closed items don't each carry its state and effects */}
      {showEditSidebar && (
        <TaskDetailSidebar
          task={task}
          isOpen={showEditSidebar}
          onClose={() => {
            useUiStore.getState().closeTaskDetails(taskId);
            // Back to the row that was being edited, so keyboard users keep their place
            focusTaskRowSoon(taskId);
          }}
          mode="edit"
          panelRequest={detailRequest}
        />
      )}
    </>
  );
}

// Memoized component with optimized comparison
export const TaskItem = memo(TaskItemComponent, (prevProps, nextProps) => {
  // Always re-render if task data changed
  if (prevProps.task !== nextProps.task) return false;
  
  // Always re-render if drag state changed for THIS specific task
  if (prevProps.isDragEnabled !== nextProps.isDragEnabled) return false;
  if (prevProps.isDragging !== nextProps.isDragging) return false;
  if (prevProps.isOverlay !== nextProps.isOverlay) return false;
  if (prevProps.tabbable !== nextProps.tabbable) return false;

  // Search view: the highlighted words, the list name and the match line change while the task itself does not.
  // `extra` is compared by identity, so a row that gets a new match line redraws (the Search view makes one per render).
  if (!sameTerms(prevProps.highlight, nextProps.highlight)) return false;
  if (prevProps.showListName !== nextProps.showListName) return false;
  if (prevProps.extra !== nextProps.extra) return false;

  // Only re-render when activeTaskId changes in meaningful ways
  const prevActive = !!prevProps.activeTaskId;
  const nextActive = !!nextProps.activeTaskId;
  const prevIsThisTask = prevProps.activeTaskId === prevProps.task.id;
  const nextIsThisTask = nextProps.activeTaskId === nextProps.task.id;
  
  // Re-render if:
  // 1. Drag state started/stopped (null to non-null or vice versa)
  // 2. This task became the dragged task or stopped being the dragged task
  if (prevActive !== nextActive) return false;
  if (prevIsThisTask !== nextIsThisTask) return false;
  
  // No re-render needed - the visual state is the same
  return true;
});
