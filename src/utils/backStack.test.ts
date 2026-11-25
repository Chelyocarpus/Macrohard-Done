import { afterEach, describe, expect, it } from 'vitest';
import { createBackStack, layerDepth, withLayerDepth, type BackStack } from './backStack.ts';

/** A browser history in memory: entries, a position, asynchronous `go`, and popstate listeners. */
class FakeHistory {
  entries: unknown[] = [null];
  index = 0;
  listeners: (() => void)[] = [];
  queued: (() => void)[] = []; // microtasks, run by `flushMicrotasks`
  pendingJumps: number[] = [];
  pushes = 0;
  jumps = 0;

  host = {
    getState: () => this.entries[this.index],
    pushState: (state: unknown) => {
      this.entries.splice(this.index + 1);
      this.entries.push(state);
      this.index++;
      this.pushes++;
    },
    go: (delta: number) => {
      this.jumps++;
      this.pendingJumps.push(delta);
    },
    onPopState: (listener: () => void) => {
      this.listeners.push(listener);
      return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
    },
    defer: (fn: () => void) => { this.queued.push(fn); },
  };

  flushMicrotasks() {
    while (this.queued.length) this.queued.shift()!();
  }

  /** Completes a jump the app asked for, like the browser does a moment later */
  completeJumps() {
    while (this.pendingJumps.length) this.move(this.pendingJumps.shift()!);
  }

  /** The person's Back (-1) or Forward (+1) */
  userMove(delta: number) {
    this.move(delta);
  }

  private move(delta: number) {
    this.index = Math.min(this.entries.length - 1, Math.max(0, this.index + delta));
    for (const listener of [...this.listeners]) listener();
  }

  /** Lets everything settle: queued work and jumps, until nothing is left */
  settle() {
    for (let i = 0; i < 20; i++) {
      this.flushMicrotasks();
      if (!this.pendingJumps.length && !this.queued.length) return;
      this.completeJumps();
    }
    throw new Error('history did not settle');
  }

  depth() { return layerDepth(this.entries[this.index]); }
}

let stack: BackStack | undefined;
afterEach(() => { stack?.dispose(); stack = undefined; });

function setup(initial?: (h: FakeHistory) => void) {
  const h = new FakeHistory();
  initial?.(h);
  stack = createBackStack(h.host);
  h.settle();
  return h;
}

describe('layerDepth / withLayerDepth', () => {
  it('reads the count from a state and treats anything else as zero', () => {
    expect(layerDepth({ layers: 2 })).toBe(2);
    expect(layerDepth(null)).toBe(0);
    expect(layerDepth('x')).toBe(0);
    expect(layerDepth({ layers: -1 })).toBe(0);
    expect(layerDepth({ layers: 1.5 })).toBe(0);
    expect(layerDepth({ layers: '2' })).toBe(0);
  });
  it('keeps the other fields of a state', () => {
    expect(withLayerDepth({ fromHome: true }, 1)).toEqual({ fromHome: true, layers: 1 });
    expect(withLayerDepth(null, 2)).toEqual({ layers: 2 });
  });
});

describe('one panel', () => {
  it('adds one entry while it is open and removes it when it closes by itself', () => {
    const h = setup();
    const unregister = stack!.register(() => {});
    h.settle();
    expect(h.entries.length).toBe(2);
    expect(h.depth()).toBe(1);

    unregister(); // closed with Escape or a button
    h.settle();
    expect(h.index).toBe(0);
    expect(h.depth()).toBe(0);
  });

  it('closes when Back is pressed, and Back does not leave the page', () => {
    const h = setup();
    let closed = 0;
    stack!.register(() => { closed++; });
    h.settle();

    h.userMove(-1);
    h.settle();
    expect(closed).toBe(1);
    expect(stack!.size()).toBe(0);
    expect(h.index).toBe(0);
  });

  it('does not close it again when its own cleanup runs after Back', () => {
    const h = setup();
    let closed = 0;
    const unregister = stack!.register(() => { closed++; });
    h.settle();
    h.userMove(-1);
    unregister(); // React's effect cleanup, after the close
    h.settle();
    expect(closed).toBe(1);
    expect(h.index).toBe(0);
    expect(h.jumps).toBe(0); // no extra jump: the entry was already gone
  });

  it('survives React development mode (open, close, open in one go): one entry, not two', () => {
    const h = setup();
    const first = stack!.register(() => {});
    first();
    stack!.register(() => {});
    h.settle();
    expect(h.pushes).toBe(1);
    expect(h.jumps).toBe(0);
    expect(h.depth()).toBe(1);
  });

  it('can re-arm: a panel that closes only an inner part stays open and gets a new entry', () => {
    const h = setup();
    let unregister = () => {};
    let armed = 0;
    const arm = () => {
      armed++;
      unregister = stack!.register(() => { arm(); }); // Back closed an inner form; the panel is still open
    };
    arm();
    h.settle();
    h.userMove(-1);
    h.settle();
    expect(armed).toBe(2);
    expect(stack!.size()).toBe(1);
    expect(h.depth()).toBe(1); // a fresh entry for the still-open panel
    unregister();
    h.settle();
    expect(h.depth()).toBe(0);
  });
});

describe('two panels', () => {
  it('Back closes only the top one', () => {
    const h = setup();
    const closed: string[] = [];
    stack!.register(() => closed.push('details'));
    h.settle();
    stack!.register(() => closed.push('date picker'));
    h.settle();
    expect(h.depth()).toBe(2);

    h.userMove(-1);
    h.settle();
    expect(closed).toEqual(['date picker']);
    expect(stack!.size()).toBe(1);
    expect(h.depth()).toBe(1);

    h.userMove(-1);
    h.settle();
    expect(closed).toEqual(['date picker', 'details']);
    expect(h.depth()).toBe(0);
  });

  it('closing the lower one first (a view change) leaves the other with its entry', () => {
    const h = setup();
    const lower = stack!.register(() => {});
    const upper = stack!.register(() => {});
    h.settle();
    lower();
    h.settle();
    expect(stack!.size()).toBe(1);
    expect(h.depth()).toBe(1);
    upper();
    h.settle();
    expect(h.depth()).toBe(0);
  });

  it('two panels opened in the same moment get both entries', () => {
    const h = setup();
    stack!.register(() => {});
    stack!.register(() => {});
    h.settle();
    expect(h.depth()).toBe(2);
    expect(h.pushes).toBe(2);
  });

  it('closing both at once walks back out of both entries in one jump', () => {
    const h = setup();
    const a = stack!.register(() => {});
    const b = stack!.register(() => {});
    h.settle();
    a();
    b();
    h.settle();
    expect(h.jumps).toBe(1);
    expect(h.index).toBe(0);
  });
});

describe('stale entries', () => {
  it('walks back out of an entry left behind by a reload', () => {
    const h = setup((fake) => {
      fake.entries = [null, { layers: 1 }];
      fake.index = 1;
    });
    expect(h.index).toBe(0);
  });

  it('walks back when Forward lands on the entry of a panel that is gone', () => {
    const h = setup();
    stack!.register(() => {});
    h.settle();
    h.userMove(-1); // Back closes the panel
    h.settle();
    h.userMove(1); // Forward: the entry is there, the panel is not
    h.settle();
    expect(h.index).toBe(0);
    expect(stack!.size()).toBe(0);
  });

  it('does not take its own jump for the person pressing Back', () => {
    const h = setup();
    const unregisterA = stack!.register(() => {});
    h.settle();
    let closedB = 0;
    stack!.register(() => { closedB++; });
    h.settle();
    unregisterA(); // lower panel gone while B stays: depth 2, want 1
    h.settle();
    expect(closedB).toBe(0);
    expect(stack!.size()).toBe(1);
  });
});
