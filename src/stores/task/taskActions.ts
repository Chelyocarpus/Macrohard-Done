import { startOfDay, addDays, differenceInCalendarDays } from 'date-fns';
import { formatShortDate } from '../../utils/dateUtils.ts';
import type { Task } from '../../types/index.ts';
import { generateId } from '../../utils/storage.ts';
import { useToastStore } from '../toastStore.ts';
import { computeNextDueDate, normalizeInterval } from '../../utils/repeat.ts';
import { deduplicateCategoryIds, normalizeRepeat, toDayKey, rollOverMyDay } from './helpers.ts';
import type { NewTaskOptions, StoreContext, TaskStore } from './types.ts';

/** Task actions: adding, changing, completing, pinning and ordering tasks and their steps, and the daily My Day and repeat passes. */
export const createTaskActions = ({ set, get, saveState }: StoreContext): Pick<TaskStore, 'addTask' | 'updateTask' | 'deleteTask' | 'toggleTask' | 'toggleImportant' | 'toggleMyDay' | 'togglePin' | 'toggleGlobalPin' | 'addSubTask' | 'toggleSubTask' | 'deleteSubTask' | 'moveSubTask' | 'processRepeatingTasks' | 'rolloverMyDay' | 'reorderTasks'> => ({
  addTask: (title: string, listId = 'all', options: NewTaskOptions = {}): boolean => {
    // Validation
    if (!title.trim()) {
      useToastStore.getState().showError('Invalid input', 'Task title cannot be empty');
      return false;
    }

    if (title.trim().length > 200) {
      useToastStore.getState().showError('Invalid input', 'Task title is too long (maximum 200 characters)');
      return false;
    }

    // Check if list exists (allow 'all' as virtual list)
    if (listId !== 'all') {
      const listExists = get().lists.some(list => list.id === listId);
      if (!listExists) {
        useToastStore.getState().showError('List not found', 'The selected list no longer exists');
        return false;
      }
    }
    
    try {
      const currentTasks = get().tasks.filter(task => task.listId === listId);
      // New tasks go to the bottom of the list, or to the top when the list is set that way
      const addToTop = get().lists.find(list => list.id === listId)?.addToTop === true;
      const orders = currentTasks.map(t => t.order);
      const nextOrder = orders.length === 0 ? 0 : addToTop ? Math.min(...orders) - 1 : Math.max(...orders) + 1;
      
      // Create initial steps if provided
      const initialSteps = options.steps?.map(step => ({
        id: generateId(),
        title: step.title,
        completed: false,
        createdAt: new Date(),
      })) || [];
      
      const newTask: Task = {
        id: generateId(),
        title: title.trim(),
        completed: false,
        important: options.important || false,
        myDay: options.myDay || false,
        myDayDate: options.myDay ? toDayKey() : undefined,
        pinned: false,
        pinnedGlobally: false,
        dueDate: options.dueDate,
        reminder: options.reminder,
        notes: options.notes,
        repeat: normalizeRepeat(options.repeat),
        repeatDays: options.repeatDays,
        repeatInterval: options.repeat && options.repeat !== 'none' && options.repeatInterval ? normalizeInterval(options.repeatInterval) : undefined,
        repeatAnchor: options.repeat && options.repeat !== 'none' && options.repeatAnchor === 'completion' ? 'completion' : undefined,
        order: nextOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
        listId,
        categoryIds: deduplicateCategoryIds(options.categoryIds || []),
        steps: initialSteps,
      };
      
      set((state) => ({
        tasks: [...state.tasks, newTask],
      }));
      saveState();
      
      // Show success toast
      useToastStore.getState().showSuccess('Task created', `"${title.trim()}" was added successfully`);
      return true;
    } catch (error) {
      console.error('Error adding task:', error);
      useToastStore.getState().showError('Error', 'Failed to create task. Please try again.');
      return false;
    }
  },

  updateTask: (id: string, updates: Partial<Task>) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) {
      useToastStore.getState().showError('Task not found', 'The task you are trying to update no longer exists');
      return;
    }
    
    try {
      // Deduplicate categoryIds if they are being updated
      const processedUpdates = { ...updates };
      if (updates.categoryIds) {
        processedUpdates.categoryIds = deduplicateCategoryIds(updates.categoryIds);
      }
      if (updates.repeat !== undefined) {
        processedUpdates.repeat = normalizeRepeat(updates.repeat);
      }
      if (updates.repeatInterval !== undefined) {
        processedUpdates.repeatInterval = normalizeInterval(updates.repeatInterval);
      }
      if (updates.repeatAnchor !== undefined && updates.repeatAnchor !== 'completion') {
        processedUpdates.repeatAnchor = 'due';
      }
      // Keep the My Day day stamp in step with the flag. The details panel sends `myDay` with every
      // autosave, so an unchanged "true" must keep the original day instead of restarting it.
      if (updates.myDay !== undefined) {
        processedUpdates.myDayDate = updates.myDay
          ? (task.myDay && task.myDayDate ? task.myDayDate : toDayKey())
          : undefined;
      }

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? { ...task, ...processedUpdates, updatedAt: new Date() }
            : task
        ),
      }));
      saveState();
      
      // Show toast for significant updates
      if (updates.dueDate !== undefined) {
        const previousDueDate = task.dueDate;
        const newDueDate = updates.dueDate;
        
        // Check if the due date value has actually changed (compare timestamps; tolerate non-Date values)
        const toTime = (d: Date | null | undefined): number | null => (d ? new Date(d).getTime() : null);
        const dateChanged = toTime(previousDueDate) !== toTime(newDueDate);
        
        if (dateChanged) {
          if (newDueDate) {
            useToastStore.getState().showInfo('Due date updated', `"${task.title}" due date was set`);
          } else {
            useToastStore.getState().showInfo('Due date removed', `"${task.title}" due date was cleared`);
          }
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
      useToastStore.getState().showError('Error', 'Failed to update task. Please try again.');
    }
  },

  /**
   * Removes a task and offers "Undo".
   *
   * Robustness / pitfalls guarded against:
   * - Undo after the list was deleted meanwhile: the task goes back to the Tasks list instead of
   *   pointing at a list that no longer exists.
   * - Undo pressed twice, or the task already back: it is never added a second time.
   * - Unknown id: nothing happens and no toast is shown.
   */
  deleteTask: (id: string) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
    saveState();

    useToastStore.getState().showUndo('Task deleted', `"${task.title}" was removed`, () => {
      if (get().tasks.some((t) => t.id === task.id)) return;
      const listStillExists = task.listId === 'all' || get().lists.some((l) => l.id === task.listId);
      set((state) => ({
        tasks: [...state.tasks, listStillExists ? task : { ...task, listId: 'all' }],
      }));
      saveState();
    });
  },

  /**
   * Completes or reopens a task. Completing a repeating task also creates its next occurrence.
   *
   * Robustness / pitfalls guarded against:
   * - Undo after the task was changed by hand (reopened, deleted): undo does nothing instead of
   *   flipping it back again.
   * - Undo of a repeating task removes the occurrence that completing it created, but only while that
   *   one is still open, so a task you already finished is not thrown away.
   * - The next occurrence starts with all steps open, no My Day, and a reminder moved by the same
   *   number of days as the due date.
   * - Reopening a completed repeating task forgets which occurrence it created, so completing it
   *   again creates a new one instead of pointing at an old one.
   */
  toggleTask: (id: string) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) {
      useToastStore.getState().showError('Task not found', `Could not find a task with id "${id}"`);
      return;
    }

    // Reopen
    if (task.completed) {
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, completed: false, repeatSpawnedId: undefined, updatedAt: new Date() } : t
        ),
      }));
      saveState();
      return;
    }

    // Complete
    const now = new Date();
    let next: Task | undefined;
    if (task.repeat && task.repeat !== 'none') {
      const nextDueDate = computeNextDueDate(task, now);
      const shiftDays = task.dueDate ? differenceInCalendarDays(nextDueDate, new Date(task.dueDate)) : 0;
      next = {
        ...task,
        id: generateId(),
        completed: false,
        myDay: false,
        myDayDate: undefined,
        dueDate: nextDueDate,
        reminder: task.reminder && task.dueDate ? addDays(new Date(task.reminder), shiftDays) : undefined,
        repeatSpawnedId: undefined,
        steps: task.steps.map((step) => ({ ...step, id: generateId(), completed: false })),
        createdAt: now,
        updatedAt: now,
      };
    }
    const spawnedId = next?.id;

    set((state) => ({
      tasks: [
        ...state.tasks.map((t) =>
          t.id === id ? { ...t, completed: true, repeatSpawnedId: spawnedId, updatedAt: now } : t
        ),
        ...(next ? [next] : []),
      ],
    }));
    saveState();

    const description = next?.dueDate
      ? `"${task.title}" is done. Next one: ${formatShortDate(next.dueDate)}`
      : `"${task.title}" is done`;
    useToastStore.getState().showUndo('Task completed', description, () => {
      const current = get().tasks.find((t) => t.id === id);
      if (!current || !current.completed) return;
      set((state) => ({
        tasks: state.tasks
          .filter((t) => !(spawnedId && t.id === spawnedId && !t.completed))
          .map((t) => (t.id === id ? { ...t, completed: false, repeatSpawnedId: undefined, updatedAt: new Date() } : t)),
      }));
      saveState();
    });
  },

  toggleImportant: (id: string) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) {
      useToastStore.getState().showError('Task not found', `Could not find a task with id "${id}"`);
      return;
    }
    
    const newImportantState = !task.important;
    
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, important: newImportantState, updatedAt: new Date() }
          : task
      ),
    }));
    saveState();
    
    // Show toast only when marking as important
    if (newImportantState) {
      useToastStore.getState().showInfo('Marked as important', `"${task.title}" is now important ⭐`);
    }
  },

  toggleMyDay: (id: string) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) {
      useToastStore.getState().showError('Task not found', `Could not find a task with id "${id}"`);
      return;
    }
    
    const newMyDayState = !task.myDay;
    
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, myDay: newMyDayState, myDayDate: newMyDayState ? toDayKey() : undefined, updatedAt: new Date() }
          : task
      ),
    }));
    saveState();
    
    // Show toast only when adding to My Day
    if (newMyDayState) {
      useToastStore.getState().showInfo('Added to My Day', `"${task.title}" was added to My Day 📅`);
    }
  },

  togglePin: (id: string) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, pinned: !task.pinned, updatedAt: new Date() }
          : task
      ),
    }));
    saveState();
  },

  toggleGlobalPin: (id: string) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, pinnedGlobally: !task.pinnedGlobally, updatedAt: new Date() }
          : task
      ),
    }));
    saveState();
  },

  addSubTask: (taskId: string, title: string) => {
    const newSubTask = {
      id: generateId(),
      title,
      completed: false,
      createdAt: new Date(),
    };

    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              steps: [...task.steps, newSubTask],
              updatedAt: new Date(),
            }
          : task
      ),
    }));
    saveState();
  },

  toggleSubTask: (taskId: string, subTaskId: string) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              steps: task.steps.map((step) =>
                step.id === subTaskId
                  ? { ...step, completed: !step.completed }
                  : step
              ),
              updatedAt: new Date(),
            }
          : task
      ),
    }));
    saveState();
  },

  deleteSubTask: (taskId: string, subTaskId: string) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              steps: task.steps.filter((step) => step.id !== subTaskId),
              updatedAt: new Date(),
            }
          : task
      ),
    }));
    saveState();
  },

  moveSubTask: (taskId: string, subTaskId: string, direction: -1 | 1) => {
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const from = task.steps.findIndex((step) => step.id === subTaskId);
        const to = from + direction;
        if (from === -1 || to < 0 || to >= task.steps.length) return task;
        const steps = [...task.steps];
        [steps[from], steps[to]] = [steps[to], steps[from]];
        return { ...task, steps, updatedAt: new Date() };
      }),
    }));
    saveState();
  },

  /**
   * Reopen completed repeating tasks saved by an older version, whose due date has passed, on their
   * next date. Tasks completed since then already created their next occurrence (see toggleTask) and
   * are skipped.
   *
   * Robustness / pitfalls guarded against:
   * - Long absence: a task that is several intervals overdue is advanced until its due date is
   *   today or later (not just one interval), so it doesn't stay overdue until the next reload.
   * - Runaway loop: catch-up is capped inside computeNextDueDate, and a repeat rule that fails
   *   to move the date forward leaves the task untouched instead of looping.
   * - No-op passes (nothing due) don't write state or storage.
   */
  processRepeatingTasks: () => {
    const today = startOfDay(new Date());
    let changed = false;

    const tasks = get().tasks.map((task) => {
      if (
        !task.completed ||
        task.repeatSpawnedId || // Completing it already created the next occurrence
        !task.repeat ||
        task.repeat === 'none' ||
        !task.dueDate ||
        startOfDay(task.dueDate) >= today
      ) {
        return task;
      }

      const nextDueDate = computeNextDueDate({ ...task, repeatAnchor: 'due' });
      if (nextDueDate.getTime() <= new Date(task.dueDate).getTime()) {
        return task; // Rule can't advance the date; leave the task as it is
      }

      changed = true;
      return {
        ...task,
        completed: false,
        dueDate: nextDueDate,
        myDay: false, // Remove from My Day when rescheduled
        myDayDate: undefined,
        updatedAt: new Date(),
      };
    });

    if (!changed) return;
    set({ tasks });
    saveState();
  },

  rolloverMyDay: () => {
    const tasks = rollOverMyDay(get().tasks);
    if (tasks === get().tasks) return;
    set({ tasks });
    saveState();
  },

  /**
   * Apply a new order for the tasks of a list.
   *
   * Robustness / pitfalls guarded against:
   * - Partial id lists (e.g. only the tasks visible under a search filter): hidden tasks keep
   *   their slots and the visible ones are re-ordered within the slots visible tasks occupied,
   *   so orders never collide and hidden tasks are not shuffled.
   * - Unknown or duplicate ids are ignored.
   * - Orders are rewritten as a clean 0..n-1 sequence for the list.
   */
  reorderTasks: (taskIds: string[], listId: string) => {
    const listTasks = get().tasks
      .filter((task) => task.listId === listId)
      .sort((a, b) => a.order - b.order);
    const listTaskIds = new Set(listTasks.map((task) => task.id));
    const queue = Array.from(new Set(taskIds)).filter((id) => listTaskIds.has(id));
    const reorderedIds = new Set(queue);

    let next = 0;
    const finalOrder = listTasks.map((task) => (reorderedIds.has(task.id) ? queue[next++] : task.id));
    const newOrderById = new Map(finalOrder.map((id, index) => [id, index]));

    set((state) => ({
      tasks: state.tasks.map((task) => {
        const newOrder = newOrderById.get(task.id);
        return task.listId === listId && newOrder !== undefined && newOrder !== task.order
          ? { ...task, order: newOrder, updatedAt: new Date() }
          : task;
      }),
    }));
    saveState();
  },
});
