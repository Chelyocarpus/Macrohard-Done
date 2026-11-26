import { describe, expect, it } from 'vitest';
import {
  DATE_FORMATS,
  DATE_TIME_PREFS_KEY,
  DEFAULT_DATE_TIME_PREFS,
  TIME_FORMATS,
  parseDateTimePrefs,
  readDateTimePrefs,
  writeDateTimePrefs,
} from './dateFormat.ts';
import {
  formatDate,
  formatClock,
  formatDateTime,
  formatFullDate,
  formatHour,
  formatLongDate,
  formatLongDateTime,
  formatShortDate,
  formatTime,
} from './dateUtils.ts';
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

// A Thursday, far from "today", so the relative words ("Today", a weekday) never apply
const DATE = new Date(2031, 10, 27, 16, 5);
const style = (dateFormat: (typeof DATE_FORMATS)[number]['id'], timeFormat: (typeof TIME_FORMATS)[number]['id'] = '12h') => ({ dateFormat, timeFormat });

describe('parseDateTimePrefs', () => {
  it('keeps known choices', () => {
    expect(parseDateTimePrefs({ dateFormat: 'iso', timeFormat: '24h' })).toEqual({ dateFormat: 'iso', timeFormat: '24h' });
  });

  it('replaces unknown or damaged values one setting at a time, and never throws', () => {
    expect(parseDateTimePrefs({ dateFormat: 'iso', timeFormat: '48h' })).toEqual({ dateFormat: 'iso', timeFormat: '12h' });
    expect(parseDateTimePrefs({ dateFormat: 'weird', timeFormat: '24h' })).toEqual({ dateFormat: 'text-us', timeFormat: '24h' });
    for (const bad of [null, undefined, 5, 'iso', [], { dateFormat: 7, timeFormat: {} }]) {
      expect(parseDateTimePrefs(bad)).toEqual(DEFAULT_DATE_TIME_PREFS);
    }
  });
});

describe('readDateTimePrefs / writeDateTimePrefs', () => {
  it('gives the defaults when nothing is saved', () => {
    expect(readDateTimePrefs(new FakeStorage())).toEqual(DEFAULT_DATE_TIME_PREFS);
  });

  it('reads back what was written', () => {
    const storage = new FakeStorage();
    expect(writeDateTimePrefs(storage, style('dmy-dot', '24h'))).toBe(true);
    expect(readDateTimePrefs(storage)).toEqual(style('dmy-dot', '24h'));
  });

  it('falls back to the defaults for damaged text and for storage that cannot be read', () => {
    const storage = new FakeStorage();
    storage.data.set(DATE_TIME_PREFS_KEY, '{broken');
    expect(readDateTimePrefs(storage)).toEqual(DEFAULT_DATE_TIME_PREFS);
    storage.failReads = true;
    expect(readDateTimePrefs(storage)).toEqual(DEFAULT_DATE_TIME_PREFS);
  });

  it('reports false, and does not throw, when storage refuses the write', () => {
    const storage = new FakeStorage();
    storage.failWrites = true;
    expect(writeDateTimePrefs(storage, style('iso', '24h'))).toBe(false);
  });

  it('reports false when storage accepts the write but does not keep it', () => {
    const storage = new FakeStorage();
    storage.dropWrites = true;
    expect(writeDateTimePrefs(storage, style('iso', '24h'))).toBe(false);
  });

  it('never saves an unknown value', () => {
    const storage = new FakeStorage();
    writeDateTimePrefs(storage, { dateFormat: 'bogus', timeFormat: '99h' } as never);
    expect(JSON.parse(storage.data.get(DATE_TIME_PREFS_KEY) ?? '{}')).toEqual(DEFAULT_DATE_TIME_PREFS);
  });
});

describe('date and time formatting', () => {
  it('writes every date style', () => {
    const expected: Record<string, string> = {
      'text-us': 'Nov 27, 2031',
      'text-eu': '27 Nov 2031',
      iso: '2031-11-27',
      'dmy-dash': '27-11-2031',
      'mdy-slash': '11/27/2031',
      'dmy-dot': '27.11.2031',
    };
    for (const option of DATE_FORMATS) {
      expect(formatFullDate(DATE, style(option.id))).toBe(expected[option.id]);
      expect(formatDate(DATE, style(option.id))).toBe(expected[option.id]);
    }
  });

  it('writes both time styles, with a leading zero only in 24-hour', () => {
    expect(formatTime(DATE, style('iso', '12h'))).toBe('4:05 PM');
    expect(formatTime(DATE, style('iso', '24h'))).toBe('16:05');
    expect(formatTime(new Date(2031, 10, 27, 0, 0), style('iso', '24h'))).toBe('00:00');
    expect(formatTime(new Date(2031, 10, 27, 0, 0), style('iso', '12h'))).toBe('12:00 AM');
    expect(formatTime(new Date(2031, 10, 27, 12, 0), style('iso', '12h'))).toBe('12:00 PM');
  });

  it('writes a time of day given as numbers, and a list hour', () => {
    expect(formatClock(9, 0, style('iso', '12h'))).toBe('9:00 AM');
    expect(formatClock(9, 0, style('iso', '24h'))).toBe('09:00');
    expect(formatClock(18, 45, style('iso', '12h'))).toBe('6:45 PM');
    expect(formatHour(0, style('iso', '12h'))).toBe('12 AM');
    expect(formatHour(15, style('iso', '12h'))).toBe('3 PM');
    expect(formatHour(7, style('iso', '24h'))).toBe('07');
    expect(formatHour(23, style('iso', '24h'))).toBe('23');
  });

  it('combines them', () => {
    expect(formatDateTime(DATE, style('iso', '24h'))).toBe('2031-11-27, 16:05');
    expect(formatLongDate(DATE, style('text-eu'))).toBe('Thursday, 27 Nov 2031');
    expect(formatLongDateTime(DATE, style('dmy-dash', '24h'))).toBe('Thursday, 27-11-2031, 16:05');
    expect(formatShortDate(DATE, style('text-us'))).toBe('Thu, Nov 27');
    expect(formatShortDate(DATE, style('text-eu'))).toBe('Thu, 27 Nov');
    expect(formatShortDate(DATE, style('iso'))).toBe('Thu, 2031-11-27');
  });

  it('keeps the words for today, tomorrow and yesterday in every style', () => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9);
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9);
    for (const option of DATE_FORMATS) {
      expect(formatDate(now, style(option.id))).toBe('Today');
      expect(formatDate(tomorrow, style(option.id))).toBe('Tomorrow');
      expect(formatDate(yesterday, style(option.id))).toBe('Yesterday');
    }
  });

  it('gives an empty text for an invalid date instead of throwing', () => {
    const invalid = new Date('nope');
    expect(formatFullDate(invalid)).toBe('');
    expect(formatDateTime(invalid)).toBe('');
    expect(formatLongDate(invalid)).toBe('');
    expect(formatLongDateTime(invalid)).toBe('');
    expect(formatShortDate(invalid)).toBe('');
  });
});
