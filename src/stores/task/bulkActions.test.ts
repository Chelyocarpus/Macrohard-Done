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

describe('bulk task actions', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  async function setup() {
    const { store, toasts } = await freshStore();
    const s = () => store.getState();
    s().addList('Work', '#2563eb');
    s().addList('Home', '#16a34a');
    const work = s().lists.find((l) => l.name === 'Work')!;
    const home = s().lists.find((l) => l.name === 'Home')!;
    const tag = s().addCategory('urgent');
    s().addTask('A', work.id);
    s().addTask('B', work.id);
    s().addTask('C', work.id);
    s().addTask('Elsewhere', home.id);
    toasts.getState().clearAllToasts();
    const task = (title: string) => s().tasks.find((t) => t.title === title)!;
    const undo = () => {
      const latest = [...toasts.getState().toasts].reverse().find((t) => t.action?.label === 'Undo');
      latest?.action?.onClick();
      return !!latest;
    };
    return { s, toasts, work, home, tag, task, undo };
  }

  describe('updateManyTasks', () => {
    it('changes only the tasks that differ and says how many that was', async () => {
      const { s, toasts, task } = await setup();
      s().toggleImportant(task('A').id);
      toasts.getState().clearAllToasts();

      const changed = s().updateManyTasks([task('A').id, task('B').id, task('C').id], { important: true });

      expect(changed).toBe(2); // A already was
      expect(['A', 'B', 'C'].every((title) => task(title).important)).toBe(true);
      expect(toasts.getState().toasts).toHaveLength(1);
      expect(toasts.getState().toasts[0].title).toBe('Marked 2 tasks important');
    });

    it('writes nothing and shows no message when nothing would change', async () => {
      const { s, toasts, task } = await setup();
      const before = s().tasks;
      expect(s().updateManyTasks([task('A').id], { important: false })).toBe(0);
      expect(s().tasks).toBe(before);
      expect(toasts.getState().toasts).toHaveLength(0);
    });

    it('ignores ids that no longer exist and repeated ids', async () => {
      const { s, task } = await setup();
      const id = task('A').id;
      expect(s().updateManyTasks(['gone', id, id], { myDay: true })).toBe(1);
      expect(task('A').myDay).toBe(true);
      expect(task('A').myDayDate).toBeTruthy();
      expect(s().updateManyTasks([], { myDay: true })).toBe(0);
    });

    it('undoes everything with one click, and only once', async () => {
      const { s, toasts, task, undo } = await setup();
      s().updateManyTasks([task('A').id, task('B').id], { important: true });
      expect(undo()).toBe(true);
      expect(task('A').important).toBe(false);
      expect(task('B').important).toBe(false);
      expect(toasts.getState().toasts).toHaveLength(0);
      expect(undo()).toBe(false); // the message is gone
    });

    it('does not undo over a task that was edited after the change', async () => {
      const { s, toasts, task, undo } = await setup();
      s().updateManyTasks([task('A').id, task('B').id], { important: true });
      await vi.advanceTimersByTimeAsync(50);
      s().updateTask(task('B').id, { title: 'B renamed' });
      expect(undo()).toBe(true);
      expect(task('A').important).toBe(false);
      const edited = s().tasks.find((t) => t.title === 'B renamed')!;
      expect(edited.important).toBe(true); // left as the person edited it
      expect(toasts.getState().toasts.some((t) => t.title === 'Some tasks were not restored')).toBe(true);
    });

    it('moves tasks to the end of another list in the order given, without order collisions', async () => {
      const { s, home, task } = await setup();
      const homeOrderBefore = task('Elsewhere').order;
      expect(s().updateManyTasks([task('C').id, task('A').id], { listId: home.id })).toBe(2);
      expect(task('C').listId).toBe(home.id);
      expect(task('A').listId).toBe(home.id);
      expect(task('C').order).toBe(homeOrderBefore + 1);
      expect(task('A').order).toBe(homeOrderBefore + 2);
      expect(task('B').listId).not.toBe(home.id);
    });

    it('moves to the default Tasks list, and skips tasks already there', async () => {
      const { s, task } = await setup();
      expect(s().updateManyTasks([task('A').id, task('B').id], { listId: 'all' })).toBe(2);
      expect(s().updateManyTasks([task('A').id, task('B').id], { listId: 'all' })).toBe(0);
    });

    it('refuses a list that does not exist and changes nothing', async () => {
      const { s, toasts, task } = await setup();
      const before = s().tasks;
      expect(s().updateManyTasks([task('A').id], { listId: 'deleted-list' })).toBe(0);
      expect(s().tasks).toBe(before);
      expect(toasts.getState().toasts[0].variant).toBe('error');
    });

    it('refuses a smart view as a place to move to', async () => {
      const { s, task } = await setup();
      expect(s().updateManyTasks([task('A').id], { listId: 'my-day' })).toBe(0);
    });

    it('adds and removes a tag without duplicates', async () => {
      const { s, tag, task } = await setup();
      s().assignTaskToCategory(task('A').id, tag.id);
      expect(s().updateManyTasks([task('A').id, task('B').id], { addTagIds: [tag.id] })).toBe(1); // A has it already
      expect(task('B').categoryIds).toEqual([tag.id]);
      expect(task('A').categoryIds).toEqual([tag.id]);
      expect(s().updateManyTasks([task('A').id, task('B').id, task('C').id], { removeTagIds: [tag.id] })).toBe(2);
      expect(task('A').categoryIds).toEqual([]);
    });

    it('sets and clears the due date as a calendar day', async () => {
      const { s, task } = await setup();
      const ids = [task('A').id, task('B').id];
      expect(s().updateManyTasks(ids, { dueDate: new Date(2026, 11, 3, 15, 30) })).toBe(2);
      expect(new Date(task('A').dueDate!).getTime()).toBe(new Date(2026, 11, 3).getTime());
      expect(s().updateManyTasks(ids, { dueDate: new Date(2026, 11, 3, 8) })).toBe(0); // same day
      expect(s().updateManyTasks(ids, { dueDate: null })).toBe(2);
      expect(task('A').dueDate).toBeUndefined();
    });

    it('changes at most 1000 tasks in one go', async () => {
      const { s } = await setup();
      const many = Array.from({ length: 1005 }, (_, i) => ({ ...s().tasks[0], id: `bulk-${i}`, title: `T${i}`, important: false }));
      (await import('../taskStore.ts')).useTaskStore.setState({ tasks: many });
      expect(s().updateManyTasks(many.map((t) => t.id), { important: true })).toBe(1000);
      expect(s().tasks.filter((t) => t.important)).toHaveLength(1000);
    });
  });

  describe('completeManyTasks', () => {
    it('completes the open ones and counts only those', async () => {
      const { s, toasts, task } = await setup();
      s().toggleTask(task('A').id);
      toasts.getState().clearAllToasts();
      expect(s().completeManyTasks([task('A').id, task('B').id, task('C').id], true)).toBe(2);
      expect(['A', 'B', 'C'].every((title) => task(title).completed)).toBe(true);
      expect(toasts.getState().toasts).toHaveLength(1);
      expect(toasts.getState().toasts[0].title).toBe('2 tasks completed');
    });

    it('reopens them, and undo of that puts them back as they were', async () => {
      const { s, task, undo } = await setup();
      s().completeManyTasks([task('A').id, task('B').id], true);
      expect(s().completeManyTasks([task('A').id, task('B').id], false)).toBe(2);
      expect(task('A').completed).toBe(false);
      expect(undo()).toBe(true);
      expect(task('A').completed).toBe(true);
    });

    it('gives a repeating task its next occurrence, and undo removes it while it is still open', async () => {
      const { s, task, undo } = await setup();
      const daily = task('A').id;
      s().updateTask(daily, { repeat: 'daily', dueDate: new Date(2026, 10, 25) });
      const countBefore = s().tasks.length;

      s().completeManyTasks([daily, task('B').id], true);
      expect(s().tasks).toHaveLength(countBefore + 1);
      const next = s().tasks.find((t) => t.title === 'A' && !t.completed)!;
      expect(next).toBeDefined();
      expect(next.id).not.toBe(daily);

      expect(undo()).toBe(true);
      expect(s().tasks).toHaveLength(countBefore);
      expect(task('A').completed).toBe(false);
    });

    it('keeps an occurrence that was completed meanwhile when undoing', async () => {
      const { s, toasts, task } = await setup();
      s().updateTask(task('A').id, { repeat: 'daily', dueDate: new Date(2026, 10, 25) });
      s().completeManyTasks([task('A').id], true);
      const bulkUndo = toasts.getState().toasts[toasts.getState().toasts.length - 1].action!;
      const next = s().tasks.find((t) => t.title === 'A' && !t.completed)!;
      s().toggleTask(next.id);
      bulkUndo.onClick();
      expect(s().tasks.some((t) => t.id === next.id && t.completed)).toBe(true);
    });

    it('does nothing for stale ids', async () => {
      const { s, toasts } = await setup();
      expect(s().completeManyTasks(['gone'], true)).toBe(0);
      expect(toasts.getState().toasts).toHaveLength(0);
    });
  });

  describe('deleteManyTasks', () => {
    it('deletes them with one Undo message that puts them back', async () => {
      const { s, toasts, task, undo } = await setup();
      const ids = [task('A').id, task('C').id];
      expect(s().deleteManyTasks(ids)).toBe(2);
      expect(s().tasks.map((t) => t.title).sort()).toEqual(['B', 'Elsewhere']);
      expect(toasts.getState().toasts).toHaveLength(1);
      expect(toasts.getState().toasts[0].title).toBe('2 tasks deleted');

      expect(undo()).toBe(true);
      expect(s().tasks.map((t) => t.title).sort()).toEqual(['A', 'B', 'C', 'Elsewhere']);
    });

    it('never puts a task back twice', async () => {
      const { s, toasts, task } = await setup();
      s().deleteManyTasks([task('A').id]);
      const action = toasts.getState().toasts[0].action!;
      s().addTask('A again', 'all');
      // the real button runs once; call the stored handler twice to be sure the content is not duplicated either way
      action.onClick();
      action.onClick();
      expect(s().tasks.filter((t) => t.title === 'A')).toHaveLength(1);
    });

    it('sends a task to Tasks when its list was deleted before the Undo', async () => {
      const { s, toasts, work, task } = await setup();
      s().deleteManyTasks([task('A').id, task('B').id]);
      const bulkUndo = toasts.getState().toasts[0].action!;
      s().deleteList(work.id);
      bulkUndo.onClick();
      const back = s().tasks.filter((t) => t.title === 'A' || t.title === 'B');
      expect(back).toHaveLength(2);
      expect(back.every((t) => t.listId === 'all')).toBe(true);
    });

    it('ignores stale ids and says nothing', async () => {
      const { s, toasts } = await setup();
      expect(s().deleteManyTasks(['gone', 'also-gone'])).toBe(0);
      expect(toasts.getState().toasts).toHaveLength(0);
    });
  });
});
