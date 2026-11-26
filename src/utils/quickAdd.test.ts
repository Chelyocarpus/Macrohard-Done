import { describe, expect, it } from 'vitest';
import { matchName, normalizeName, parseQuickAdd, planQuickAdd } from './quickAdd.ts';

// Wednesday 25 November 2026
const NOW = new Date(2026, 10, 25, 10, 0, 0);

const categories = [
  { id: 'c-work', name: 'work' },
  { id: 'c-deep', name: 'Deep Work' },
  { id: 'c-home', name: 'Home' },
];
const lists = [
  { id: 'all', name: 'Tasks', isSystem: true },
  { id: 'my-day', name: 'My Day', isSystem: true },
  { id: 'l-clients', name: 'Clients' },
  { id: 'l-groceries', name: '🛒 Groceries' },
];
const ctx = { categories, lists, now: NOW };

describe('normalizeName / matchName', () => {
  it('ignores capitals, spaces, punctuation and emoji', () => {
    expect(normalizeName('Deep-Work')).toBe('deepwork');
    expect(normalizeName('🛒 Groceries')).toBe('groceries');
  });
  it('prefers a full match over a start', () => {
    expect(matchName(categories, 'work')?.id).toBe('c-work');
  });
  it('accepts a start only when exactly one item has it', () => {
    expect(matchName(categories, 'ho')?.id).toBe('c-home');
    expect(matchName([{ id: 'a', name: 'Work' }, { id: 'b', name: 'Workout' }], 'wor')).toBeNull();
  });
  it('matches nothing for an empty name', () => {
    expect(matchName(categories, '')).toBeNull();
    expect(matchName(categories, '--')).toBeNull();
  });
});

describe('parseQuickAdd', () => {
  it('reads a tag, importance and a date from one title', () => {
    const parsed = parseQuickAdd('Ship invoice #work ! friday', ctx);
    expect(parsed.title).toBe('Ship invoice');
    expect(parsed.tagIds).toEqual(['c-work']);
    expect(parsed.important).toBe(true);
    expect(parsed.dueDate).toEqual(new Date(2026, 10, 27));
    expect(parsed.unmatched).toEqual([]);
  });

  it('puts the symbols anywhere in the title', () => {
    const parsed = parseQuickAdd('#work Ship ! the invoice @Clients tomorrow', ctx);
    expect(parsed.title).toBe('Ship the invoice');
    expect(parsed.listId).toBe('l-clients');
    expect(parsed.dueDate).toEqual(new Date(2026, 10, 26));
  });

  it('finds a list by its name without the emoji, and Tasks by its name', () => {
    expect(parseQuickAdd('Milk @groceries', ctx).listId).toBe('l-groceries');
    expect(parseQuickAdd('Milk @tasks', ctx).listId).toBe('all');
  });

  it('does not offer the smart views as places to store a task', () => {
    const parsed = parseQuickAdd('Milk @myday', ctx);
    expect(parsed.listId).toBeUndefined();
    expect(parsed.title).toBe('Milk @myday');
    expect(parsed.unmatched).toEqual(['@myday']);
  });

  it('takes several tags once each', () => {
    const parsed = parseQuickAdd('Plan #home #work #Home', ctx);
    expect(parsed.tagIds).toEqual(['c-home', 'c-work']);
    expect(parsed.title).toBe('Plan');
  });

  it('matches a tag with a space in its name', () => {
    expect(parseQuickAdd('Write #deepwork', ctx).tagIds).toEqual(['c-deep']);
    expect(parseQuickAdd('Write #deep-work', ctx).tagIds).toEqual(['c-deep']);
  });

  it('ignores punctuation after the name', () => {
    const parsed = parseQuickAdd('Ship it #work, soon', ctx);
    expect(parsed.tagIds).toEqual(['c-work']);
    expect(parsed.title).toBe('Ship it soon');
  });

  it('leaves a tag or list that does not exist in the title and reports it', () => {
    const parsed = parseQuickAdd('Ship invoice #wrok !', ctx);
    expect(parsed.title).toBe('Ship invoice #wrok');
    expect(parsed.important).toBe(true);
    expect(parsed.unmatched).toEqual(['#wrok']);
  });

  it('does not report a number such as #123', () => {
    const parsed = parseQuickAdd('Fix bug #123', ctx);
    expect(parsed.title).toBe('Fix bug #123');
    expect(parsed.unmatched).toEqual([]);
    expect(parsed.recognised).toBe(false);
  });

  it('leaves words that only contain the symbols alone', () => {
    for (const text of ['Great!', 'Mail bob@mail.com', 'Is this ok?!', 'Pay 5 # now', 'Meet @ noon']) {
      const parsed = parseQuickAdd(text, ctx);
      expect(parsed.title).toBe(text);
      expect(parsed.important).toBe(false);
    }
  });

  it('keeps the text as typed when nothing would be left of the title', () => {
    expect(parseQuickAdd('#work', ctx).title).toBe('#work');
    expect(parseQuickAdd('!', ctx).title).toBe('!');
    expect(parseQuickAdd('#work !', ctx).important).toBe(false);
    expect(parseQuickAdd('#work', ctx).tagIds).toEqual([]);
  });

  it('uses the first list and leaves a second one in the title', () => {
    const parsed = parseQuickAdd('Call @Clients @Groceries', ctx);
    expect(parsed.listId).toBe('l-clients');
    expect(parsed.title).toBe('Call @Groceries');
    expect(parsed.unmatched).toEqual(['@Groceries']);
  });

  it('still reads a plain date and leaves a plain title untouched', () => {
    expect(parseQuickAdd('Call Mom tomorrow', ctx).dueDate).toEqual(new Date(2026, 10, 26));
    const plain = parseQuickAdd('Buy  milk', ctx);
    expect(plain.title).toBe('Buy  milk');
    expect(plain.recognised).toBe(false);
  });

  it('copes with empty input', () => {
    expect(parseQuickAdd('   ', ctx).title).toBe('');
    expect(parseQuickAdd('', ctx).recognised).toBe(false);
  });
});

describe('planQuickAdd', () => {
  const base = { categories, lists, now: NOW };

  it('stores the task in the view\'s list unless another one is typed', () => {
    const inList = planQuickAdd('Call', { ...base, view: 'list', currentListId: 'l-groceries' });
    expect(inList.listId).toBe('l-groceries');
    const moved = planQuickAdd('Call @Clients', { ...base, view: 'list', currentListId: 'l-groceries' });
    expect(moved.listId).toBe('l-clients');
  });

  it('keeps what the view needs and adds what was typed', () => {
    const plan = planQuickAdd('Call #work !', { ...base, view: 'category', currentCategoryId: 'c-home' });
    expect(plan.options.categoryIds).toEqual(['c-home', 'c-work']);
    expect(plan.options.important).toBe(true);
    const myDay = planQuickAdd('Call #work', { ...base, view: 'my-day' });
    expect(myDay.options.myDay).toBe(true);
    expect(myDay.listId).toBe('all');
  });

  it('lets a typed date replace the Planned view\'s default', () => {
    const plan = planQuickAdd('Call friday', { ...base, view: 'planned' });
    expect(plan.options.dueDate).toEqual(new Date(2026, 10, 27));
    const none = planQuickAdd('Call', { ...base, view: 'planned' });
    expect(none.options.dueDate).toBeInstanceOf(Date);
  });

  it('adds no empty options for a plain title', () => {
    const plan = planQuickAdd('Call', { ...base, view: 'all' });
    expect(plan.options).toEqual({});
    expect(plan.listId).toBe('all');
    expect(plan.title).toBe('Call');
  });
});
