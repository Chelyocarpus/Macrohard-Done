/**
 * Lets the browser's Back button (and a phone's back gesture) close the panel that is open on top, instead of leaving
 * the page. While a panel is open the history holds one extra entry for it; Back removes that entry and the panel closes.
 *
 * The browser-facing part is behind `BackStackHost`, so the logic can be tested with a fake history.
 *
 * Robustness / pitfalls guarded against:
 * - The history must hold exactly one extra entry per open panel, whichever way the panels close (Back, Escape, a Close
 *   button, the view changing underneath). So nothing is done "per event": after every change a single `sync` compares
 *   the number of open panels with the number of entries (kept in `history.state.layers`) and fixes the difference.
 * - React development mode opens, closes and re-opens a panel in one go (StrictMode): `sync` runs once in a microtask,
 *   after the dust has settled, so no entry is pushed and removed for it.
 * - Back while two panels are open (a date picker over the task details) closes only the top one: the entries are
 *   counted, and exactly the panels above the entry we landed on are closed, newest first.
 * - A panel closed by Escape or a button removes its own entry with one `go(-n)`. While that jump is under way (it is
 *   asynchronous) nothing else is pushed or removed, and its popstate is not mistaken for the person pressing Back.
 * - Forward into an entry whose panel is gone (or a reload while a panel was open: the entry and its count survive the
 *   reload) cannot reopen anything, so the stale entries are walked back at once.
 * - A panel that handles Back by closing only an inner part (a form inside the tag manager) stays registered: its
 *   `close` callback may re-arm it, and the next `sync` pushes a fresh entry for it.
 * - The address is never changed: entries are pushed with the current URL, so the route (`#/list/...`) is unaffected.
 */

export interface BackStackHost {
  getState(): unknown;
  /** Adds an entry for the same address with this state */
  pushState(state: unknown): void;
  /** Moves in the history by `delta` entries (asynchronous: a popstate follows) */
  go(delta: number): void;
  /** Subscribes to popstate; returns the unsubscribe function */
  onPopState(listener: () => void): () => void;
  /** Runs `fn` after the current synchronous work (a microtask) */
  defer(fn: () => void): void;
}

export interface BackStack {
  /**
   * Opens a panel. `close` is called when the person presses Back; it should close the panel (or its inner part).
   * Returns the function that tells the stack the panel is gone (call it when the panel closes any other way).
   */
  register(close: () => void): () => void;
  /** How many panels are open */
  size(): number;
  /** Stops listening (tests, hot reload) */
  dispose(): void;
}

/** How many panel entries a history state carries (0 for entries made by the router or the browser). */
export function layerDepth(state: unknown): number {
  if (typeof state !== 'object' || state === null) return 0;
  const depth = (state as { layers?: unknown }).layers;
  return typeof depth === 'number' && Number.isInteger(depth) && depth > 0 ? depth : 0;
}

/** The same state with its panel count set (other fields, like the router's, are kept). */
export function withLayerDepth(state: unknown, depth: number): Record<string, unknown> {
  const base = typeof state === 'object' && state !== null ? (state as Record<string, unknown>) : {};
  return { ...base, layers: depth };
}

export function createBackStack(host: BackStackHost): BackStack {
  interface Layer { close: () => void }
  const layers: Layer[] = [];
  let syncQueued = false;
  let traversing = false;

  /** Makes the number of history entries match the number of open panels. */
  function sync() {
    syncQueued = false;
    if (traversing) return; // a jump is under way; its popstate schedules another sync
    const have = layerDepth(host.getState());
    const want = layers.length;
    if (want > have) {
      for (let depth = have + 1; depth <= want; depth++) host.pushState(withLayerDepth(host.getState(), depth));
    } else if (want < have) {
      traversing = true;
      host.go(want - have);
    }
  }

  function schedule() {
    if (syncQueued) return;
    syncQueued = true;
    host.defer(sync);
  }

  const unsubscribe = host.onPopState(() => {
    if (traversing) {
      // Our own jump arrived
      traversing = false;
      schedule();
      return;
    }
    // The person pressed Back (or Forward): close every panel above the entry that is now showing, newest first
    // (Taken off the stack before any is closed: a panel that re-arms itself while closing is added after them, so
    // it can neither be closed again by this very press nor keep the loop going.)
    const have = layerDepth(host.getState());
    const closing = layers.splice(Math.min(have, layers.length));
    for (let i = closing.length - 1; i >= 0; i--) closing[i].close();
    if (have > layers.length) schedule(); // landed on an entry of a panel that is gone
  });

  // A reload can leave a panel's entry behind; walk back out of it
  schedule();

  return {
    register(close) {
      const layer: Layer = { close };
      layers.push(layer);
      schedule();
      return () => {
        const index = layers.indexOf(layer);
        if (index === -1) return; // already closed by Back
        layers.splice(index, 1);
        schedule();
      };
    },
    size: () => layers.length,
    dispose: unsubscribe,
  };
}

// ---- The app's one stack, on the real window ----------------------------------------------------------------

let appStack: BackStack | null = null;

/** The stack for this page, made the first time it is asked for. Null where there is no browser history (tests, server). */
export function getBackStack(): BackStack | null {
  if (appStack) return appStack;
  if (typeof window === 'undefined' || typeof window.history === 'undefined') return null;
  appStack = createBackStack({
    getState: () => window.history.state,
    pushState: (state) => window.history.pushState(state, ''),
    go: (delta) => window.history.go(delta),
    onPopState: (listener) => {
      window.addEventListener('popstate', listener);
      return () => window.removeEventListener('popstate', listener);
    },
    defer: (fn) => queueMicrotask(fn),
  });
  return appStack;
}
