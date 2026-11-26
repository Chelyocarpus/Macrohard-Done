import { describe, expect, it } from 'vitest';
import { createWriteScheduler, type SchedulerTimers } from './writeScheduler.ts';

// A clock and timer set the test controls
function fakeTimers() {
  let time = 0;
  let nextId = 1;
  const pending = new Map<number, { at: number; callback: () => void }>();
  const timers: SchedulerTimers = {
    setTimeout: (callback, ms) => {
      const id = nextId++;
      pending.set(id, { at: time + ms, callback });
      return id;
    },
    clearTimeout: (handle) => { pending.delete(handle as number); },
    now: () => time,
  };
  const advance = (ms: number) => {
    const target = time + ms;
    for (;;) {
      const due = [...pending.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      time = due[1].at;
      pending.delete(due[0]);
      due[1].callback();
    }
    time = target;
  };
  return { timers, advance, pendingCount: () => pending.size };
}

describe('createWriteScheduler', () => {
  it('turns a burst of requests into one write after the delay', () => {
    const t = fakeTimers();
    let writes = 0;
    const s = createWriteScheduler(() => { writes++; }, 300, 2000, t.timers);
    s.schedule(); t.advance(100); s.schedule(); t.advance(100); s.schedule();
    expect(writes).toBe(0);
    t.advance(299);
    expect(writes).toBe(0);
    t.advance(1);
    expect(writes).toBe(1);
    expect(s.isPending()).toBe(false);
  });

  it('writes at the latest maxWait after the first change, even when changes never stop', () => {
    const t = fakeTimers();
    let writes = 0;
    const s = createWriteScheduler(() => { writes++; }, 300, 1000, t.timers);
    for (let i = 0; i < 20; i++) { s.schedule(); t.advance(100); } // a change every 100 ms for 2 s
    expect(writes).toBeGreaterThanOrEqual(1);
    expect(writes).toBeLessThanOrEqual(3);
  });

  it('flush writes at once, exactly once, and leaves no timer behind', () => {
    const t = fakeTimers();
    let writes = 0;
    const s = createWriteScheduler(() => { writes++; }, 300, 2000, t.timers);
    s.schedule();
    s.flush();
    s.flush();
    expect(writes).toBe(1);
    expect(t.pendingCount()).toBe(0);
    t.advance(5000);
    expect(writes).toBe(1);
  });

  it('flush with nothing waiting does not write', () => {
    const t = fakeTimers();
    let writes = 0;
    const s = createWriteScheduler(() => { writes++; }, 300, 2000, t.timers);
    s.flush();
    expect(writes).toBe(0);
  });

  it('cancel drops the waiting write', () => {
    const t = fakeTimers();
    let writes = 0;
    const s = createWriteScheduler(() => { writes++; }, 300, 2000, t.timers);
    s.schedule();
    s.cancel();
    t.advance(5000);
    expect(writes).toBe(0);
    expect(s.isPending()).toBe(false);
  });

  it('keeps working after a write throws', () => {
    const t = fakeTimers();
    let writes = 0;
    const s = createWriteScheduler(() => { writes++; if (writes === 1) throw new Error('disk full'); }, 300, 2000, t.timers);
    s.schedule();
    expect(() => t.advance(300)).toThrow('disk full');
    expect(s.isPending()).toBe(false);
    s.schedule();
    t.advance(300);
    expect(writes).toBe(2);
  });

  it('starts a new max-wait window after each write', () => {
    const t = fakeTimers();
    let writes = 0;
    const s = createWriteScheduler(() => { writes++; }, 300, 1000, t.timers);
    s.schedule(); t.advance(300);
    expect(writes).toBe(1);
    t.advance(5000);
    s.schedule(); t.advance(299);
    expect(writes).toBe(1);
    t.advance(1);
    expect(writes).toBe(2);
  });
});
