import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLAPSE_MS, HOLD_MS, useCompletionHoldStore } from './completionHoldStore.ts';

const phases = () => useCompletionHoldStore.getState().phases;
const start = (id: string) => useCompletionHoldStore.getState().start(id);
const cancel = (id: string) => useCompletionHoldStore.getState().cancel(id);

describe('completion hold', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    ['a', 'b'].forEach(cancel);
    vi.useRealTimers();
  });

  it('holds for 600 ms, collapses for 200 ms, then is gone', () => {
    start('a');
    expect(phases()).toEqual({ a: 'holding' });

    vi.advanceTimersByTime(HOLD_MS - 1);
    expect(phases().a).toBe('holding');

    vi.advanceTimersByTime(1);
    expect(phases().a).toBe('collapsing');

    vi.advanceTimersByTime(COLLAPSE_MS - 1);
    expect(phases().a).toBe('collapsing');

    vi.advanceTimersByTime(1);
    expect(phases()).toEqual({});
  });

  it('uses the spec timings', () => {
    expect(HOLD_MS).toBe(600);
    expect(COLLAPSE_MS).toBe(200);
  });

  it('keeps a running hold when started again (double click / key repeat)', () => {
    start('a');
    vi.advanceTimersByTime(400);
    start('a'); // must not restart the clock
    vi.advanceTimersByTime(200);
    expect(phases().a).toBe('collapsing');
    vi.advanceTimersByTime(COLLAPSE_MS);
    expect(phases()).toEqual({});
  });

  it('cancelling during the hold removes it and no later timer brings it back', () => {
    start('a');
    vi.advanceTimersByTime(300);
    cancel('a');
    expect(phases()).toEqual({});
    vi.advanceTimersByTime(5000);
    expect(phases()).toEqual({});
  });

  it('cancelling during the collapse also stops it', () => {
    start('a');
    vi.advanceTimersByTime(HOLD_MS + 50);
    expect(phases().a).toBe('collapsing');
    cancel('a');
    expect(phases()).toEqual({});
    expect(vi.getTimerCount()).toBe(0);
  });

  it('can be started again after it finished', () => {
    start('a');
    vi.advanceTimersByTime(HOLD_MS + COLLAPSE_MS);
    expect(phases()).toEqual({});
    start('a');
    expect(phases().a).toBe('holding');
  });

  it('tracks tasks independently', () => {
    start('a');
    vi.advanceTimersByTime(300);
    start('b');
    vi.advanceTimersByTime(300); // a: 600 -> collapsing, b: 300 -> holding
    expect(phases()).toEqual({ a: 'collapsing', b: 'holding' });
    cancel('a');
    expect(phases()).toEqual({ b: 'holding' });
  });

  it('cancelling an unknown id is harmless', () => {
    expect(() => cancel('nope')).not.toThrow();
    expect(phases()).toEqual({});
  });
});
