/**
 * Decides whether a sign-in may start the sync engine. Starting is slow (it waits for the Supabase client), and during
 * that wait the account can send another sign-in event or the person can sign out.
 *
 * Robustness / pitfalls guarded against:
 * - Two sign-in events close together: `tryStart` answers `null` while a start is running, so only one engine is made.
 *   The flag is set before the first wait, not after it.
 * - Signing out while the engine is still starting: `invalidate` makes the running start's token stale, and the start
 *   checks `isCurrent` after its wait, so it stops instead of creating an engine for a signed-out account.
 * - A start that fails or gives up: `done` always clears the flag (call it in a `finally`), so later sign-ins can start.
 * - An old start finishing late must not clear a newer start's flag: `done` takes the token and only clears for the current one.
 */
export interface StartGate {
  /** A token when a start may begin now, `null` when one is already running */
  tryStart: () => number | null;
  /** False once `invalidate` was called after this token was given out */
  isCurrent: (token: number) => boolean;
  /** The start with this token has finished (or given up) */
  done: (token: number) => void;
  /** Sign-out: every start still running is now out of date */
  invalidate: () => void;
}

export function createStartGate(): StartGate {
  let epoch = 0;
  // The epoch of the start that is running, or null
  let running: number | null = null;

  return {
    tryStart: () => {
      if (running !== null) return null;
      running = epoch;
      return epoch;
    },
    isCurrent: (token) => token === epoch,
    done: (token) => {
      if (running === token) running = null;
    },
    invalidate: () => {
      epoch += 1;
      // A start from before the sign-out must not block the next sign-in
      running = null;
    },
  };
}
