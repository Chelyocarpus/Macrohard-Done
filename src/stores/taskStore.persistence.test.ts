import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The store reads localStorage when it loads, so every test builds a fresh store on top of a fake one.
function makeFakeStorage() {
  const data = new Map<string, string>();
  const writes: string[] = [];
  const storage = {
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => { writes.push(key); data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
    clear: () => data.clear(),
    key: () => null,
    length: 0,
  };
  return { storage, data, writes };
}

async function freshStore() {
  vi.resetModules();
  const fake = makeFakeStorage();
  vi.stubGlobal('localStorage', fake.storage);
  const { useTaskStore } = await import('./taskStore.ts');
  const { STORAGE_KEY, PREVIOUS_DATA_KEY } = await import('../utils/storage.ts');
  // Let the start-up pass (repeating tasks) run, then forget what it wrote
  await vi.advanceTimersByTimeAsync(1000);
  fake.writes.length = 0;
  return { useTaskStore, STORAGE_KEY, PREVIOUS_DATA_KEY, ...fake };
}

const emptyBackup = {
  tasks: [], lists: [], listGroups: [], categories: [], customTimePresets: [], disabledBuiltInPresets: [],
};

describe('task store saving', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('turns a burst of changes into one write that holds all of them', async () => {
    const { useTaskStore, STORAGE_KEY, data, writes } = await freshStore();
    for (let i = 0; i < 10; i++) useTaskStore.getState().addTask(`Task ${i}`);
    expect(writes).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(400);

    expect(writes.filter((key) => key === STORAGE_KEY)).toHaveLength(1);
    expect(JSON.parse(data.get(STORAGE_KEY)!).tasks).toHaveLength(10);
  });

  it('flushPendingSave writes at once', async () => {
    const { useTaskStore, STORAGE_KEY, data } = await freshStore();
    useTaskStore.getState().addTask('Buy milk');
    expect(data.has(STORAGE_KEY)).toBe(false);

    useTaskStore.getState().flushPendingSave();

    expect(JSON.parse(data.get(STORAGE_KEY)!).tasks[0].title).toBe('Buy milk');
  });

  it('puts the latest edits into the "undo import" copy', async () => {
    const { useTaskStore, STORAGE_KEY, PREVIOUS_DATA_KEY, data } = await freshStore();
    useTaskStore.getState().addTask('Typed a moment before importing');

    const result = useTaskStore.getState().importBackup(emptyBackup);

    expect(result.status).toBe('ok');
    expect(JSON.parse(data.get(PREVIOUS_DATA_KEY)!).tasks[0].title).toBe('Typed a moment before importing');
    expect(JSON.parse(data.get(STORAGE_KEY)!).tasks).toHaveLength(0);
    // and the waiting save does not bring the old task back
    await vi.advanceTimersByTimeAsync(1000);
    expect(JSON.parse(data.get(STORAGE_KEY)!).tasks).toHaveLength(0);
  });

  it('does not write old data back after "remove all data"', async () => {
    const { useTaskStore, STORAGE_KEY, data } = await freshStore();
    useTaskStore.getState().flushPendingSave();
    useTaskStore.getState().addTask('Waiting to be saved');

    const result = useTaskStore.getState().removeAllData();
    await vi.advanceTimersByTimeAsync(5000);
    useTaskStore.getState().addTask('Added after the removal');
    await vi.advanceTimersByTimeAsync(5000);

    expect(result.status).toBe('ok');
    expect(data.has(STORAGE_KEY)).toBe(false);
  });

  it('does not write over the restored data after "undo import"', async () => {
    const { useTaskStore, STORAGE_KEY, data } = await freshStore();
    useTaskStore.getState().addTask('Original');
    useTaskStore.getState().importBackup(emptyBackup); // flushes "Original" into the undo copy
    useTaskStore.getState().addTask('Added after the import'); // a save is now waiting

    const result = useTaskStore.getState().restorePreviousData();
    await vi.advanceTimersByTimeAsync(5000);

    expect(result.status).toBe('ok');
    const titles = JSON.parse(data.get(STORAGE_KEY)!).tasks.map((t: { title: string }) => t.title);
    expect(titles).toEqual(['Original']);
  });

  it('keeps saving after a failed write', async () => {
    const { useTaskStore, STORAGE_KEY, data, storage } = await freshStore();
    const realSet = storage.setItem;
    storage.setItem = () => { throw new Error('quota'); };
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    useTaskStore.getState().addTask('First');
    await vi.advanceTimersByTimeAsync(400);
    storage.setItem = realSet;
    quiet.mockRestore();

    useTaskStore.getState().addTask('Second');
    await vi.advanceTimersByTimeAsync(400);

    expect(JSON.parse(data.get(STORAGE_KEY)!).tasks).toHaveLength(2);
  });
});
