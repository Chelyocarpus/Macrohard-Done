import type { TaskList, ListGroup, Task } from '../../types/index.ts';
import { generateId } from '../../utils/storage.ts';
import { useToastStore } from '../toastStore.ts';
import type { StoreContext, TaskStore } from './types.ts';

/** List and list-group actions: creating, editing, ordering and moving lists and groups, and reading them back. */
export const createListActions = ({ set, get, saveState }: StoreContext): Pick<TaskStore, 'addList' | 'updateList' | 'deleteList' | 'duplicateList' | 'reorderLists' | 'moveListToGroup' | 'insertListAtPosition' | 'moveListToPosition' | 'addGroup' | 'updateGroup' | 'deleteGroup' | 'reorderGroups' | 'toggleGroupCollapsed' | 'getListsInGroup' | 'getGroupedLists' | 'getGroupForList'> => ({
  addList: (name: string, color?: string, emoji?: string, groupId?: string | null) => {
    const newList: TaskList = {
      id: generateId(),
      name,
      emoji,
      color,
      isSystem: false,
      taskCount: 0,
      groupId,
      order: get().lists.filter(l => l.groupId === groupId).length,
      createdAt: new Date(),
    };

    set((state) => ({
      lists: [...state.lists, newList],
    }));
    saveState();
    
    // Show success toast
    useToastStore.getState().showSuccess('List created', `"${name}" list was created successfully`);
  },

  updateList: (id: string, updates: Partial<TaskList>) => {
    set((state) => ({
      lists: state.lists.map((list) =>
        list.id === id ? { ...list, ...updates } : list
      ),
    }));
    saveState();
  },

  /**
   * Removes a list with its tasks and offers "Undo".
   *
   * Robustness / pitfalls guarded against:
   * - Undo after the list's group was deleted meanwhile: the list comes back ungrouped.
   * - Undo pressed twice, or the list already back: nothing is added twice.
   * - Tasks that are already present (same id) are not duplicated.
   * - System lists and unknown ids are never removed.
   */
  deleteList: (id: string) => {
    const list = get().lists.find(l => l.id === id);
    if (!list || list.isSystem) return;
    const tasksInList = get().tasks.filter(task => task.listId === id);

    set((state) => ({
      lists: state.lists.filter((l) => l.id !== id),
      tasks: state.tasks.filter((task) => task.listId !== id),
    }));
    saveState();

    const taskCount = tasksInList.length;
    const description = taskCount > 0
      ? `"${list.name}" and ${taskCount} task${taskCount > 1 ? 's' : ''} were removed`
      : `"${list.name}" was removed`;
    useToastStore.getState().showUndo('List deleted', description, () => {
      if (get().lists.some((l) => l.id === list.id)) return;
      const groupStillExists = !list.groupId || get().listGroups.some((g) => g.id === list.groupId);
      const existingTaskIds = new Set(get().tasks.map((t) => t.id));
      set((state) => ({
        lists: [...state.lists, groupStillExists ? list : { ...list, groupId: null }],
        tasks: [...state.tasks, ...tasksInList.filter((t) => !existingTaskIds.has(t.id))],
      }));
      saveState();
    }, 10000);
  },

  /**
   * Copies a list with all its tasks and puts the copy right after the original, then offers "Undo".
   *
   * Robustness / pitfalls guarded against:
   * - Unknown id or a built-in list (My Day, Tasks, ...): nothing is copied and null is returned.
   * - The copy shares nothing with the original: new ids for the list, its tasks and their steps, and fresh arrays
   *   and dates, so editing one never changes the other.
   * - Everything is worked out inside one state update from the state at that moment, so a change made at the same
   *   time (a task added, a list moved) cannot leave the copy half-made or the orders clashing.
   * - Tasks that would show up twice are left out of the copy: My Day membership is not copied, and a finished
   *   repeating task does not point at the original's next occurrence.
   * - The name is made unique ("Groceries copy", "Groceries copy 2", ...) so copies can be told apart.
   * - Undo after the copy was already removed, or pressed twice: nothing happens the second time; and only
   *   the copy's own tasks are removed, never anything else.
   */
  duplicateList: (id: string) => {
    if (!get().lists.some((l) => l.id === id && !l.isSystem)) return null;

    const newListId = generateId();
    let copiedName = '';
    let copiedTaskIds: string[] = [];

    set((state) => {
      const original = state.lists.find((l) => l.id === id);
      if (!original || original.isSystem) return {};

      const taken = new Set(state.lists.map((l) => l.name));
      copiedName = `${original.name} copy`;
      for (let n = 2; taken.has(copiedName); n++) copiedName = `${original.name} copy ${n}`;

      const copiedTasks: Task[] = state.tasks
        .filter((task) => task.listId === id)
        .map((task) => ({
          ...task,
          id: generateId(),
          listId: newListId,
          myDay: false,
          myDayDate: undefined,
          repeatSpawnedId: undefined,
          repeatDays: task.repeatDays ? [...task.repeatDays] : undefined,
          categoryIds: [...task.categoryIds],
          steps: task.steps.map((step) => ({ ...step, id: generateId(), createdAt: new Date(step.createdAt) })),
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          reminder: task.reminder ? new Date(task.reminder) : undefined,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
        }));
      copiedTaskIds = copiedTasks.map((task) => task.id);

      // Right after the original; the lists after it in the same group move down one place
      const copy: TaskList = { ...original, id: newListId, name: copiedName, order: original.order + 1, createdAt: new Date() };
      const shifted = state.lists.map((list) =>
        !list.isSystem && list.groupId === original.groupId && list.order > original.order
          ? { ...list, order: list.order + 1 }
          : list
      );

      return { lists: [...shifted, copy], tasks: [...state.tasks, ...copiedTasks] };
    });

    // Nothing was made (the list vanished between the check and the update)
    if (!copiedName) return null;
    saveState();

    const count = copiedTaskIds.length;
    const description = count > 0
      ? `"${copiedName}" was made with ${count} task${count > 1 ? 's' : ''}`
      : `"${copiedName}" was made`;
    useToastStore.getState().showUndo('List duplicated', description, () => {
      if (!get().lists.some((l) => l.id === newListId)) return;
      const copiedIds = new Set(copiedTaskIds);
      set((state) => ({
        lists: state.lists.filter((l) => l.id !== newListId),
        tasks: state.tasks.filter((task) => task.listId !== newListId || !copiedIds.has(task.id)),
      }));
      saveState();
    }, 10000);

    return newListId;
  },

  reorderLists: (groupId: string | null, listIds: string[]) => {
    set((state) => ({
      lists: state.lists.map((list) => {
        if (list.groupId === groupId) {
          const newOrder = listIds.indexOf(list.id);
          return newOrder >= 0 ? { ...list, order: newOrder } : list;
        }
        return list;
      }),
    }));
    saveState();
  },

  moveListToGroup: (listId: string, groupId: string | null) => {
    set((state) => {
      const targetLists = state.lists.filter(l => l.groupId === groupId);
      const newOrder = targetLists.length;
      
      return {
        lists: state.lists.map((list) =>
          list.id === listId ? { ...list, groupId, order: newOrder } : list
        ),
      };
    });
    saveState();
  },

  insertListAtPosition: (listId: string, targetGroupId: string | null, position: number) => {
    set((state) => {
      // First handle the basic move and position shifts
      const updatedLists = state.lists.map((list) => {
        // Handle the list being moved
        if (list.id === listId) {
          return { ...list, groupId: targetGroupId, order: position };
        }
        
        // Handle other lists in the target group that need their positions adjusted
        if (list.groupId === targetGroupId && !list.isSystem && list.id !== listId && list.order >= position) {
          return { ...list, order: list.order + 1 };
        }
        
        // Leave other lists unchanged
        return list;
      });

      // Now normalize order values within each group to avoid gaps
      const groupMap = new Map<string | null, TaskList[]>();
      
      // Group lists by their groupId
      updatedLists.forEach(list => {
        const groupKey = list.groupId || 'null';
        if (!groupMap.has(groupKey)) {
          groupMap.set(groupKey, []);
        }
        groupMap.get(groupKey)?.push(list);
      });
      
      // Sort and normalize order values within each group
      const normalizedLists: TaskList[] = [];
      groupMap.forEach((groupLists) => {
        const sortedLists = [...groupLists].sort((a, b) => a.order - b.order);
        sortedLists.forEach((list, index) => {
          normalizedLists.push({ ...list, order: index });
        });
      });

      return { lists: normalizedLists };
    });
    saveState();
  },

  moveListToPosition: (listId: string, targetGroupId: string | null, beforeListId?: string, afterListId?: string) => {
    set((state) => {
      const targetLists = state.lists
        .filter(l => !l.isSystem && l.groupId === targetGroupId)
        .sort((a, b) => a.order - b.order);

      let newPosition = 0;

      if (beforeListId) {
        const beforeList = targetLists.find(l => l.id === beforeListId);
        newPosition = beforeList ? beforeList.order : 0;
      } else if (afterListId) {
        const afterList = targetLists.find(l => l.id === afterListId);
        newPosition = afterList ? afterList.order + 1 : targetLists.length;
      } else {
        // Insert at the end
        newPosition = targetLists.length;
      }

      // Remove the dragged list from its current position
      const filteredLists = state.lists.filter(l => l.id !== listId);
      
      // Adjust orders for existing lists in the target group
      const updatedLists = filteredLists.map((list) => {
        if (list.groupId === targetGroupId && !list.isSystem) {
          if (list.order >= newPosition) {
            return { ...list, order: list.order + 1 };
          }
        }
        return list;
      });

      // Find the original list and update it
      const originalList = state.lists.find(l => l.id === listId);
      if (originalList) {
        updatedLists.push({
          ...originalList,
          groupId: targetGroupId,
          order: newPosition
        });
      }

      return { lists: updatedLists };
    });
    saveState();
  },

  addGroup: (name: string, color?: string, emoji?: string, overrideListIcons?: boolean) => {
    const newGroup: ListGroup = {
      id: generateId(),
      name,
      emoji,
      color,
      collapsed: false,
      order: get().listGroups.length,
      overrideListIcons: overrideListIcons || false,
      createdAt: new Date(),
    };

    set((state) => ({
      listGroups: [...state.listGroups, newGroup],
    }));
    saveState();
    
    // Show success toast
    useToastStore.getState().showSuccess('Group created', `"${name}" group was created successfully`);
  },

  updateGroup: (id: string, updates: Partial<ListGroup>) => {
    set((state) => ({
      listGroups: state.listGroups.map((group) =>
        group.id === id ? { ...group, ...updates } : group
      ),
    }));
    saveState();
  },

  deleteGroup: (id: string, moveListsToGroupId?: string | null) => {
    const group = get().listGroups.find(g => g.id === id);
    const groupName = group?.name || 'Group';
    const listsInGroup = get().lists.filter(list => list.groupId === id);
    
    set((state) => ({
      listGroups: state.listGroups.filter((group) => group.id !== id),
      lists: state.lists.map((list) =>
        list.groupId === id ? { ...list, groupId: moveListsToGroupId || null } : list
      ),
    }));
    saveState();
    
    // Show info toast
    const listCount = listsInGroup.length;
    if (listCount > 0) {
      useToastStore.getState().showInfo(
        'Group deleted', 
        `"${groupName}" was removed. ${listCount} list${listCount > 1 ? 's' : ''} moved`
      );
    } else {
      useToastStore.getState().showInfo('Group deleted', `"${groupName}" was removed`);
    }
  },

  reorderGroups: (groupIds: string[]) => {
    set((state) => ({
      listGroups: state.listGroups.map((group) => {
        const newOrder = groupIds.indexOf(group.id);
        return newOrder >= 0 ? { ...group, order: newOrder } : group;
      }),
    }));
    saveState();
  },

  toggleGroupCollapsed: (id: string) => {
    set((state) => ({
      listGroups: state.listGroups.map((group) =>
        group.id === id ? { ...group, collapsed: !group.collapsed } : group
      ),
    }));
    saveState();
  },

  getListsInGroup: (groupId: string | null) => {
    const { lists } = get();
    return lists
      .filter((list) => !list.isSystem && list.groupId === groupId)
      .sort((a, b) => a.order - b.order);
  },

  getGroupedLists: () => {
    const { lists, listGroups } = get();
    const customLists = lists.filter(list => !list.isSystem);
    const sortedGroups = [...listGroups].sort((a, b) => a.order - b.order);
    const ungroupedLists = customLists
      .filter((list) => !list.groupId)
      .sort((a, b) => a.order - b.order);

    const result: { group: ListGroup | null; lists: TaskList[] }[] = [];

    // Add ungrouped lists first
    if (ungroupedLists.length > 0) {
      result.push({ group: null, lists: ungroupedLists });
    }

    // Add grouped lists
    sortedGroups.forEach((group) => {
      const groupLists = customLists
        .filter((list) => list.groupId === group.id)
        .sort((a, b) => a.order - b.order);
      result.push({ group, lists: groupLists });
    });

    return result;
  },

  getGroupForList: (listId: string) => {
    const { lists, listGroups } = get();
    const list = lists.find(l => l.id === listId);
    if (!list || !list.groupId) return null;
    return listGroups.find(g => g.id === list.groupId) || null;
  },
});
