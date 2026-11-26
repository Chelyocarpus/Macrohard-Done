import { describe, expect, it } from 'vitest';
import {
  CATCH_UP_WINDOW_MS,
  MAX_INDIVIDUAL,
  MAX_LEDGER_ENTRIES,
  MAX_POLL_MS,
  MIN_DELAY_MS,
  dueReminders,
  nextDelay,
  parseLedger,
  planDelivery,
  withDelivered,
  withoutDelivered,
  type DueReminder,
  type ReminderTask,
} from './reminders.ts';

const NOW = Date.parse('2026-11-25T16:00:00.000Z');
const MIN = 60_000;
const SINCE = NOW - 7 * 24 * 60 * MIN; // this device has had the feature for a week

const task = (id: string, minutesFromNow: number | null, extra: Partial<ReminderTask> = {}): ReminderTask => ({
  id,
  title: `Task ${id}`,
  completed: false,
  reminder: minutesFromNow === null ? undefined : new Date(NOW + minutesFromNow * MIN),
  ...extra,
});

const due = (id: string, minutesFromNow: number): DueReminder => ({ taskId: id, title: `Task ${id}`, time: NOW + minutesFromNow * MIN });

describe('dueReminders', () => {
  it('returns reminders whose time has come, oldest first', () => {
    const result = dueReminders([task('b', -1), task('a', -30), task('later', 10), task('none', null)], {}, NOW, SINCE);
    expect(result.map((item) => item.taskId)).toEqual(['a', 'b']);
  });

  it('treats the exact moment as due and one millisecond earlier as not due yet', () => {
    const exact = { ...task('x', 0) };
    const notYet = { ...task('y', 0), reminder: new Date(NOW + 1) };
    expect(dueReminders([exact, notYet], {}, NOW, SINCE).map((item) => item.taskId)).toEqual(['x']);
  });

  it('keeps the catch-up window boundary: exactly 24 hours late still alerts, one millisecond more does not', () => {
    const edge = { ...task('edge', 0), reminder: new Date(NOW - CATCH_UP_WINDOW_MS) };
    const over = { ...task('over', 0), reminder: new Date(NOW - CATCH_UP_WINDOW_MS - 1) };
    expect(dueReminders([edge, over], {}, NOW, SINCE).map((item) => item.taskId)).toEqual(['edge']);
  });

  it('never alerts for reminders from before this device first ran the feature', () => {
    expect(dueReminders([task('old', -60)], {}, NOW, NOW - 30 * MIN)).toEqual([]);
    expect(dueReminders([task('new', -10)], {}, NOW, NOW - 30 * MIN)).toHaveLength(1);
  });

  it('skips finished tasks and invalid dates', () => {
    const invalid = { ...task('bad', 0), reminder: new Date('nonsense') };
    expect(dueReminders([task('done', -5, { completed: true }), invalid], {}, NOW, SINCE)).toEqual([]);
  });

  it('skips a reminder already delivered, but alerts again when the reminder time was changed', () => {
    const t = task('a', -5);
    const delivered = { a: NOW - 5 * MIN };
    expect(dueReminders([t], delivered, NOW, SINCE)).toEqual([]);
    const moved = task('a', -2);
    expect(dueReminders([moved], delivered, NOW, SINCE)).toHaveLength(1);
  });

  it('does not alert at once for a reminder set to a time that has already passed (the task was edited after it)', () => {
    const justSet = task('a', -10, { updatedAt: new Date(NOW - 1 * MIN) });
    const cameDueWhileClosed = task('b', -10, { updatedAt: new Date(NOW - 60 * MIN) });
    expect(dueReminders([justSet, cameDueWhileClosed], {}, NOW, SINCE).map((item) => item.taskId)).toEqual(['b']);
  });

  it('puts reminders with the same time in a stable order', () => {
    const result = dueReminders([task('b', -5), task('a', -5)], {}, NOW, SINCE);
    expect(result.map((item) => item.taskId)).toEqual(['a', 'b']);
  });
});

describe('nextDelay', () => {
  it('waits until the next reminder', () => {
    expect(nextDelay([task('a', 0.1)], {}, NOW)).toBe(6000);
  });
  it('looks again within the poll limit when the next reminder is far away or there is none', () => {
    expect(nextDelay([task('a', 600)], {}, NOW)).toBe(MAX_POLL_MS);
    expect(nextDelay([], {}, NOW)).toBe(MAX_POLL_MS);
  });
  it('never waits less than the minimum, even for a reminder a few milliseconds away', () => {
    const soon = { ...task('a', 0), reminder: new Date(NOW + 5) };
    expect(nextDelay([soon], {}, NOW)).toBe(MIN_DELAY_MS);
  });
  it('ignores reminders that are already due, finished or delivered, so they cannot make a fast loop', () => {
    const delivered = { d: NOW + 5 * MIN };
    expect(nextDelay([task('past', -5), task('done', 0.2, { completed: true }), task('d', 5)], delivered, NOW)).toBe(MAX_POLL_MS);
  });
  it('survives an absurdly distant date', () => {
    const far = { ...task('a', 0), reminder: new Date(8.64e15) };
    expect(nextDelay([far], {}, NOW)).toBe(MAX_POLL_MS);
  });
});

describe('planDelivery', () => {
  it('alerts one by one up to the limit and as one summary beyond it', () => {
    const items = (n: number) => Array.from({ length: n }, (_, i) => due(`t${i}`, -1));
    expect(planDelivery(items(0))).toEqual({ individual: [], summary: [] });
    expect(planDelivery(items(MAX_INDIVIDUAL)).individual).toHaveLength(MAX_INDIVIDUAL);
    const many = planDelivery(items(MAX_INDIVIDUAL + 1));
    expect(many.individual).toEqual([]);
    expect(many.summary).toHaveLength(MAX_INDIVIDUAL + 1);
  });
});

describe('ledger', () => {
  it('reads a saved ledger and shrugs off damage', () => {
    expect(parseLedger('{"a":5,"b":"x","c":null}')).toEqual({ a: 5 });
    expect(parseLedger('{broken')).toEqual({});
    expect(parseLedger('[1,2]')).toEqual({});
    expect(parseLedger(null)).toEqual({});
  });

  it('records delivered reminders without changing the old ledger', () => {
    const old = { a: NOW - 5 * MIN };
    const next = withDelivered(old, [due('b', -1)], [task('a', -5), task('b', -1)]);
    expect(next).toEqual({ a: NOW - 5 * MIN, b: NOW - MIN });
    expect(old).toEqual({ a: NOW - 5 * MIN });
  });

  it('drops entries for tasks that are gone or whose reminder changed', () => {
    const ledger = { gone: NOW - MIN, moved: NOW - 10 * MIN, kept: NOW - 3 * MIN };
    const next = withDelivered(ledger, [], [task('moved', -2), task('kept', -3)]);
    expect(next).toEqual({ kept: NOW - 3 * MIN });
  });

  it('never grows past the cap, keeping the newest reminders', () => {
    const tasks = Array.from({ length: MAX_LEDGER_ENTRIES + 20 }, (_, i) => ({ ...task(`t${i}`, 0), reminder: new Date(NOW - (i + 1) * 1000) }));
    const delivered = tasks.map((t): DueReminder => ({ taskId: t.id, title: t.title, time: t.reminder!.getTime() }));
    const next = withDelivered({}, delivered, tasks);
    expect(Object.keys(next)).toHaveLength(MAX_LEDGER_ENTRIES);
    expect(next.t0).toBeDefined();
    expect(next[`t${MAX_LEDGER_ENTRIES + 19}`]).toBeUndefined();
  });

  it('takes back only the entries that match, leaving a changed reminder alone', () => {
    const ledger = { a: NOW - MIN, b: NOW - 2 * MIN };
    const next = withoutDelivered(ledger, [due('a', -1), due('b', -9)]);
    expect(next).toEqual({ b: NOW - 2 * MIN });
    expect(ledger).toEqual({ a: NOW - MIN, b: NOW - 2 * MIN });
  });
});
