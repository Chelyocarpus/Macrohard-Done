/**
 * Collects many "please save" requests into few real writes.
 *
 * The store asks to save after every change, and each save writes the whole app state as one JSON text. Typing in
 * the notes or dragging a task would otherwise rewrite everything on every keystroke or step. A save is
 * delayed a moment and a burst of changes becomes one write.
 *
 * Robustness / pitfalls guarded against:
 * - Changes lost when the tab closes: `flush()` writes at once; the caller calls it on page hide and before
 *   anything that reads storage (import, profile switch).
 * - A steady stream of changes pushing the save back forever: the wait is capped at `maxWaitMs` after the FIRST
 *   unsaved change, so at most that much work is ever at risk.
 * - A write that happens after the app froze saving (import undo, remove all data): `cancel()` drops the pending
 *   write, and the write callback is asked again at run time, so a request made before the freeze can't run after it.
 * - A write that throws: the pending state is cleared BEFORE the callback runs, so the scheduler never gets stuck
 *   "pending" and ignores later requests. The error is still passed to the caller.
 * - Double writes: `flush()` with nothing pending does nothing.
 */

export interface SchedulerTimers {
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  now: () => number;
}

export interface WriteScheduler {
  /** Ask for a write soon. Many calls in a row become one write. */
  schedule: () => void;
  /** Write now if something is waiting. */
  flush: () => void;
  /** Forget the waiting write without running it. */
  cancel: () => void;
  isPending: () => boolean;
}

const realTimers: SchedulerTimers = {
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
  now: () => Date.now(),
};

export const SAVE_DELAY_MS = 300;
export const SAVE_MAX_WAIT_MS = 2000;

export function createWriteScheduler(
  write: () => void,
  delayMs: number = SAVE_DELAY_MS,
  maxWaitMs: number = SAVE_MAX_WAIT_MS,
  timers: SchedulerTimers = realTimers,
): WriteScheduler {
  let handle: unknown = null;
  let firstRequestAt = 0;

  const run = () => {
    if (handle === null) return;
    timers.clearTimeout(handle);
    handle = null;
    write();
  };

  return {
    schedule: () => {
      const now = timers.now();
      if (handle === null) firstRequestAt = now;
      else timers.clearTimeout(handle);
      // Wait the usual delay, but never past the cap counted from the first unsaved change
      const wait = Math.max(0, Math.min(delayMs, firstRequestAt + maxWaitMs - now));
      handle = timers.setTimeout(run, wait);
    },
    flush: run,
    cancel: () => {
      if (handle === null) return;
      timers.clearTimeout(handle);
      handle = null;
    },
    isPending: () => handle !== null,
  };
}
