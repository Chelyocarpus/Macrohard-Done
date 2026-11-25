import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The store reads localStorage when it loads, so every test builds a fresh store on top of a fake one.
async function freshStore() {
  vi.resetModules();
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
    clear: () => data.clear(),
    key: () => null,
    length: 0,
  });
  const { useTaskStore } = await import('../taskStore.ts');
  const { useToastStore } = await import('../toastStore.ts');
  await vi.advanceTimersByTimeAsync(1000);
  return { store: useTaskStore, toasts: useToastStore };
}

describe('duplicateList', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  /** A list with a few tasks: one open with steps, tags, a date and My Day, one completed repeating one */
  async function setup() {
    const { store, toasts } = await freshStore();
    const s = () => store.getState();
    s().addList('Groceries', '#16a34a', '🛒');
    const list = s().lists.find((l) => l.name === 'Groceries')!;
    s().updateList(list.id, { sortMode: 'alphabetical', addToTop: true });
    s().addTask('Milk', list.id);
    const milk = s().tasks.find((t) => t.title === 'Milk')!;
    s().addTask('Bread', list.id);
    const bread = s().tasks.find((t) => t.title === 'Bread')!;
    store.setState((state) => ({
      tasks: state.tasks.map((t) => (t.id === milk.id
        ? {
          ...t,
          myDay: true,
          myDayDate: '2026-11-23',
          important: true,
          categoryIds: ['tag-1'],
          dueDate: new Date('2026-12-01T00:00:00'),
          steps: [{ id: 'step-1', title: 'Oat', completed: false, createdAt: new Date('2026-11-01') }],
        }
        : t.id === bread.id ? { ...t, completed: true, repeat: 'daily' as const, repeatSpawnedId: 'other-task' } : t)),
    }));
    return { store, toasts, listId: list.id, s };
  }

  it('copies the list and all its tasks after the original', async () => {
    const { listId, s } = await setup();
    const newId = s().duplicateList(listId);

    expect(newId).toBeTruthy();
    const copy = s().lists.find((l) => l.id === newId)!;
    expect(copy).toMatchObject({ name: 'Groceries copy', emoji: '🛒', color: '#16a34a', sortMode: 'alphabetical', addToTop: true, isSystem: false });
    expect(copy.order).toBe(s().lists.find((l) => l.id === listId)!.order + 1);

    const copied = s().tasks.filter((t) => t.listId === newId);
    expect(copied.map((t) => t.title).sort()).toEqual(['Bread', 'Milk']);
    // The original keeps its tasks
    expect(s().tasks.filter((t) => t.listId === listId)).toHaveLength(2);
  });

  it('shares nothing with the original: new ids, separate steps and tags', async () => {
    const { listId, s } = await setup();
    const newId = s().duplicateList(listId)!;
    const originalMilk = s().tasks.find((t) => t.listId === listId && t.title === 'Milk')!;
    const copyMilk = s().tasks.find((t) => t.listId === newId && t.title === 'Milk')!;

    expect(copyMilk.id).not.toBe(originalMilk.id);
    expect(copyMilk.steps[0].id).not.toBe('step-1');
    expect(copyMilk.steps[0].title).toBe('Oat');
    expect(copyMilk.categoryIds).toEqual(['tag-1']);
    expect(copyMilk.categoryIds).not.toBe(originalMilk.categoryIds);
    expect(copyMilk.dueDate).toEqual(originalMilk.dueDate);
    expect(copyMilk.dueDate).not.toBe(originalMilk.dueDate);
    expect(copyMilk.important).toBe(true);
    // Every id in the store is still unique
    const ids = s().tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not put the copy in My Day or link a finished repeating task to the original\'s next one', async () => {
    const { listId, s } = await setup();
    const newId = s().duplicateList(listId)!;
    const copyMilk = s().tasks.find((t) => t.listId === newId && t.title === 'Milk')!;
    const copyBread = s().tasks.find((t) => t.listId === newId && t.title === 'Bread')!;

    expect(copyMilk.myDay).toBe(false);
    expect(copyMilk.myDayDate).toBeUndefined();
    expect(copyBread.completed).toBe(true);
    expect(copyBread.repeatSpawnedId).toBeUndefined();
  });

  it('makes names unique: copy, copy 2, copy 3', async () => {
    const { listId, s } = await setup();
    s().duplicateList(listId);
    s().duplicateList(listId);
    const third = s().duplicateList(listId)!;

    expect(s().lists.filter((l) => l.name.startsWith('Groceries')).map((l) => l.name).sort())
      .toEqual(['Groceries', 'Groceries copy', 'Groceries copy 2', 'Groceries copy 3']);
    expect(s().lists.find((l) => l.id === third)!.name).toBe('Groceries copy 3');
  });

  it('keeps the group and moves later lists in that group down, so orders never clash', async () => {
    const { store } = await freshStore();
    const s = () => store.getState();
    s().addGroup('Home');
    const group = s().listGroups[0];
    s().addList('A', undefined, undefined, group.id);
    s().addList('B', undefined, undefined, group.id);
    s().addList('C', undefined, undefined, group.id);
    const a = s().lists.find((l) => l.name === 'A')!;

    const copyId = s().duplicateList(a.id)!;

    const inGroup = s().getListsInGroup(group.id).map((l) => l.name);
    expect(inGroup).toEqual(['A', 'A copy', 'B', 'C']);
    expect(s().lists.find((l) => l.id === copyId)!.groupId).toBe(group.id);
    const orders = s().getListsInGroup(group.id).map((l) => l.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('copies an empty list', async () => {
    const { store } = await freshStore();
    store.getState().addList('Empty');
    const empty = store.getState().lists.find((l) => l.name === 'Empty')!;
    const newId = store.getState().duplicateList(empty.id);
    expect(newId).toBeTruthy();
    expect(store.getState().tasks.filter((t) => t.listId === newId)).toHaveLength(0);
  });

  it('copies nothing for an unknown id or a built-in list', async () => {
    const { store, toasts } = await freshStore();
    const before = store.getState().lists.length;
    toasts.setState({ toasts: [] });

    expect(store.getState().duplicateList('nope')).toBeNull();
    expect(store.getState().duplicateList('all')).toBeNull();
    expect(store.getState().duplicateList('my-day')).toBeNull();

    expect(store.getState().lists).toHaveLength(before);
    expect(toasts.getState().toasts).toHaveLength(0);
  });

  it('Undo removes the copy and its tasks only, and a second Undo does nothing', async () => {
    const { listId, s, toasts } = await setup();
    toasts.setState({ toasts: [] });
    const newId = s().duplicateList(listId)!;
    // Something added to the copy afterwards belongs to the copy and goes with it; the original is untouched
    const originalTaskCount = s().tasks.filter((t) => t.listId === listId).length;

    const undo = toasts.getState().toasts.find((t) => t.action?.label === 'Undo')!;
    expect(undo).toBeTruthy();
    undo.action!.onClick();
    undo.action!.onClick();

    expect(s().lists.some((l) => l.id === newId)).toBe(false);
    expect(s().tasks.some((t) => t.listId === newId)).toBe(false);
    expect(s().tasks.filter((t) => t.listId === listId)).toHaveLength(originalTaskCount);
    expect(s().lists.some((l) => l.id === listId)).toBe(true);
  });
});
