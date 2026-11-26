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
  await vi.advanceTimersByTimeAsync(1000);
  return useTaskStore;
}

describe('reorderLists', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  const names = (store: Awaited<ReturnType<typeof freshStore>>, groupId: string | null) =>
    store.getState().getGroupedLists().find((section) => (section.group?.id ?? null) === groupId)?.lists.map((list) => list.name);

  it('reorders lists that are not in a group', async () => {
    const store = await freshStore();
    store.getState().addList('Work');
    store.getState().addList('Home');
    const [work, home] = ['Work', 'Home'].map((name) => store.getState().lists.find((list) => list.name === name)!);
    expect(names(store, null)).toEqual(['Work', 'Home']);

    store.getState().reorderLists(null, [home.id, work.id]);

    expect(names(store, null)).toEqual(['Home', 'Work']);
  });

  it('leaves system lists and other groups alone', async () => {
    const store = await freshStore();
    store.getState().addGroup('Projects');
    const group = store.getState().listGroups[0];
    store.getState().addList('Work');
    store.getState().addList('Home');
    store.getState().addList('Plans', undefined, undefined, group.id);
    const before = store.getState().lists.map((list): [string, number] => [list.id, list.order]);
    const [work, home] = ['Work', 'Home'].map((name) => store.getState().lists.find((list) => list.name === name)!);

    store.getState().reorderLists(null, [home.id, work.id]);

    const after = new Map(store.getState().lists.map((list) => [list.id, list.order]));
    for (const [id, order] of before) {
      if (id !== work.id && id !== home.id) expect(after.get(id)).toBe(order);
    }
  });

  it('ignores an id that is not in the group', async () => {
    const store = await freshStore();
    store.getState().addList('Work');
    const work = store.getState().lists.find((list) => list.name === 'Work')!;
    const order = work.order;

    store.getState().reorderLists(null, ['does-not-exist']);

    expect(store.getState().lists.find((list) => list.id === work.id)!.order).toBe(order);
  });
});
