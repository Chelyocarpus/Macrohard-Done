import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDateFormatStore } from './dateFormatStore.ts';
import { useToastStore } from './toastStore.ts';
import { DATE_TIME_PREFS_KEY, DEFAULT_DATE_TIME_PREFS } from '../utils/dateFormat.ts';

class FakeLocalStorage {
  data = new Map<string, string>();
  failWrites = false;
  dropWrites = false;
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('quota exceeded');
    if (!this.dropWrites) this.data.set(key, value);
  }
  removeItem(key: string) { this.data.delete(key); }
}

let fake: FakeLocalStorage;

beforeEach(() => {
  fake = new FakeLocalStorage();
  vi.stubGlobal('localStorage', fake);
  useDateFormatStore.setState({ ...DEFAULT_DATE_TIME_PREFS });
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('date format store', () => {
  it('changes the style and saves it', () => {
    useDateFormatStore.getState().setDateFormat('iso');
    useDateFormatStore.getState().setTimeFormat('24h');
    expect(useDateFormatStore.getState().dateFormat).toBe('iso');
    expect(useDateFormatStore.getState().timeFormat).toBe('24h');
    expect(JSON.parse(fake.data.get(DATE_TIME_PREFS_KEY) ?? '{}')).toEqual({ dateFormat: 'iso', timeFormat: '24h' });
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('changing one setting keeps the other', () => {
    useDateFormatStore.getState().setTimeFormat('24h');
    useDateFormatStore.getState().setDateFormat('dmy-dot');
    expect(JSON.parse(fake.data.get(DATE_TIME_PREFS_KEY) ?? '{}')).toEqual({ dateFormat: 'dmy-dot', timeFormat: '24h' });
  });

  it('does nothing for a choice that is already in effect', () => {
    const writes = vi.spyOn(fake, 'setItem');
    useDateFormatStore.getState().setDateFormat(DEFAULT_DATE_TIME_PREFS.dateFormat);
    expect(writes).not.toHaveBeenCalled();
  });

  it('ignores a value that is not a known choice', () => {
    useDateFormatStore.getState().setDateFormat('bogus' as never);
    expect(useDateFormatStore.getState().dateFormat).toBe(DEFAULT_DATE_TIME_PREFS.dateFormat);
    expect(fake.data.size).toBe(0);
  });

  it('still changes the style, and says it is not kept, when storage refuses the write', () => {
    fake.failWrites = true;
    useDateFormatStore.getState().setTimeFormat('24h');
    expect(useDateFormatStore.getState().timeFormat).toBe('24h');
    expect(useToastStore.getState().toasts.map((toast) => toast.title)).toEqual(['Not saved']);
  });

  it('says it is not kept when storage accepts the write but drops it', () => {
    fake.dropWrites = true;
    useDateFormatStore.getState().setDateFormat('iso');
    expect(useDateFormatStore.getState().dateFormat).toBe('iso');
    expect(useToastStore.getState().toasts.map((toast) => toast.title)).toEqual(['Not saved']);
  });
});
