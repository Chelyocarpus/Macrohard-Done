import { create } from 'zustand';

/**
 * After a task is completed it stays where it is for a moment, so a slip of the finger can be corrected
 * on the spot, and then slides out of the list into "Completed".
 *
 * - 'holding': HOLD_MS, the row stays in place (checked and struck through).
 * - 'collapsing': COLLAPSE_MS, the row shrinks away.
 * - afterwards the entry is removed and the list shows the task in its "Completed" section.
 *
 * This is presentation only: the task is already saved as completed (and the Undo message is showing)
 * from the first moment.
 */
export const HOLD_MS = 600;
export const COLLAPSE_MS = 200;

export type HoldPhase = 'holding' | 'collapsing';

interface CompletionHoldState {
  phases: Record<string, HoldPhase>;
  start: (id: string) => void;
  cancel: (id: string) => void;
}

const timers = new Map<string, ReturnType<typeof setTimeout>[]>();

function clearTimers(id: string) {
  timers.get(id)?.forEach((timer) => clearTimeout(timer));
  timers.delete(id);
}

export const useCompletionHoldStore = create<CompletionHoldState>()((set, get) => {
  const remove = (id: string) =>
    set((state) => {
      if (!(id in state.phases)) return state;
      const rest = { ...state.phases };
      delete rest[id];
      return { phases: rest };
    });

  return {
    phases: {},

    /**
     * Robustness / pitfalls guarded against:
     * - Called twice for the same task (double click, key repeat): the running hold is kept, so the
     *   timers are never doubled and the row doesn't restart its hold.
     * - Every timer is tracked per task, so `cancel` can stop both phases; none is left running to
     *   change state later.
     * - The state is only an on-screen delay; the task's real completed state is never touched here, so
     *   a lost timer can at worst leave a finished task one phase too long in place.
     */
    start: (id) => {
      if (get().phases[id]) return;
      set((state) => ({ phases: { ...state.phases, [id]: 'holding' } }));
      const collapse = setTimeout(() => {
        set((state) => (state.phases[id] ? { phases: { ...state.phases, [id]: 'collapsing' } } : state));
      }, HOLD_MS);
      const finish = setTimeout(() => {
        timers.delete(id);
        remove(id);
      }, HOLD_MS + COLLAPSE_MS);
      timers.set(id, [collapse, finish]);
    },

    /** The task was reopened (or the hold must end now): the row stays where it is, nothing collapses. */
    cancel: (id) => {
      clearTimers(id);
      remove(id);
    },
  };
});
