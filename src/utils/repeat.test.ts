import { describe, expect, it } from 'vitest';
import { computeNextDueDate } from './repeat.ts';

// Local dates, so the tests give the same answer in every time zone
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const ymd = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const next = (task: Parameters<typeof computeNextDueDate>[0], now: Date) => ymd(computeNextDueDate(task, now));

describe('computeNextDueDate', () => {
  it('moves a task that is not late by one interval from its due date', () => {
    expect(next({ repeat: 'daily', dueDate: d(2026, 3, 10) }, d(2026, 3, 10))).toBe('2026-03-11');
    expect(next({ repeat: 'weekly', dueDate: d(2026, 3, 10) }, d(2026, 3, 10))).toBe('2026-03-17');
    expect(next({ repeat: 'daily', repeatInterval: 3, dueDate: d(2026, 3, 10) }, d(2026, 3, 10))).toBe('2026-03-13');
  });

  it('counts months from the original day, so the end of a month does not drift', () => {
    expect(next({ repeat: 'monthly', dueDate: d(2026, 1, 31) }, d(2026, 1, 31))).toBe('2026-02-28');
    // from the 28th of February the next one is the 28th of March, but anchored on the 31st it is the 31st
    expect(next({ repeat: 'monthly', dueDate: d(2026, 1, 31) }, d(2026, 2, 28))).toBe('2026-02-28');
    expect(next({ repeat: 'monthly', dueDate: d(2026, 1, 31) }, d(2026, 3, 1))).toBe('2026-03-31');
  });

  it('moves a task due on a leap day to the end of February in a year without one', () => {
    expect(next({ repeat: 'yearly', dueDate: d(2028, 2, 29) }, d(2028, 2, 29))).toBe('2029-02-28');
  });

  it('crosses a daylight-saving change without skipping or repeating a day', () => {
    // 2026-03-29 is the spring-forward day in Europe, 2026-11-01 the fall-back day in the US; both are 23 or 25 hours long
    expect(next({ repeat: 'daily', dueDate: d(2026, 3, 28) }, d(2026, 3, 28))).toBe('2026-03-29');
    expect(next({ repeat: 'daily', dueDate: d(2026, 3, 29) }, d(2026, 3, 29))).toBe('2026-03-30');
    expect(next({ repeat: 'daily', dueDate: d(2026, 10, 31) }, d(2026, 10, 31))).toBe('2026-11-01');
    expect(next({ repeat: 'daily', dueDate: d(2026, 11, 1) }, d(2026, 11, 1))).toBe('2026-11-02');
  });

  it('a late task is moved to today at the earliest, not into the past', () => {
    // due Monday the 2nd, finished on Wednesday the 4th: the next one is due today (the 4th)
    expect(next({ repeat: 'daily', dueDate: d(2026, 3, 2) }, d(2026, 3, 4))).toBe('2026-03-04');
    expect(next({ repeat: 'weekly', dueDate: d(2026, 3, 2) }, d(2026, 3, 4))).toBe('2026-03-09');
  });

  it('can count from the day it was finished instead of the due date', () => {
    expect(next({ repeat: 'weekly', repeatAnchor: 'completion', dueDate: d(2026, 3, 2) }, d(2026, 3, 4))).toBe('2026-03-11');
  });

  it('a daily task on chosen weekdays lands on the next chosen weekday', () => {
    // Monday to Friday; due Friday the 6th
    const weekdays = [1, 2, 3, 4, 5];
    expect(next({ repeat: 'daily', repeatDays: weekdays, dueDate: d(2026, 3, 6) }, d(2026, 3, 6))).toBe('2026-03-09');
  });

  it('a task that was not touched for years does not run out of steps', () => {
    expect(next({ repeat: 'daily', dueDate: d(2016, 1, 1) }, d(2026, 3, 4))).toBe('2026-03-04');
    // 1 January 2016 was a Friday, so the next Friday on or after Wednesday 4 March 2026 is the 6th
    expect(next({ repeat: 'weekly', dueDate: d(2016, 1, 1) }, d(2026, 3, 4))).toBe('2026-03-06');
  });
});
