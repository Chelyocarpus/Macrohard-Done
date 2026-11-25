import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A tiny stand-in for the task store: toggling flips `completed` on the task with that id.
const tasks: { id: string; completed: boolean }[] = [];
// Like the real store, it replaces the task object instead of changing it in place.
const toggleTask = vi.fn((id: string) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index !== -1) tasks[index] = { ...tasks[index], completed: !tasks[index].completed };
});

vi.mock('../stores/taskStore.ts', () => ({
  useTaskStore: { getState: () => ({ tasks, toggleTask }) },
}));

import { toggleTaskWithHold } from './completeTask.ts';
import { useCompletionHoldStore, HOLD_MS, COLLAPSE_MS } from '../stores/completionHoldStore.ts';

const phases = () => useCompletionHoldStore.getState().phases;

describe('toggleTaskWithHold', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    tasks.length = 0;
    toggleTask.mockClear();
  });
  afterEach(() => {
    useCompletionHoldStore.getState().cancel('t1');
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('completes the task and starts the hold', () => {
    tasks.push({ id: 't1', completed: false });
    toggleTaskWithHold('t1');
    expect(toggleTask).toHaveBeenCalledTimes(1);
    expect(tasks[0].completed).toBe(true);
    expect(phases().t1).toBe('holding');
  });

  it('ends the hold on its own after hold + collapse', () => {
    tasks.push({ id: 't1', completed: false });
    toggleTaskWithHold('t1');
    vi.advanceTimersByTime(HOLD_MS + COLLAPSE_MS);
    expect(phases()).toEqual({});
  });

  it('toggling again during the hold reopens the task and cancels the hold', () => {
    tasks.push({ id: 't1', completed: false });
    toggleTaskWithHold('t1');
    vi.advanceTimersByTime(200);
    toggleTaskWithHold('t1');
    expect(tasks[0].completed).toBe(false);
    expect(phases()).toEqual({});
    vi.advanceTimersByTime(5000);
    expect(phases()).toEqual({});
  });

  it('reopening a completed task starts no hold', () => {
    tasks.push({ id: 't1', completed: true });
    toggleTaskWithHold('t1');
    expect(tasks[0].completed).toBe(false);
    expect(phases()).toEqual({});
  });

  it('leaves no hold behind when the toggle did nothing (unknown id)', () => {
    toggleTaskWithHold('ghost');
    expect(toggleTask).toHaveBeenCalledTimes(1);
    expect(phases()).toEqual({});
  });

  it('skips the hold when the system asks for reduced motion', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    tasks.push({ id: 't1', completed: false });
    toggleTaskWithHold('t1');
    expect(tasks[0].completed).toBe(true);
    expect(phases()).toEqual({});
  });
});
