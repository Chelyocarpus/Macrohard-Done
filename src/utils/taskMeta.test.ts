import { describe, it, expect } from 'vitest';
import type { Category } from '../types/index.ts';
import { repeatLabel, reminderLabel, dueLabel, stepSegments, splitTags, noteExcerpt } from './taskMeta.ts';

const tag = (id: string): Category => ({ id, name: id, createdAt: new Date(0), updatedAt: new Date(0) });

describe('repeatLabel', () => {
  it('is empty without a repeat', () => {
    expect(repeatLabel({})).toBe('');
    expect(repeatLabel({ repeat: 'none' })).toBe('');
  });

  it('uses one word for every 1 and "Every N units" otherwise', () => {
    expect(repeatLabel({ repeat: 'weekly' })).toBe('Weekly');
    expect(repeatLabel({ repeat: 'daily', repeatInterval: 3 })).toBe('Every 3 days');
  });

  it('treats a damaged interval as 1', () => {
    expect(repeatLabel({ repeat: 'monthly', repeatInterval: 0 })).toBe('Monthly');
    expect(repeatLabel({ repeat: 'monthly', repeatInterval: -2 })).toBe('Monthly');
    expect(repeatLabel({ repeat: 'monthly', repeatInterval: Number.NaN })).toBe('Monthly');
  });

  it('adds the weekdays in order in the long form', () => {
    expect(repeatLabel({ repeat: 'weekly', repeatInterval: 1, repeatDays: [6, 2] }, true)).toBe('Every week on Tue, Sat');
  });
});

describe('reminderLabel', () => {
  it('is empty without a reminder', () => {
    expect(reminderLabel({})).toBe('');
  });

  it('shows only the time on the due day', () => {
    const due = new Date(2026, 10, 21, 17, 0);
    expect(reminderLabel({ dueDate: due, reminder: new Date(2026, 10, 21, 9, 0) })).toBe('Remind at 9:00 AM');
  });

  it('adds the day when it is another day', () => {
    const text = reminderLabel({ dueDate: new Date(2026, 10, 21, 17, 0), reminder: new Date(2026, 10, 19, 9, 0) });
    expect(text.startsWith('Remind ')).toBe(true);
    expect(text.endsWith(', 9:00 AM')).toBe(true);
    expect(text).not.toContain('Remind at');
  });
});

describe('stepSegments', () => {
  it('has no bar without steps', () => {
    expect(stepSegments(0, 0)).toEqual({ segments: 0, filled: 0 });
  });

  it('is one segment per step up to 10', () => {
    expect(stepSegments(2, 5)).toEqual({ segments: 5, filled: 2 });
    expect(stepSegments(0, 5)).toEqual({ segments: 5, filled: 0 });
    expect(stepSegments(5, 5)).toEqual({ segments: 5, filled: 5 });
  });

  it('caps the bar and never shows partial progress as empty or as finished', () => {
    expect(stepSegments(1, 40).segments).toBe(10);
    expect(stepSegments(1, 40).filled).toBe(1);
    expect(stepSegments(39, 40).filled).toBe(9);
    expect(stepSegments(40, 40).filled).toBe(10);
  });

  it('clamps a count outside the range', () => {
    expect(stepSegments(9, 3)).toEqual({ segments: 3, filled: 3 });
    expect(stepSegments(-1, 3)).toEqual({ segments: 3, filled: 0 });
  });
});

describe('splitTags', () => {
  const categories = ['a', 'b', 'c', 'd', 'e'].map(tag);

  it('shows all tags that fit', () => {
    expect(splitTags(['a', 'b'], categories, 2)).toEqual({ shown: [categories[0], categories[1]], hidden: [] });
  });

  it('shows a lone extra tag instead of "+1"', () => {
    const { shown, hidden } = splitTags(['a', 'b', 'c'], categories, 2);
    expect(shown.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(hidden).toEqual([]);
  });

  it('hides the rest from two extra tags on', () => {
    const { shown, hidden } = splitTags(['a', 'b', 'c', 'd'], categories, 2);
    expect(shown.map((c) => c.id)).toEqual(['a', 'b']);
    expect(hidden.map((c) => c.id)).toEqual(['c', 'd']);
  });

  it('skips tags that no longer exist', () => {
    expect(splitTags(['gone', 'a'], categories, 3).shown.map((c) => c.id)).toEqual(['a']);
  });

  it('does not break with a limit below zero', () => {
    expect(splitTags(['a', 'b', 'c'], categories, -1).shown).toEqual([]);
  });
});

describe('dueLabel', () => {
  it('says "Due" for a date that is not late and "Overdue:" for one that is', () => {
    const date = new Date(2020, 0, 15);
    expect(dueLabel(date, false)).toBe(`Due ${'Jan 15, 2020'}`);
    expect(dueLabel(date, true)).toBe('Overdue: Jan 15, 2020');
  });
});

describe('noteExcerpt', () => {
  it('is empty without a note', () => {
    expect(noteExcerpt(undefined)).toBe('');
    expect(noteExcerpt('\n  \n')).toBe('');
  });

  it('drops Markdown marks and joins the lines', () => {
    expect(noteExcerpt('\n## **Flights** first\nsecond')).toBe('Flights first · second');
    expect(noteExcerpt('- [ ] call Maria')).toBe('call Maria');
    expect(noteExcerpt('1. Pull the numbers')).toBe('Pull the numbers');
  });

  it('cuts a very long note', () => {
    const text = noteExcerpt('word '.repeat(500), 50);
    expect(text.length).toBeLessThanOrEqual(51);
    expect(text.endsWith('…')).toBe(true);
  });
});
