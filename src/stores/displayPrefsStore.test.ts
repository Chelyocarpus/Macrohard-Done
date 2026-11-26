import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDisplayPrefsStore } from './displayPrefsStore.ts';
import { useToastStore } from './toastStore.ts';
import { DEFAULT_DISPLAY_PREFS, DISPLAY_PREFS_KEY } from '../utils/displayPrefs.ts';

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
let rootStyle: { fontSize: string; setProperty: (name: string, value: string) => void; vars: Record<string, string> };

beforeEach(() => {
  fake = new FakeLocalStorage();
  rootStyle = { fontSize: '', vars: {}, setProperty(name, value) { this.vars[name] = value; } };
  vi.stubGlobal('localStorage', fake);
  vi.stubGlobal('document', { documentElement: { style: rootStyle } });
  useDisplayPrefsStore.setState({ ...DEFAULT_DISPLAY_PREFS });
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('display prefs store', () => {
  it('changes the text size on the page and saves it', () => {
    useDisplayPrefsStore.getState().setTextSize('xlarge');
    expect(useDisplayPrefsStore.getState().textSize).toBe('xlarge');
    expect(rootStyle.fontSize).toBe('150%');
    expect(rootStyle.vars['--icon-scale']).toBe('1.5');
    expect(JSON.parse(fake.data.get(DISPLAY_PREFS_KEY) ?? '{}')).toEqual({ textSize: 'xlarge', messageTime: 'normal' });
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('changing one setting keeps the other', () => {
    useDisplayPrefsStore.getState().setMessageTime('stay');
    useDisplayPrefsStore.getState().setTextSize('large');
    expect(JSON.parse(fake.data.get(DISPLAY_PREFS_KEY) ?? '{}')).toEqual({ textSize: 'large', messageTime: 'stay' });
  });

  it('does nothing for a choice that is already in effect', () => {
    const writes = vi.spyOn(fake, 'setItem');
    useDisplayPrefsStore.getState().setTextSize('standard');
    expect(writes).not.toHaveBeenCalled();
  });

  it('ignores a value that is not a known choice', () => {
    useDisplayPrefsStore.getState().setTextSize('bogus' as never);
    expect(useDisplayPrefsStore.getState().textSize).toBe('standard');
    expect(fake.data.size).toBe(0);
  });

  it('still changes the setting, and says it is not kept, when storage refuses the write', () => {
    fake.failWrites = true;
    useDisplayPrefsStore.getState().setTextSize('large');
    expect(useDisplayPrefsStore.getState().textSize).toBe('large');
    expect(rootStyle.fontSize).toBe('125%');
    expect(useToastStore.getState().toasts.map((toast) => toast.title)).toEqual(['Not saved']);
  });

  it('says it is not kept when storage accepts the write but drops it', () => {
    fake.dropWrites = true;
    useDisplayPrefsStore.getState().setMessageTime('long');
    expect(useDisplayPrefsStore.getState().messageTime).toBe('long');
    expect(useToastStore.getState().toasts.map((toast) => toast.title)).toEqual(['Not saved']);
  });
});
