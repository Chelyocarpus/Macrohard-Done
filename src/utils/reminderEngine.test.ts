import { describe, expect, it } from 'vitest';
import { MAX_DELIVERY_ATTEMPTS, parseLedger, type ReminderTask } from './reminders.ts';
import { createReminderEngine, messageFor, summaryMessage, type EngineDeps, type ReminderMessage } from './reminderEngine.ts';
import type { KeyValueStorage } from './profiles.ts';

const NOW = Date.parse('2026-11-25T16:00:00.000Z');
const MIN = 60_000;
const KEY = 'ledger';

class FakeStorage implements KeyValueStorage {
  data = new Map<string, string>();
  failWrites = false;
  /** Pretends to save, but keeps nothing (a browser that silently drops writes) */
  dropWrites = false;
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('quota exceeded');
    if (!this.dropWrites) this.data.set(key, value);
  }
  removeItem(key: string) { this.data.delete(key); }
  ledger() { return parseLedger(this.data.get(KEY) ?? null); }
}

const task = (id: string, minutesFromNow: number, extra: Partial<ReminderTask> = {}): ReminderTask => ({
  id,
  title: `Task ${id}`,
  completed: false,
  reminder: new Date(NOW + minutesFromNow * MIN),
  ...extra,
});

interface Setup {
  storage: FakeStorage;
  tasks: ReminderTask[];
  system: ReminderMessage[];
  inApp: ReminderMessage[];
  state: { front: boolean; systemOn: boolean; now: number; systemFails: boolean; inAppFails: boolean };
  deps: EngineDeps;
}

function setup(tasks: ReminderTask[], storage = new FakeStorage()): Setup {
  const system: ReminderMessage[] = [];
  const inApp: ReminderMessage[] = [];
  const state = { front: true, systemOn: false, now: NOW, systemFails: false, inAppFails: false };
  const s: Setup = {
    storage, tasks, system, inApp, state,
    deps: {
      now: () => state.now,
      getTasks: () => s.tasks,
      storage,
      ledgerKey: KEY,
      since: NOW - 7 * 24 * 60 * MIN,
      inFront: () => state.front,
      systemAlertsOn: () => state.systemOn,
      showSystem: async (message) => {
        if (state.systemFails) throw new Error('blocked');
        system.push(message);
      },
      showInApp: (message) => {
        if (state.inAppFails) throw new Error('toast failed');
        inApp.push(message);
      },
    },
  };
  return s;
}

describe('delivering a reminder', () => {
  it('shows it in the app when the app is in front, and only once', async () => {
    const s = setup([task('a', -1)]);
    const engine = createReminderEngine(s.deps);
    expect(await engine.tick()).toMatchObject({ delivered: 1, deferred: 0, failed: 0, saved: true });
    expect(await engine.tick()).toMatchObject({ delivered: 0 });
    expect(s.inApp).toHaveLength(1);
    expect(s.inApp[0]).toMatchObject({ title: 'Task a', taskId: 'a' });
    expect(s.system).toHaveLength(0);
    expect(s.storage.ledger()).toEqual({ a: NOW - MIN });
  });

  it('uses a system notification when the app is in the background and notifications are on', async () => {
    const s = setup([task('a', -1)]);
    s.state.front = false;
    s.state.systemOn = true;
    expect(await createReminderEngine(s.deps).tick()).toMatchObject({ delivered: 1 });
    expect(s.system).toHaveLength(1);
    expect(s.inApp).toHaveLength(0);
  });

  it('waits, without claiming anything, when the app is in the background and notifications are off, then delivers when it comes back', async () => {
    const s = setup([task('a', -1)]);
    s.state.front = false;
    const engine = createReminderEngine(s.deps);
    expect(await engine.tick()).toMatchObject({ delivered: 0, deferred: 1 });
    expect(s.storage.ledger()).toEqual({});
    s.state.front = true;
    expect(await engine.tick()).toMatchObject({ delivered: 1 });
    expect(s.inApp).toHaveLength(1);
  });

  it('says "Missed reminder" for one that is more than five minutes late', async () => {
    const s = setup([task('late', -30), task('fresh', -1)]);
    await createReminderEngine(s.deps).tick();
    expect(s.inApp.find((m) => m.taskId === 'late')?.body).toMatch(/^Missed reminder/);
    expect(s.inApp.find((m) => m.taskId === 'fresh')?.body).toMatch(/^Reminder/);
  });

  it('turns many reminders at once into one summary, and claims all of them', async () => {
    const s = setup([task('a', -5), task('b', -4), task('c', -3), task('d', -2), task('e', -1)]);
    const engine = createReminderEngine(s.deps);
    expect(await engine.tick()).toMatchObject({ delivered: 5 });
    expect(s.inApp).toHaveLength(1);
    expect(s.inApp[0].title).toBe('5 reminders');
    expect(s.inApp[0].body).toContain('and 2 more');
    expect(s.inApp[0].taskId).toBeUndefined();
    expect(Object.keys(s.storage.ledger())).toHaveLength(5);
    expect(await engine.tick()).toMatchObject({ delivered: 0 });
  });

  it('alerts again when the reminder time of a delivered task is changed', async () => {
    const s = setup([task('a', -1)]);
    const engine = createReminderEngine(s.deps);
    await engine.tick();
    s.tasks = [task('a', 0)]; // moved to exactly now
    expect(await engine.tick()).toMatchObject({ delivered: 1 });
    expect(s.inApp).toHaveLength(2);
  });

  it('does not alert for a task that was finished, or for a reminder from before the feature was first used', async () => {
    const s = setup([task('done', -1, { completed: true }), task('ancient', -60)]);
    s.deps.since = NOW - 10 * MIN;
    expect(await createReminderEngine(s.deps).tick()).toMatchObject({ delivered: 0, deferred: 0 });
  });
});

describe('when delivery goes wrong', () => {
  it('takes the claim back when showing fails, tries again, and stops after the attempt limit', async () => {
    const s = setup([task('a', -1)]);
    s.state.front = false;
    s.state.systemOn = true;
    s.state.systemFails = true;
    const engine = createReminderEngine(s.deps);
    const first = await engine.tick();
    expect(first).toMatchObject({ delivered: 0, failed: 1 });
    expect(s.storage.ledger()).toEqual({}); // not marked as delivered
    for (let i = 1; i < MAX_DELIVERY_ATTEMPTS; i++) expect(await engine.tick()).toMatchObject({ failed: 1 });
    // Over the limit: left alone, no more attempts
    expect(await engine.tick()).toMatchObject({ delivered: 0, failed: 0, deferred: 0 });
    // A different reminder is unaffected
    s.state.systemFails = false;
    s.tasks = [task('b', -1)];
    expect(await engine.tick()).toMatchObject({ delivered: 1 });
  });

  it('delivers on a later look once showing works again', async () => {
    const s = setup([task('a', -1)]);
    s.state.front = false;
    s.state.systemOn = true;
    s.state.systemFails = true;
    const engine = createReminderEngine(s.deps);
    await engine.tick();
    s.state.systemFails = false;
    expect(await engine.tick()).toMatchObject({ delivered: 1 });
    expect(s.system).toHaveLength(1);
  });

  it('counts a failing in-app message as failed too, and retries it', async () => {
    const s = setup([task('a', -1)]);
    s.state.inAppFails = true;
    const engine = createReminderEngine(s.deps);
    expect(await engine.tick()).toMatchObject({ delivered: 0, failed: 1 });
    s.state.inAppFails = false;
    expect(await engine.tick()).toMatchObject({ delivered: 1 });
  });

  it('does not repeat an alert every look when storage refuses to save (full disk, private mode)', async () => {
    const s = setup([task('a', -1)]);
    s.storage.failWrites = true;
    const engine = createReminderEngine(s.deps);
    expect(await engine.tick()).toMatchObject({ delivered: 1, saved: false });
    expect(await engine.tick()).toMatchObject({ delivered: 0 });
    expect(await engine.tick()).toMatchObject({ delivered: 0 });
    expect(s.inApp).toHaveLength(1);
  });

  it('treats a write that is not kept (it reads back different) as not saved, and still alerts only once', async () => {
    const s = setup([task('a', -1)]);
    s.storage.dropWrites = true;
    const engine = createReminderEngine(s.deps);
    expect(await engine.tick()).toMatchObject({ delivered: 1, saved: false });
    expect(await engine.tick()).toMatchObject({ delivered: 0 });
  });

  it('still retries after a failure even when the claim could not be taken back from storage', async () => {
    const s = setup([task('a', -1)]);
    s.state.front = false;
    s.state.systemOn = true;
    // The notification fails, and at that moment storage becomes unwritable, so the saved claim stays behind
    s.deps.showSystem = async () => { s.storage.failWrites = true; throw new Error('blocked'); };
    const engine = createReminderEngine(s.deps);
    expect(await engine.tick()).toMatchObject({ failed: 1 });
    expect(s.storage.ledger()).toEqual({ a: NOW - MIN }); // the stale claim is still saved...
    s.storage.failWrites = false;
    s.deps.showSystem = async (message) => { s.system.push(message); };
    expect(await engine.tick()).toMatchObject({ delivered: 1 }); // ...but is ignored, so the reminder is not lost
  });

  it('keeps the same tag when a delivery is retried after a lost acknowledgement, so the browser replaces rather than stacks', async () => {
    const s = setup([task('a', -1)]);
    s.state.front = false;
    s.state.systemOn = true;
    const tags: string[] = [];
    let first = true;
    s.deps.showSystem = async (message) => {
      tags.push(message.tag);
      if (first) { first = false; throw new Error('timed out after it was shown'); }
    };
    const engine = createReminderEngine(s.deps);
    await engine.tick();
    await engine.tick();
    expect(tags).toHaveLength(2);
    expect(tags[0]).toBe(tags[1]);
  });
});

describe('concurrency', () => {
  it('two tabs looking at the same moment deliver a reminder once between them', async () => {
    const storage = new FakeStorage();
    const a = setup([task('a', -1)], storage);
    const b = setup([task('a', -1)], storage);
    const [one, two] = await Promise.all([createReminderEngine(a.deps).tick(), createReminderEngine(b.deps).tick()]);
    expect(one.delivered + two.delivered).toBe(1);
    expect(a.inApp.length + b.inApp.length).toBe(1);
  });

  it('a look that starts while another is still showing does nothing', async () => {
    const s = setup([task('a', -1)]);
    s.state.front = false;
    s.state.systemOn = true;
    let release: () => void = () => {};
    s.deps.showSystem = (message) => new Promise<void>((resolve) => { release = () => { s.system.push(message); resolve(); }; });
    const engine = createReminderEngine(s.deps);
    const slow = engine.tick();
    expect(await engine.tick()).toMatchObject({ delivered: 0, deferred: 0, failed: 0 });
    release();
    expect(await slow).toMatchObject({ delivered: 1 });
    expect(s.system).toHaveLength(1);
  });

  it('a task completed while its notification was being shown is simply not due on the next look', async () => {
    const s = setup([task('a', -1)]);
    const engine = createReminderEngine(s.deps);
    await engine.tick();
    s.tasks = [task('a', -1, { completed: true })];
    expect(await engine.tick()).toMatchObject({ delivered: 0 });
  });
});

describe('messages', () => {
  it('shows a time for today and a weekday with the time for another day', () => {
    const today = messageFor({ taskId: 'a', title: 'Buy milk', time: NOW - MIN }, NOW);
    expect(today.body).toMatch(/^Reminder · \d{1,2}:\d{2} [AP]M$/);
    const earlier = messageFor({ taskId: 'a', title: 'Buy milk', time: NOW - 30 * 60 * MIN }, NOW);
    expect(earlier.body).toMatch(/^Missed reminder · [A-Z][a-z]{2} \d{1,2}:\d{2} [AP]M$/);
  });

  it('gives an untitled task a name and keeps one tag per reminder time', () => {
    expect(messageFor({ taskId: 'a', title: '  ', time: NOW }, NOW).title).toBe('Untitled task');
    expect(messageFor({ taskId: 'a', title: 'x', time: NOW }, NOW).tag).not.toBe(messageFor({ taskId: 'a', title: 'x', time: NOW + 1 }, NOW).tag);
  });

  it('names up to three tasks in a summary and counts the rest', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ taskId: `t${i}`, title: `T${i}`, time: NOW - i * MIN }));
    const message = summaryMessage(items);
    expect(message.body).toBe('T0, T1, T2 and 2 more');
  });
});
