import { describe, expect, it } from 'vitest';
import { getPlannedDate, isPlanned, sortByPlannedDate } from './planned.ts';

const d = (y: number, m: number, day: number, h = 0) => new Date(y, m - 1, day, h);

describe('getPlannedDate / isPlanned', () => {
  it('uses the due date when there is one', () => {
    expect(getPlannedDate({ dueDate: d(2026, 3, 10) })).toEqual(d(2026, 3, 10));
    expect(isPlanned({ dueDate: d(2026, 3, 10) })).toBe(true);
  });

  it('counts a task with only a reminder as planned, on the reminder day', () => {
    expect(getPlannedDate({ reminder: d(2026, 3, 12, 9) })).toEqual(d(2026, 3, 12, 9));
    expect(isPlanned({ reminder: d(2026, 3, 12, 9) })).toBe(true);
  });

  it('prefers the due date over the reminder', () => {
    expect(getPlannedDate({ dueDate: d(2026, 3, 10), reminder: d(2026, 3, 5) })).toEqual(d(2026, 3, 10));
  });

  it('does not count a task with neither', () => {
    expect(getPlannedDate({})).toBeUndefined();
    expect(isPlanned({})).toBe(false);
  });

  it('ignores damaged dates and falls back to the other one', () => {
    const bad = new Date('garbage');
    expect(isPlanned({ dueDate: bad })).toBe(false);
    expect(getPlannedDate({ dueDate: bad, reminder: d(2026, 3, 12) })).toEqual(d(2026, 3, 12));
  });

  it('accepts dates stored as strings', () => {
    expect(isPlanned({ reminder: '2026-03-12T09:00:00.000Z' as unknown as Date })).toBe(true);
  });
});

describe('sortByPlannedDate', () => {
  it('orders by due date or reminder, earliest first', () => {
    const a = { id: 'a', dueDate: d(2026, 3, 20) };
    const b = { id: 'b', reminder: d(2026, 3, 5) };
    const c = { id: 'c', dueDate: d(2026, 3, 10), reminder: d(2026, 3, 1) };
    expect(sortByPlannedDate([a, b, c]).map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('keeps the incoming order for ties and puts unplanned tasks last, without changing the input', () => {
    const a = { id: 'a', dueDate: d(2026, 3, 10) };
    const none = { id: 'none', dueDate: undefined };
    const b = { id: 'b', reminder: d(2026, 3, 10) };
    const input = [none, a, b];
    expect(sortByPlannedDate(input).map((t) => t.id)).toEqual(['a', 'b', 'none']);
    expect(input.map((t) => t.id)).toEqual(['none', 'a', 'b']);
  });
});
