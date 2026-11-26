import { describe, expect, it } from 'vitest';
import { REMINDER_PREFS_KEY, loadPrefs, readPrefs, writePrefs } from './reminderPrefs.ts';
import type { KeyValueStorage } from './profiles.ts';

class FakeStorage implements KeyValueStorage {
  data = new Map<string, string>();
  failWrites = false;
  failReads = false;
  dropWrites = false;
  getItem(key: string) {
    if (this.failReads) throw new Error('blocked');
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('quota exceeded');
    if (!this.dropWrites) this.data.set(key, value);
  }
  removeItem(key: string) { this.data.delete(key); }
}

const NOW = 1_800_000_000_000;

describe('readPrefs', () => {
  it('starts with notifications off and "since" now when nothing is saved', () => {
    expect(readPrefs(new FakeStorage(), NOW)).toEqual({ prefs: { enabled: false, since: NOW }, found: false });
  });

  it('reads what was saved', () => {
    const storage = new FakeStorage();
    storage.data.set(REMINDER_PREFS_KEY, JSON.stringify({ enabled: true, since: 5 }));
    expect(readPrefs(storage, NOW)).toEqual({ prefs: { enabled: true, since: 5 }, found: true });
  });

  it('treats damaged or odd values as not saved, and only a real true as on', () => {
    for (const bad of ['{broken', '[1]', '"x"', JSON.stringify({ enabled: true }), JSON.stringify({ enabled: true, since: 'x' })]) {
      const storage = new FakeStorage();
      storage.data.set(REMINDER_PREFS_KEY, bad);
      expect(readPrefs(storage, NOW)).toEqual({ prefs: { enabled: false, since: NOW }, found: false });
    }
    const storage = new FakeStorage();
    storage.data.set(REMINDER_PREFS_KEY, JSON.stringify({ enabled: 'yes', since: 5 }));
    expect(readPrefs(storage, NOW).prefs.enabled).toBe(false);
  });

  it('does not throw when storage cannot be read', () => {
    const storage = new FakeStorage();
    storage.failReads = true;
    expect(readPrefs(storage, NOW).found).toBe(false);
  });
});

describe('writePrefs', () => {
  it('reports success only when the value reads back', () => {
    const storage = new FakeStorage();
    expect(writePrefs(storage, { enabled: true, since: 1 })).toBe(true);
    storage.dropWrites = true;
    expect(writePrefs(storage, { enabled: false, since: 2 })).toBe(false);
    storage.dropWrites = false;
    storage.failWrites = true;
    expect(writePrefs(storage, { enabled: false, since: 2 })).toBe(false);
  });
});

describe('loadPrefs', () => {
  it('fixes "since" on first use, so later starts keep the same time', () => {
    const storage = new FakeStorage();
    expect(loadPrefs(storage, NOW).since).toBe(NOW);
    expect(loadPrefs(storage, NOW + 10_000).since).toBe(NOW);
  });

  it('still works for the session when storage cannot be written', () => {
    const storage = new FakeStorage();
    storage.failWrites = true;
    expect(loadPrefs(storage, NOW)).toEqual({ enabled: false, since: NOW });
  });
});
