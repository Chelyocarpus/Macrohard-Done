import { describe, expect, it } from 'vitest';
import { createStartGate } from './startGate.ts';

describe('createStartGate', () => {
  it('lets only one start run at a time', () => {
    const gate = createStartGate();
    const first = gate.tryStart();
    expect(first).not.toBeNull();
    expect(gate.tryStart()).toBeNull();
    expect(gate.tryStart()).toBeNull();
  });

  it('lets a new start begin after the first one is done', () => {
    const gate = createStartGate();
    const first = gate.tryStart()!;
    gate.done(first);
    expect(gate.tryStart()).not.toBeNull();
  });

  it('marks a start as out of date after sign-out', () => {
    const gate = createStartGate();
    const token = gate.tryStart()!;
    expect(gate.isCurrent(token)).toBe(true);
    gate.invalidate();
    expect(gate.isCurrent(token)).toBe(false);
  });

  it('lets the next sign-in start right after a sign-out, while the old start is still waiting', () => {
    const gate = createStartGate();
    const old = gate.tryStart()!;
    gate.invalidate();
    const next = gate.tryStart();
    expect(next).not.toBeNull();
    expect(gate.isCurrent(next!)).toBe(true);
    // The old start finishing late must not unblock or disturb the new one
    gate.done(old);
    expect(gate.tryStart()).toBeNull();
    expect(gate.isCurrent(old)).toBe(false);
  });

  it('is free again after a failed start that calls done', () => {
    const gate = createStartGate();
    const token = gate.tryStart()!;
    gate.done(token);
    gate.done(token); // calling it twice is harmless
    expect(gate.tryStart()).not.toBeNull();
  });
});
