import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DISPLAY_PREFS,
  DISPLAY_PREFS_KEY,
  LONG_MESSAGE_MS,
  messageDuration,
  parseDisplayPrefs,
  readDisplayPrefs,
  rootFontSize,
  writeDisplayPrefs,
} from './displayPrefs.ts';

class FakeStorage {
  data = new Map<string, string>();
  fail = false;
  drop = false;
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.fail) throw new Error('quota exceeded');
    if (!this.drop) this.data.set(key, value);
  }
  removeItem(key: string) { this.data.delete(key); }
}

describe('parseDisplayPrefs', () => {
  it('keeps known choices', () => {
    expect(parseDisplayPrefs({ textSize: 'xlarge', messageTime: 'stay' })).toEqual({ textSize: 'xlarge', messageTime: 'stay' });
  });

  it('turns anything unknown into the default for that one setting', () => {
    expect(parseDisplayPrefs({ textSize: 'huge', messageTime: 'long' })).toEqual({ textSize: 'standard', messageTime: 'long' });
    for (const value of [null, undefined, 5, 'x', [], {}]) expect(parseDisplayPrefs(value)).toEqual(DEFAULT_DISPLAY_PREFS);
  });
});

describe('rootFontSize', () => {
  it('maps each size to a percent of the browser text size, and an unknown one to 100%', () => {
    expect(rootFontSize('standard')).toBe('100%');
    expect(rootFontSize('large')).toBe('125%');
    expect(rootFontSize('xlarge')).toBe('150%');
    expect(rootFontSize('bogus' as never)).toBe('100%');
  });
});

describe('messageDuration', () => {
  it('leaves the normal time alone', () => {
    expect(messageDuration(8000, 'normal')).toBe(8000);
  });

  it('makes every message at least 30 seconds on "Long", and never shorter than it was', () => {
    expect(messageDuration(8000, 'long')).toBe(LONG_MESSAGE_MS);
    expect(messageDuration(15000, 'long')).toBe(LONG_MESSAGE_MS);
    expect(messageDuration(60000, 'long')).toBe(60000);
  });

  it('never closes a message by itself on "Until I close them"', () => {
    expect(messageDuration(8000, 'stay')).toBe(0);
  });

  it('keeps a message that has no time (0, undefined, negative) open, whatever the setting', () => {
    for (const time of ['normal', 'long', 'stay'] as const) {
      expect(messageDuration(0, time)).toBe(0);
      expect(messageDuration(undefined, time)).toBe(0);
      expect(messageDuration(-5, time)).toBe(0);
    }
  });
});

describe('read and write', () => {
  it('round-trips', () => {
    const storage = new FakeStorage();
    expect(writeDisplayPrefs(storage, { textSize: 'large', messageTime: 'long' })).toBe(true);
    expect(readDisplayPrefs(storage)).toEqual({ textSize: 'large', messageTime: 'long' });
  });

  it('gives the defaults for missing, damaged or unreadable data', () => {
    const storage = new FakeStorage();
    expect(readDisplayPrefs(storage)).toEqual(DEFAULT_DISPLAY_PREFS);
    storage.data.set(DISPLAY_PREFS_KEY, '{not json');
    expect(readDisplayPrefs(storage)).toEqual(DEFAULT_DISPLAY_PREFS);
    expect(readDisplayPrefs({ getItem: () => { throw new Error('blocked'); }, setItem: () => {}, removeItem: () => {} })).toEqual(DEFAULT_DISPLAY_PREFS);
  });

  it('says false when storage refuses the write or drops it', () => {
    const refusing = new FakeStorage();
    refusing.fail = true;
    expect(writeDisplayPrefs(refusing, DEFAULT_DISPLAY_PREFS)).toBe(false);
    const dropping = new FakeStorage();
    dropping.drop = true;
    expect(writeDisplayPrefs(dropping, DEFAULT_DISPLAY_PREFS)).toBe(false);
  });

  it('never saves a bad value', () => {
    const storage = new FakeStorage();
    writeDisplayPrefs(storage, { textSize: 'huge', messageTime: 'soon' } as never);
    expect(JSON.parse(storage.data.get(DISPLAY_PREFS_KEY) ?? '{}')).toEqual(DEFAULT_DISPLAY_PREFS);
  });
});
