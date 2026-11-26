import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { X, Star, Calendar, Repeat, Sun, Bell, Copy, Pin, CheckCircle2, RotateCcw, Trash2, List } from 'lucide-react';
import type { Task } from '../types/index.ts';
import { useTaskStore } from '../stores/taskStore.ts';
import { useShallow } from 'zustand/react/shallow';
import { Button } from './ui/Button.tsx';
// Create lazy component for MarkdownEditor
const LazyMarkdownEditor = React.lazy(() => 
  import('./ui/MarkdownEditor.tsx').then(module => ({ 
    default: module.MarkdownEditor 
  }))
);
import { LazyWrapper } from './ui/ErrorBoundary.tsx';
import { EditorLoadingWithTimeout } from './ui/LoadingWithTimeout.tsx';
import { DateTimePicker } from './DateTimePicker.tsx';
import { toggleTaskWithHold } from '../utils/completeTask.ts';
import { accentVars } from '../utils/accentTheme.ts';
import { useUiStore, type DetailPanel } from '../stores/uiStore.ts';
import { useLayoutMode } from '../hooks/useMediaQuery.ts';
import { CategorySelector } from './CategorySelector.tsx';
import { AutoSaveIndicator } from './ui/AutoSaveIndicator.tsx';
import { useAutoSave } from '../hooks/useAutoSave.ts';
import { useEscapeKey } from '../hooks/useEscapeKey.ts';
import { useFocusTrap } from '../hooks/useFocusTrap.ts';
import { cn } from '../utils/cn.ts';
import { formatDate, formatFullDate, formatTime } from '../utils/dateUtils.ts';
import { useDateTimePrefs } from '../stores/dateFormatStore.ts';
import { shortcutLabel } from '../utils/platform.ts';
import { Tooltip } from './ui/Tooltip.tsx';
import { StepList } from './StepList.tsx';
import { QuickActionRow } from './QuickActionRow.tsx';

interface TaskDetailSidebarProps {
  task?: Task;
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialListId?: string;
  initialCategoryId?: string;
  /** Create mode: start with these set, so a task made from My Day / Important / Planned appears there */
  initialMyDay?: boolean;
  initialImportant?: boolean;
  initialDueDate?: Date;
  /**
   * Edit mode: a request to show a picker (keyboard shortcuts D, R and Ctrl+Shift+M). Every request is a
   * NEW object, so asking for the same picker twice still works while the panel is already open.
   */
  panelRequest?: { panel?: DetailPanel } | null;
}

/** One of the four quick actions in the footer: icon over a short label, sharing a rounded bar */
const QUICK_ACTION_CLASS = 'flex w-full flex-col items-center justify-center gap-1.5 px-1 py-2.5 text-xs font-medium text-muted transition-colors hover:bg-hover hover:text-ink focus:outline-none focus-visible:bg-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [@media(pointer:coarse)]:min-h-14';

export function TaskDetailSidebar({ task, isOpen, onClose, mode, initialListId, initialCategoryId, initialMyDay, initialImportant, initialDueDate, panelRequest }: TaskDetailSidebarProps) {
  useDateTimePrefs(); // dates here follow the chosen style, so draw again when it changes
  // Wide screens show an existing task's details as a permanent pane beside the list; everything else
  // (other screen sizes, and the New Task form) opens them over the page: a side panel, or on a phone a bottom sheet
  const layout = useLayoutMode();
  const persistent = layout === 'wide' && mode === 'edit';
  // On a phone the details are a bottom sheet: tell the messages (Undo and so on) how tall its button bar is, so they
  // sit above it instead of covering Duplicate, Pin, Complete and Move
  const footerRef = useRef<HTMLDivElement>(null);
  const isBottomSheet = isOpen && layout === 'narrow';
  // A Date prop would be a new object every render, so the effect below depends on its timestamp
  const initialDueTime = initialDueDate?.getTime();
  const { addTask, updateTask, deleteTask, addSubTask, toggleSubTask, deleteSubTask, moveSubTask, togglePin, lists, darkMode } = useTaskStore(useShallow((state) => ({ addTask: state.addTask, updateTask: state.updateTask, deleteTask: state.deleteTask, addSubTask: state.addSubTask, toggleSubTask: state.toggleSubTask, deleteSubTask: state.deleteSubTask, moveSubTask: state.moveSubTask, togglePin: state.togglePin, lists: state.lists, darkMode: state.darkMode })));
  // The task's own list gives the panel a touch of its colour (a thin line and a soft wash in the header)
  const listVars = accentVars(lists.find((list) => list.id === (task?.listId ?? initialListId))?.color, darkMode);
  
  // Form state - using object destructuring for cleaner code
  const { 
    title: taskTitle = '', 
    notes: taskNotes = '', 
    important: taskImportant = false, 
    myDay: taskMyDay = false, 
    dueDate: taskDueDate, 
    repeat: taskRepeat = 'none', 
    repeatDays: taskRepeatDays = [1, 2, 3, 4, 5, 6, 0],
    repeatInterval: taskRepeatInterval = 1,
    repeatAnchor: taskRepeatAnchor = 'due',
    categoryIds: taskCategoryIds = []
  } = task || {};
  
  const [title, setTitle] = useState(taskTitle);
  const [notes, setNotes] = useState(taskNotes);
  const [important, setImportant] = useState(taskImportant);
  const [myDay, setMyDay] = useState(taskMyDay);
  const [dueDate, setDueDate] = useState<Date | undefined>(taskDueDate);
  const [repeat, setRepeat] = useState<string>(taskRepeat);
  const [repeatDays, setRepeatDays] = useState<number[]>(taskRepeatDays);
  const [repeatInterval, setRepeatInterval] = useState<number>(taskRepeatInterval);
  // What is typed in the "every N" field; it may be empty for a moment while typing a new number
  const [intervalDraft, setIntervalDraft] = useState<string>(String(taskRepeatInterval));
  const [repeatAnchor, setRepeatAnchor] = useState<'due' | 'completion'>(taskRepeatAnchor);
  const [categoryIds, setCategoryIds] = useState<string[]>(taskCategoryIds);
  // Starts from the task like every other field. It must not start empty: the very first render would then differ from
  // the saved task, and the autosave (which also runs when the form is torn down and rebuilt in development) would
  // write that empty reminder over the real one before the form catches up.
  const [reminder, setReminder] = useState<Date | undefined>(() => (task?.reminder ? new Date(task.reminder) : undefined));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showRepeatOptions, setShowRepeatOptions] = useState(false);
  
  // Step management state
  const stepIdCounter = useRef(0);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [tempSteps, setTempSteps] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);
  const [showListSelector, setShowListSelector] = useState(false);

  // Ref to track initialization to prevent infinite loops
  const initializingRef = useRef<string | boolean>(false);

  // Auto-save setup for edit mode
  const autoSaveFunction = useCallback(() => {
    // A save that was waiting when the panel closed can run after the task was deleted: then there is nothing to save
    if (mode === 'edit' && task?.id && useTaskStore.getState().tasks.some((t) => t.id === task.id)) {
      updateTask(task.id, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        important,
        myDay,
        dueDate,
        reminder,
        repeat: repeat as Task['repeat'],
        repeatDays: repeat === 'daily' && repeatInterval === 1 ? repeatDays : undefined,
        repeatInterval: repeat !== 'none' ? repeatInterval : undefined,
        repeatAnchor: repeat !== 'none' ? repeatAnchor : undefined,
        categoryIds,
      });
    }
  }, [mode, task?.id, updateTask, title, notes, important, myDay, dueDate, reminder, repeat, repeatDays, repeatInterval, repeatAnchor, categoryIds]);

  // Current form values for auto-save comparison
  const currentValues = {
    title,
    notes,
    important,
    myDay,
    dueDate,
    reminder,
    repeat,
    repeatDays: repeat === 'daily' && repeatInterval === 1 ? repeatDays : undefined,
    repeatInterval: repeat !== 'none' ? repeatInterval : undefined,
    repeatAnchor: repeat !== 'none' ? repeatAnchor : undefined,
    categoryIds,
  };

  // Original values from the task for comparison
  const originalValues = {
    title: taskTitle,
    notes: taskNotes,
    important: taskImportant,
    myDay: taskMyDay,
    dueDate: taskDueDate,
    reminder: task?.reminder,
    repeat: taskRepeat,
    repeatDays: taskRepeat === 'daily' && taskRepeatInterval === 1 ? taskRepeatDays : undefined,
    repeatInterval: taskRepeat !== 'none' ? taskRepeatInterval : undefined,
    repeatAnchor: taskRepeat !== 'none' ? taskRepeatAnchor : undefined,
    categoryIds: taskCategoryIds,
  };

  // Auto-save hook - only enabled in edit mode
  // `resetKey`: switching to another task (or closing) saves what was typed in the last moment for the task being left
  const { saveStatus, cancelPendingSave } = useAutoSave(
    autoSaveFunction,
    currentValues,
    originalValues,
    { enabled: mode === 'edit' && isOpen, resetKey: task?.id }
  );

  // Escape closes one layer: a picker open over this panel handles it first. Tab stays inside the panel when it is a
  // dialog (the permanent pane beside the list is not one).
  const panelRef = useRef<HTMLDivElement>(null);
  useEscapeKey(isOpen, () => {
    // The permanent pane sits beside the list: Escape pressed while a control elsewhere has focus is not meant for it
    const focused = document.activeElement;
    if (persistent && focused && focused !== document.body && !panelRef.current?.contains(focused)) return;
    onClose();
    // Back closes it too, but only where it covers the list (the permanent pane beside the list is part of the page)
  }, { back: !persistent });
  useFocusTrap(panelRef, isOpen && !persistent);

  // Reset form when task changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      const taskKey = mode === 'create' ? 'create' : (task?.id || 'no-task');
      
      if (!initializingRef.current || initializingRef.current !== taskKey) {
        initializingRef.current = taskKey;
        
        setTitle(taskTitle);
        setNotes(taskNotes);
        const isCreate = mode === 'create';
        setImportant(isCreate ? !!initialImportant : taskImportant);
        setMyDay(isCreate ? !!initialMyDay : taskMyDay);
        setDueDate(
          isCreate
            ? (initialDueTime !== undefined ? new Date(initialDueTime) : undefined)
            : (taskDueDate ? new Date(taskDueDate) : undefined)
        );
        setRepeat(taskRepeat);
        setRepeatDays(taskRepeatDays);
        setRepeatInterval(taskRepeatInterval);
        setIntervalDraft(String(taskRepeatInterval));
        setRepeatAnchor(taskRepeatAnchor);
        setReminder(task?.reminder ? new Date(task.reminder) : undefined);
        setShowDatePicker(false);
        setShowReminderPicker(false);
        setShowRepeatOptions(false);
        setShowListSelector(false);

        // Set category IDs - use initialCategoryId for create mode
        let currentCategoryIds: string[] = [];
        if (mode === 'create' && initialCategoryId) {
          currentCategoryIds = [initialCategoryId];
        } else if (task?.categoryIds) {
          currentCategoryIds = task.categoryIds;
        }
        setCategoryIds(currentCategoryIds);
        
        // Initialize tempSteps for create mode
        if (mode === 'create') {
          setTempSteps([]);
        }
      }
    }
  }, [isOpen, task?.id, mode, taskTitle, taskNotes, taskImportant, taskMyDay, taskDueDate, taskRepeat, taskRepeatDays, taskRepeatInterval, taskRepeatAnchor, task?.reminder, task?.categoryIds, initialCategoryId, initialMyDay, initialImportant, initialDueTime]);

  // A request to show a picker (it runs after the reset above, also for the very first one)
  useEffect(() => {
    if (!isOpen || !panelRequest?.panel) return;
    setShowDatePicker(panelRequest.panel === 'due');
    setShowReminderPicker(panelRequest.panel === 'reminder');
    setShowListSelector(panelRequest.panel === 'list');
  }, [isOpen, panelRequest]);

  // The page makes room for the permanent pane while it is showing
  useEffect(() => {
    if (!persistent || !isOpen) return;
    useUiStore.getState().adjustDetailPaneCount(1);
    return () => useUiStore.getState().adjustDetailPaneCount(-1);
  }, [persistent, isOpen]);

  // Grow the title field to fit its text (and shrink again when text is removed)
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const fit = () => {
      el.style.height = 'auto';
      // A field that has no layout yet (still being drawn, or hidden) reports 0: keep it at its natural
      // height instead of squashing it to nothing, and measure again when it gets its size
      if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    const frame = window.requestAnimationFrame(fit);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
    observer?.observe(el);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [title, isOpen]);

  // Reset initialization flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      initializingRef.current = false;
    }
  }, [isOpen]);

  const handleSave = useCallback(() => {
    if (!title.trim()) return;

    if (mode === 'create') {
      // Convert tempSteps to the format expected by addTask
      const steps = tempSteps.map(step => ({ title: step.title }));
      
      const created = addTask(title.trim(), initialListId || 'all', {
        important,
        myDay,
        dueDate,
        reminder,
        notes: notes.trim() || undefined,
        repeat,
        repeatDays: repeat === 'daily' && repeatInterval === 1 ? repeatDays : undefined,
        repeatInterval: repeat !== 'none' ? repeatInterval : undefined,
        repeatAnchor: repeat !== 'none' ? repeatAnchor : undefined,
        steps: steps.length > 0 ? steps : undefined,
        categoryIds,
      });
      // Keep the form open on failure so the user's input isn't lost
      if (!created) return;
    } else if (task) {
      // These values are saved right here, so the waiting autosave has nothing left to do
      cancelPendingSave();
      updateTask(task.id, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        important,
        myDay,
        dueDate,
        reminder,
        repeat: repeat as Task['repeat'],
        repeatDays: repeat === 'daily' && repeatInterval === 1 ? repeatDays : undefined,
        repeatInterval: repeat !== 'none' ? repeatInterval : undefined,
        repeatAnchor: repeat !== 'none' ? repeatAnchor : undefined,
        categoryIds,
      });
    }

    onClose();
  }, [mode, title, tempSteps, addTask, initialListId, important, myDay, dueDate, reminder, notes, repeat, repeatDays, repeatInterval, repeatAnchor, categoryIds, task, updateTask, onClose, cancelPendingSave]);

  const handleTagClick = useCallback((categoryId: string) => {
    useUiStore.getState().setTagFilter(categoryId);
    onClose();
  }, [onClose]);

  const handleToggleComplete = useCallback(() => {
    if (task) {
      toggleTaskWithHold(task.id);
    }
  }, [task]);

  const handleDelete = useCallback(() => {
    // No confirm: deleting shows an "Undo" toast instead
    if (task) {
      deleteTask(task.id);
      onClose();
    }
  }, [task, deleteTask, onClose]);

  const handleDuplicate = useCallback(() => {
    if (task) {
      const { title, listId, important, dueDate, notes, repeat, repeatDays, repeatInterval, repeatAnchor, steps, categoryIds } = task;
      addTask(title + ' (Copy)', listId || 'all', {
        important,
        myDay: false, // Don't add duplicate to My Day automatically
        dueDate,
        reminder: undefined, // Don't duplicate reminders
        notes,
        repeat,
        repeatDays,
        repeatInterval,
        repeatAnchor,
        steps: steps.map(step => ({ title: step.title })),
        categoryIds
      });
      onClose();
    }
  }, [task, addTask, onClose]);

  const handleTogglePin = useCallback(() => {
    if (task) {
      togglePin(task.id);
    }
  }, [task, togglePin]);

  const handleArchive = useCallback(() => {
    if (task) {
      toggleTaskWithHold(task.id); // Complete the task to archive it
      onClose();
    }
  }, [task, onClose]);

  const handleMoveToList = useCallback((targetListId: string) => {
    if (task) {
      updateTask(task.id, { listId: targetListId });
      setShowListSelector(false);
      onClose();
    }
  }, [task, updateTask, onClose]);

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
  const handleAddStep = (stepTitle: string) => {
    const text = stepTitle.trim();
    if (!text) return;

    if (mode === 'create') {
      // Add to temporary steps for create mode. The counter keeps ids unique when several steps are
      // typed within the same millisecond (Date.now() alone would repeat).
      stepIdCounter.current += 1;
      setTempSteps((steps) => [...steps, { id: `temp-${Date.now()}-${stepIdCounter.current}`, title: text, completed: false }]);
    } else if (task) {
      // Add to existing task for edit mode
      addSubTask(task.id, text);
    }
  };

  // Turn a step into a task of its own (same list and categories) and remove it from this task.
  // The step is only removed once the new task exists, so a failed creation can't lose it.
  const handleConvertStep = (stepId: string) => {
    if (!task) return;
    const step = task.steps.find((s) => s.id === stepId);
    if (!step) return;
    const created = addTask(step.title, task.listId, { categoryIds: task.categoryIds });
    if (created) deleteSubTask(task.id, stepId);
  };

  const handleMoveStep = (stepId: string, direction: -1 | 1) => {
    if (task) moveSubTask(task.id, stepId, direction);
  };

  const handleMoveTempStep = (stepId: string, direction: -1 | 1) => {
    setTempSteps((steps) => {
      const from = steps.findIndex((step) => step.id === stepId);
      const to = from + direction;
      if (from === -1 || to < 0 || to >= steps.length) return steps;
      const moved = [...steps];
      [moved[from], moved[to]] = [moved[to], moved[from]];
      return moved;
    });
  };

  const handleDeleteTempStep = (stepId: string) => {
    setTempSteps(tempSteps.filter(step => step.id !== stepId));
  };

  const handleToggleStep = (stepId: string) => {
    if (!task) return;
    toggleSubTask(task.id, stepId);
  };

  const handleDeleteStep = (stepId: string) => {
    if (!task) return;
    deleteSubTask(task.id, stepId);
  };

  // Enhanced keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    // Ctrl/Cmd+S saves and closes, also while typing (it is not a letter): "Add task" when making one, "Done" otherwise
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSave();
      return;
    }

    // The other shortcuts only apply when not in input fields
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'd':
          e.preventDefault();
          if (mode === 'edit' && task) {
            handleDuplicate();
          }
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (mode === 'edit' && task) {
            handleDelete();
          }
          break;
      }
    }

    // Non-modifier shortcuts
    switch (e.key.length === 1 ? e.key.toLowerCase() : e.key) {
      case 'p':
        // Same as the page-wide "P"; the permanent pane is not a dialog, so there the page-wide one handles it
        if (!persistent && mode === 'edit' && task && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !e.repeat) {
          e.preventDefault();
          handleTogglePin();
        }
        break;
      case ' ':
        // The permanent pane is not a dialog, so the page-wide shortcut already handles Space there
        if (!persistent && e.target === document.body && task) {
          e.preventDefault();
          handleToggleComplete();
        }
        break;
    }
  }, [isOpen, mode, persistent, task, handleSave, handleDuplicate, handleDelete, handleToggleComplete, handleTogglePin]);

  // Add keyboard event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Value line of the "Repeat" row, e.g. "Daily (weekdays)" or "Every 2 weeks"
  const repeatSummary = (() => {
    const units: Record<string, string> = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };
    const unit = units[repeat];
    if (repeatInterval > 1) return `Every ${repeatInterval} ${unit}s`;
    const name = repeat.charAt(0).toUpperCase() + repeat.slice(1);
    if (repeat !== 'daily' || repeatDays.length === 0 || repeatDays.length >= 7) return name;
    const has = (days: number[]) => repeatDays.length === days.length && days.every((d) => repeatDays.includes(d));
    if (has([1, 2, 3, 4, 5])) return `${name} (weekdays)`;
    if (has([0, 6])) return `${name} (weekends)`;
    return `${name} (${repeatDays.length} day${repeatDays.length > 1 ? 's' : ''})`;
  })();

  // The "every N" field: keeps what is typed, and only accepts whole numbers from 1 to 999
  const handleIntervalChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 3);
    setIntervalDraft(digits);
    const n = parseInt(digits, 10);
    if (Number.isFinite(n) && n >= 1) setRepeatInterval(n);
  };

  // Keeps the shared "sheet footer height" current while the bottom sheet is showing (the bar grows with the text
  // size), and resets it to 0 when the sheet closes or stops being a bottom sheet.
  useEffect(() => {
    const footer = footerRef.current;
    if (!isBottomSheet || !footer) return;
    const report = () => useUiStore.getState().setBottomSheetFooterHeight(footer.offsetHeight);
    report();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(report) : null;
    observer?.observe(footer);
    return () => {
      observer?.disconnect();
      useUiStore.getState().setBottomSheetFooterHeight(0);
    };
  }, [isBottomSheet, mode]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={persistent ? 'fixed right-0 top-0 bottom-0 z-30 flex w-[360px]' : 'fixed inset-0 z-40 flex flex-col md:flex-row'}
      role={persistent ? 'complementary' : 'dialog'}
      aria-modal={persistent ? undefined : true}
      aria-label="Task details"
      style={listVars}
    >
      {/* Backdrop (not for the permanent pane: the list beside it stays usable) */}
      {!persistent && (
        <div
          className="flex-1 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Pane / side panel / phone bottom sheet */}
      <div className={cn(
        'w-full bg-canvas flex flex-col border-line pb-[env(safe-area-inset-bottom)]',
        persistent
          ? 'border-l pt-[env(safe-area-inset-top)]'
          : 'h-[92dvh] rounded-t-2xl shadow-2xl md:h-auto md:w-[400px] md:rounded-none md:border-l md:pt-[env(safe-area-inset-top)]'
      )}>
        {/* Phone sheet grab handle */}
        {!persistent && <div className="mx-auto mt-2 h-1 w-10 flex-shrink-0 rounded-full bg-line md:hidden" aria-hidden="true" />}
        {/* Header */}
        <div className="relative flex items-center justify-between p-4 sm:p-6 border-b border-line bg-sidebar">
          {listVars && (
            <>
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-list" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-list/[0.10] to-transparent" />
            </>
          )}
          <h2 className="relative text-lg sm:text-xl font-semibold text-ink tracking-tight">
            {mode === 'create' ? 'New Task' : 'Task Details'}
          </h2>
          <Tooltip label="Close" shortcut="Esc" side="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close"
              className="relative p-2 hover:bg-hover rounded-full transition-colors"
            >
              <X size={18} className="text-muted" />
            </Button>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Task Title Section */}
          <div className="mb-4 sm:mb-8 rounded-xl border bg-canvas border-line">
            <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4">
              {task && (
                <Tooltip label={task.completed ? 'Mark as not done' : 'Mark as done'} side="bottom">
                <button
                  onClick={handleToggleComplete}
                  aria-label={task.completed ? 'Mark as not done' : 'Mark as done'}
                  className={cn(
                    'hit-area mt-3 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0',
                    'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
                    task.completed
                      ? 'bg-accent border-accent text-on-accent shadow-md hover:bg-accent-hover'
                      : 'border-line hover:border-accent hover:bg-accent/10'
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
                </Tooltip>
              )}

              <div className="flex-1 min-w-0">
                {/* A growing textarea (not an input) so a long title wraps instead of being cut off */}
                <textarea
                  ref={titleRef}
                  rows={1}
                  value={title}
                  onChange={(e) => setTitle(e.target.value.replace(/\s*\n\s*/g, ' '))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="What needs to be done?"
                  aria-label="Task title"
                  className="block w-full resize-none overflow-hidden pt-2.5 pb-1 text-lg sm:text-xl leading-snug font-medium text-ink border-none shadow-none bg-transparent focus:outline-none placeholder:text-muted"
                  autoFocus={mode === 'create'}
                />
                {mode === 'edit' && task && (
                  <div className="text-sm text-muted mt-2">
                    Created {formatFullDate(new Date(task.createdAt))}
                  </div>
                )}
              </div>

              <Tooltip label={important ? 'Remove importance' : 'Mark as important'} side="bottom">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImportant(!important)}
                aria-label={important ? 'Remove importance' : 'Mark as important'}
                aria-pressed={important}
                className={cn(
                  'p-2.5 rounded-full transition-all duration-200 flex-shrink-0',
                  'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-important focus:ring-offset-2',
                  important 
                    ? 'text-important bg-important/10 hover:bg-important/15' 
                    : 'text-muted hover:text-important'
                )}
              >
                <Star size={20} className={important ? 'fill-current' : ''} />
              </Button>
              </Tooltip>
            </div>

            {/* Steps live in the same card as the title, like in Microsoft To Do */}
            {(mode === 'create' || (mode === 'edit' && task)) && (
              <div className="border-t border-line">
                <StepList
                  key={mode === 'create' ? 'create' : task?.id}
                  steps={mode === 'create' ? tempSteps : (task?.steps ?? [])}
                  onAdd={handleAddStep}
                  onDelete={mode === 'create' ? handleDeleteTempStep : handleDeleteStep}
                  onMove={mode === 'create' ? handleMoveTempStep : handleMoveStep}
                  onToggle={mode === 'edit' ? handleToggleStep : undefined}
                  onConvertToTask={mode === 'edit' ? handleConvertStep : undefined}
                />
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mb-4 sm:mb-8">
            <h3 className="text-sm font-medium text-ink mb-2 sm:mb-3 tracking-wide uppercase">Quick Actions</h3>

            {/* Two tiles per row: the "when" pair on top (due date, reminder), then repeat and My Day. A tile shows
                its value under the name once it is set, and has a small X in its corner to clear it. */}
            <div className="grid grid-cols-2 gap-2">
              <QuickActionRow
                icon={<Calendar size={16} />}
                label="Due date"
                detail={dueDate ? formatDate(dueDate) : undefined}
                active={!!dueDate}
                expanded={showDatePicker}
                onClick={() => setShowDatePicker(!showDatePicker)}
                onClear={removeDueDate}
                clearLabel="Remove due date"
              />

              <QuickActionRow
                icon={<Bell size={16} />}
                label="Reminder"
                detail={reminder ? `${formatDate(reminder)}, ${formatTime(reminder)}` : undefined}
                active={!!reminder}
                expanded={showReminderPicker}
                onClick={() => setShowReminderPicker(!showReminderPicker)}
                onClear={removeReminder}
                clearLabel="Remove reminder"
              />

              <QuickActionRow
                icon={<Repeat size={16} />}
                label="Repeat"
                detail={repeat !== 'none' ? repeatSummary : undefined}
                active={repeat !== 'none'}
                expanded={showRepeatOptions}
                onClick={() => setShowRepeatOptions(!showRepeatOptions)}
                onClear={() => setRepeat('none')}
                clearLabel="Stop repeating"
              />

              <QuickActionRow
                icon={<Sun size={16} />}
                label="My Day"
                detail="Added"
                active={myDay}
                pressed={myDay}
                onClick={() => setMyDay(!myDay)}
              />
            </div>
          </div>

          {/* Repeat Options */}
          {showRepeatOptions && (
            <div className="mb-6 p-3 sm:p-5 border rounded-xl bg-sidebar border-line shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-ink">Repeat frequency</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRepeatOptions(false)}
                  className="p-1 hover:bg-hover rounded-full"
                >
                  <X size={16} className="text-muted" />
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
                        ? "bg-accent/10 text-accent font-medium" 
                        : "hover:bg-hover"
                    )}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* How the task repeats: every N days/weeks/..., what the next date is counted from, and (for a plain daily one) which weekdays.
              One card with the parts divided by a line, rather than a box for each */}
          {repeat !== 'none' && (
            <div className="mb-6 divide-y divide-line rounded-xl border border-line bg-canvas">
              <div className="space-y-4 p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="repeat-interval" className="text-sm font-medium text-ink">Every</label>
                  <input
                    id="repeat-interval"
                    type="text"
                    inputMode="numeric"
                    value={intervalDraft}
                    onChange={(e) => handleIntervalChange(e.target.value)}
                    onBlur={() => setIntervalDraft(String(repeatInterval))}
                    aria-label="Repeat every"
                    className="w-16 h-10 rounded-lg border border-line bg-canvas px-2 text-center text-base text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <select
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value)}
                    aria-label="Repeat unit"
                    className="h-10 flex-1 rounded-lg border border-line bg-canvas px-2 text-base text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="daily">{repeatInterval === 1 ? 'day' : 'days'}</option>
                    <option value="weekly">{repeatInterval === 1 ? 'week' : 'weeks'}</option>
                    <option value="monthly">{repeatInterval === 1 ? 'month' : 'months'}</option>
                    <option value="yearly">{repeatInterval === 1 ? 'year' : 'years'}</option>
                  </select>
                </div>

                <div>
                  <div className="text-sm font-medium text-ink mb-2" id="repeat-anchor-label">Count the next date from</div>
                  <div role="radiogroup" aria-labelledby="repeat-anchor-label" className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-hover">
                    {([
                      { value: 'due', label: 'Due date' },
                      { value: 'completion', label: 'Completion date' },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={repeatAnchor === option.value}
                        onClick={() => setRepeatAnchor(option.value)}
                        className={cn(
                          'h-9 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                          repeatAnchor === option.value
                            ? 'bg-canvas text-ink shadow-sm'
                            : 'text-muted hover:text-ink'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Weekday choice (a plain "every day"; with "every 2 days" a weekday choice makes no sense) */}
              {repeat === 'daily' && repeatInterval === 1 && (
                <div className="p-3 sm:p-4">
                  <h4 className="mb-3 text-sm font-medium text-ink">Repeat on days</h4>
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
                            ? "bg-accent text-on-accent shadow-sm transform scale-105"
                            : "bg-hover text-muted hover:bg-accent/10 hover:text-accent"
                        )}
                        title={item.fullLabel}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRepeatDays([1, 2, 3, 4, 5])}
                      className="h-7 rounded-md px-2.5 py-1 text-xs text-accent hover:bg-accent/10"
                    >
                      Weekdays
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRepeatDays([0, 6])}
                      className="h-7 rounded-md px-2.5 py-1 text-xs text-accent hover:bg-accent/10"
                    >
                      Weekends
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRepeatDays([0, 1, 2, 3, 4, 5, 6])}
                      className="h-7 rounded-md px-2.5 py-1 text-xs text-accent hover:bg-accent/10"
                    >
                      All days
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Categories */}
          <div className="space-y-2 mb-4 sm:mb-8">
            <h3 className="text-sm font-medium text-ink mb-2 sm:mb-4 tracking-wide uppercase">Tags</h3>
            
            <CategorySelector
              selectedCategoryIds={categoryIds}
              onChange={setCategoryIds}
              placeholder="Add tags..."
              // Clicking a chosen tag closes the panel and shows only tasks with that tag in the current view
              onTagClick={mode === 'edit' ? handleTagClick : undefined}
            />
          </div>

          {/* Additional Details */}
          <div className="space-y-2 sm:space-y-4">
            <h3 className="text-sm font-medium text-ink mb-2 sm:mb-4 tracking-wide uppercase">Notes</h3>
            
            <LazyWrapper
              fallback={<EditorLoadingWithTimeout />}
              context="markdown editor"
            >
              <LazyMarkdownEditor
                value={notes}
                onChange={(value) => setNotes(value)}
                placeholder="Add a detailed description or note about this task..."
              />
            </LazyWrapper>
          </div>
        </div>

        {/* List Selector Modal */}
        {showListSelector && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-canvas rounded-lg shadow-xl max-w-sm w-full mx-4">
              <div className="p-4 border-b border-line">
                <h3 className="text-lg font-semibold text-ink">
                  Move to List
                </h3>
                <p className="text-sm text-muted">
                  Select a list to move this task to:
                </p>
              </div>
              <div className="p-4 max-h-60 overflow-y-auto">
                {lists.filter(list => list.id !== task?.listId && !list.isSystem).map(list => (
                  <button
                    key={list.id}
                    onClick={() => handleMoveToList(list.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-hover transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {list.emoji && <span className="text-lg">{list.emoji}</span>}
                      <span className="font-medium text-ink">
                        {list.name}
                      </span>
                    </div>
                  </button>
                ))}
                {lists.filter(list => list.id !== task?.listId && !list.isSystem).length === 0 && (
                  <p className="text-center text-muted py-4">
                    No other lists available. Create a new list first.
                  </p>
                )}
              </div>
              <div className="p-4 border-t border-line">
                <Button
                  variant="ghost"
                  onClick={() => setShowListSelector(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div ref={footerRef} className="p-4 border-t border-line bg-sidebar">
          {/* Edit mode: one row of quick actions, then Remove on the left and Done on the right (changes are saved as you make them) */}
          {mode === 'edit' && task && (
            <div className="space-y-3">
              {/* The four quick actions share one rounded bar instead of four boxes */}
              <div className="grid grid-cols-4 divide-x divide-line overflow-hidden rounded-xl border border-line bg-canvas">
                <Tooltip label="Duplicate task" shortcut={shortcutLabel('D')} className="w-full [&>button]:flex-1">
                  <button type="button" onClick={handleDuplicate} aria-label="Duplicate task" className={QUICK_ACTION_CLASS}>
                    <Copy size={18} aria-hidden="true" />
                    <span className="max-w-full truncate leading-none">Duplicate</span>
                  </button>
                </Tooltip>

                <Tooltip label={task.pinned ? 'Unpin from list' : 'Pin to list'} shortcut="P" className="w-full [&>button]:flex-1">
                  <button
                    type="button"
                    onClick={handleTogglePin}
                    aria-label={task.pinned ? 'Unpin from list' : 'Pin to list'}
                    aria-pressed={task.pinned}
                    className={cn(QUICK_ACTION_CLASS, task.pinned && 'bg-accent/10 text-accent hover:bg-accent/15 hover:text-accent')}
                  >
                    <Pin size={18} className={task.pinned ? 'fill-current' : ''} aria-hidden="true" />
                    <span className="max-w-full truncate leading-none">{task.pinned ? 'Unpin' : 'Pin'}</span>
                  </button>
                </Tooltip>

                <Tooltip label={task.completed ? 'Mark as incomplete' : 'Mark as complete'} shortcut="Space" className="w-full [&>button]:flex-1">
                  <button
                    type="button"
                    onClick={handleArchive}
                    aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    className={cn(QUICK_ACTION_CLASS, task.completed && 'bg-done/10 text-done hover:bg-done/15 hover:text-done')}
                  >
                    {task.completed ? <RotateCcw size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
                    <span className="max-w-full truncate leading-none">{task.completed ? 'Restore' : 'Complete'}</span>
                  </button>
                </Tooltip>

                <Tooltip label="Move to a different list" className="w-full [&>button]:flex-1">
                  <button type="button" onClick={() => setShowListSelector(true)} aria-label="Move to different list" className={QUICK_ACTION_CLASS}>
                    <List size={18} aria-hidden="true" />
                    <span className="max-w-full truncate leading-none">Move</span>
                  </button>
                </Tooltip>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Tooltip label="Remove task" shortcut={shortcutLabel('Backspace')}>
                    <Button variant="ghost" size="sm" onClick={handleDelete} className="gap-2 text-overdue hover:bg-overdue/10 hover:text-overdue">
                      <Trash2 size={16} aria-hidden="true" />
                      Remove
                    </Button>
                  </Tooltip>
                  {/* Only shown while something is happening */}
                  <AutoSaveIndicator status={saveStatus} />
                </div>
                <Tooltip label="Save and close" shortcut={shortcutLabel('S')}>
                  <Button size="sm" onClick={handleSave} disabled={!title.trim()} className="px-5">
                    Done
                  </Button>
                </Tooltip>
              </div>
            </div>
          )}

          {/* Create Mode Footer */}
          {mode === 'create' && (
            <div className="flex justify-between items-center">
              <div></div>
              <div className="flex gap-3">
                <Tooltip label="Discard this task" shortcut="Esc">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="px-4 py-2 text-muted hover:text-ink"
                >
                  Cancel
                </Button>
                </Tooltip>
                <Tooltip label="Add this task" shortcut={shortcutLabel('S')}>
                <Button
                  onClick={handleSave}
                  size="sm"
                  disabled={!title.trim()}
                  className="px-6 py-2 bg-accent hover:bg-accent-hover disabled:bg-line disabled:text-muted disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  Add task
                </Button>
                </Tooltip>
              </div>
            </div>
          )}
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
