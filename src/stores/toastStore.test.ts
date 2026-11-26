import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DURATION, ERROR_DURATION, UNDO_DURATION, useToastStore } from './toastStore.ts';

const store = () => useToastStore.getState();

describe('durations', () => {
  beforeEach(() => store().clearAllToasts());

  it('keeps messages for 8 seconds (errors 10, messages with Undo 15)', () => {
    expect(DEFAULT_DURATION).toBe(8000);
    expect(UNDO_DURATION).toBe(15000);
    expect(ERROR_DURATION).toBe(10000);
    store().showSuccess('a');
    store().showUndo('b', 'c', () => {});
    store().showError('d');
    expect(store().toasts.map((t) => t.duration)).toEqual([8000, 15000, 10000]);
  });
});

describe('undoLatest', () => {
  beforeEach(() => store().clearAllToasts());

  it('returns false and changes nothing when there is no Undo toast', () => {
    store().showSuccess('Saved');
    expect(store().undoLatest()).toBe(false);
    expect(store().toasts).toHaveLength(1);
  });

  it('runs the newest Undo once and closes its toast', () => {
    const first = vi.fn();
    const second = vi.fn();
    store().showUndo('Task deleted', 'one', first);
    store().showUndo('Task completed', 'two', second);

    expect(store().undoLatest()).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(store().toasts).toHaveLength(1);
  });

  it('undoes the older action on a second press and nothing after that', () => {
    const first = vi.fn();
    const second = vi.fn();
    store().showUndo('a', 'one', first);
    store().showUndo('b', 'two', second);

    expect(store().undoLatest()).toBe(true);
    expect(store().undoLatest()).toBe(true);
    expect(store().undoLatest()).toBe(false);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does not run an action that is not labelled Undo', () => {
    const run = vi.fn();
    store().addToast({ title: 'Other', variant: 'info', action: { label: 'Open', onClick: run } });
    expect(store().undoLatest()).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it('is safe when the toast button was already pressed by hand', () => {
    const run = vi.fn();
    store().showUndo('a', 'one', run);
    const toast = store().toasts[0];
    toast.action?.onClick(); // user clicks the button...
    toast.action?.onClick(); // ...a double click
    expect(run).toHaveBeenCalledTimes(1);
    expect(store().undoLatest()).toBe(false);
  });
});
