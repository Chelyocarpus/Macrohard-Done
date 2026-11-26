import { describe, expect, it } from 'vitest';
import { generateId } from './id.ts';
import { isProfileId } from './profiles.ts';

describe('generateId', () => {
  it('never repeats, even for many ids made in the same millisecond', () => {
    const ids = new Set(Array.from({ length: 20_000 }, () => generateId()));
    expect(ids.size).toBe(20_000);
  });

  it('makes ids that are valid profile ids (the strictest id rule in the app)', () => {
    for (let i = 0; i < 100; i++) expect(isProfileId(generateId())).toBe(true);
  });

  it('has the standard 36-character UUID shape', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
