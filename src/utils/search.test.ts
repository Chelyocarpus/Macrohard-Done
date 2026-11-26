import { describe, expect, it } from 'vitest';
import {
  MAX_QUERY_LENGTH,
  MAX_RESULTS,
  MAX_TERMS,
  NO_FILTERS,
  highlightSegments,
  makeSnippet,
  matchesDateFilter,
  parseQuery,
  sameTerms,
  searchTasks,
  type SearchableTask,
  type SearchFilters,
} from './search.ts';

const NOW = new Date(2026, 10, 23, 15, 30); // Mon 23 Nov 2026, 15:30
const day = (offset: number, hour = 12) => new Date(2026, 10, 23 + offset, hour);

let counter = 0;
const task = (over: Partial<SearchableTask> = {}): SearchableTask => ({
  id: `t${++counter}`,
  title: 'Untitled',
  completed: false,
  important: false,
  listId: 'all',
  order: counter,
  ...over,
});
const tagNames = new Map([['tag-errands', 'Errands'], ['tag-work', 'Work']]);
const run = (tasks: SearchableTask[], query: string, filters: Partial<SearchFilters> = {}) =>
  searchTasks(tasks, query, { ...NO_FILTERS, ...filters }, tagNames, NOW);
const ids = (r: ReturnType<typeof run>) => r.hits.map((h) => h.task.title);

describe('parseQuery', () => {
  it('splits into lower-case words without accents or duplicates', () => {
    expect(parseQuery('  Café   CAFÉ  Bread ')).toEqual(['cafe', 'bread']);
  });
  it('is empty for blank input', () => {
    expect(parseQuery('')).toEqual([]);
    expect(parseQuery('   ')).toEqual([]);
  });
  it('is bounded in length and in number of words', () => {
    expect(parseQuery('a b c d e f g h i j')).toHaveLength(MAX_TERMS);
    expect(parseQuery('x'.repeat(MAX_QUERY_LENGTH * 3))[0]).toHaveLength(MAX_QUERY_LENGTH);
  });
});

describe('searchTasks: words', () => {
  it('finds words in the title, notes, steps and tag names, ignoring case and accents', () => {
    const tasks = [
      task({ title: 'Buy CAFÉ beans' }),
      task({ title: 'Plan', notes: 'ask about the cafe menu' }),
      task({ title: 'Trip', steps: [{ title: 'Book a cafe' }] }),
      task({ title: 'Shopping', categoryIds: ['tag-errands'] }),
      task({ title: 'Unrelated' }),
    ];
    expect(ids(run(tasks, 'cafe'))).toEqual(['Buy CAFÉ beans', 'Plan', 'Trip']);
    expect(ids(run(tasks, 'ERRANDS'))).toEqual(['Shopping']);
    const fields = run(tasks, 'cafe').hits.map((h) => h.fields);
    expect(fields).toEqual([['title'], ['notes'], ['step']]);
  });

  it('needs every word, in any order and in any field', () => {
    const tasks = [
      task({ title: 'Call Anna', notes: 'about the invoice' }),
      task({ title: 'Call Bob' }),
    ];
    expect(ids(run(tasks, 'invoice call'))).toEqual(['Call Anna']);
    expect(ids(run(tasks, 'call'))).toEqual(['Call Anna', 'Call Bob']);
  });

  it('treats regular-expression characters as plain text', () => {
    const tasks = [task({ title: 'Fix (urgent) bug' }), task({ title: 'Fix urgent bug' })];
    expect(ids(run(tasks, '(urgent)'))).toEqual(['Fix (urgent) bug']);
    expect(() => run(tasks, '[[[ .* \\')).not.toThrow();
  });

  it('returns nothing without words and without filters', () => {
    const r = run([task()], '   ');
    expect(r).toEqual({ hits: [], total: 0, truncated: false });
  });

  it('does not fail on damaged tasks', () => {
    const broken = [{ id: 'x', title: undefined as unknown as string, completed: false, important: false, listId: 'all', order: 0 }];
    expect(() => run(broken, 'a')).not.toThrow();
    expect(run(broken, 'a').hits).toEqual([]);
  });
});

describe('searchTasks: order', () => {
  it('puts open tasks first, then title matches, then the usual order', () => {
    const tasks = [
      task({ title: 'done milk', completed: true }),
      task({ title: 'plain', notes: 'milk here' }),
      task({ title: 'milk run' }),
    ];
    expect(ids(run(tasks, 'milk'))).toEqual(['milk run', 'plain', 'done milk']);
  });
  it('is stable for equal tasks', () => {
    const tasks = [task({ title: 'a x', order: 1 }), task({ title: 'b x', order: 1 })];
    expect(ids(run(tasks, 'x'))).toEqual(['a x', 'b x']);
  });
  it('shows pinned tasks before others of the same kind', () => {
    const tasks = [task({ title: 'x one', order: 0 }), task({ title: 'x two', order: 5, pinned: true })];
    expect(ids(run(tasks, 'x'))).toEqual(['x two', 'x one']);
  });
});

describe('searchTasks: filters', () => {
  const tasks = [
    task({ title: 'A', listId: 'all', important: true, dueDate: day(0), categoryIds: ['tag-work'] }),
    task({ title: 'B', listId: 'list-1', dueDate: day(1), categoryIds: ['tag-errands', 'tag-work'] }),
    task({ title: 'C', listId: 'list-1', dueDate: day(-2) }),
    task({ title: 'D', listId: 'list-1' }),
    task({ title: 'E', listId: 'list-1', dueDate: day(-2), completed: true }),
  ];

  it('works with filters alone (browse)', () => {
    expect(ids(run(tasks, '', { listId: 'list-1' }))).toEqual(['B', 'C', 'D', 'E']);
    expect(ids(run(tasks, '', { importantOnly: true }))).toEqual(['A']);
    expect(ids(run(tasks, '', { tagId: 'tag-work' }))).toEqual(['A', 'B']);
  });

  it('combines filters and words', () => {
    expect(ids(run(tasks, 'b', { tagId: 'tag-errands' }))).toEqual(['B']);
    // A and B both have the tag "Work", but only B is in the list
    expect(ids(run(tasks, 'work', { listId: 'list-1' }))).toEqual(['B']);
    expect(ids(run(tasks, 'work'))).toEqual(['A', 'B']);
  });

  it('filters by date in calendar days', () => {
    expect(ids(run(tasks, '', { date: 'today' }))).toEqual(['A']);
    expect(ids(run(tasks, '', { date: 'tomorrow' }))).toEqual(['B']);
    expect(ids(run(tasks, '', { date: 'none' }))).toEqual(['D']);
    expect(ids(run(tasks, '', { date: 'week' }))).toEqual(['A', 'B']);
  });

  it('does not call a finished task overdue', () => {
    expect(ids(run(tasks, '', { date: 'overdue' }))).toEqual(['C']);
  });
});

describe('matchesDateFilter', () => {
  it('a task due late tonight is today, not overdue', () => {
    expect(matchesDateFilter(day(0, 23), 'today', false, NOW)).toBe(true);
    expect(matchesDateFilter(day(0, 23), 'overdue', false, NOW)).toBe(false);
    expect(matchesDateFilter(day(0, 0), 'overdue', false, NOW)).toBe(false);
  });
  it('"next 7 days" is today through the sixth day after', () => {
    expect(matchesDateFilter(day(6), 'week', false, NOW)).toBe(true);
    expect(matchesDateFilter(day(7), 'week', false, NOW)).toBe(false);
    expect(matchesDateFilter(day(-1), 'week', false, NOW)).toBe(false);
  });
  it('treats an invalid or missing date as no date', () => {
    expect(matchesDateFilter('not a date', 'none', false, NOW)).toBe(true);
    expect(matchesDateFilter('not a date', 'today', false, NOW)).toBe(false);
    expect(matchesDateFilter(undefined, 'overdue', false, NOW)).toBe(false);
    expect(matchesDateFilter(undefined, 'any', false, NOW)).toBe(true);
  });
  it('reads dates saved as text', () => {
    expect(matchesDateFilter(day(1).toISOString(), 'tomorrow', false, NOW)).toBe(true);
  });
});

describe('searchTasks: limits', () => {
  it('cuts the list at MAX_RESULTS and says so', () => {
    const many = Array.from({ length: MAX_RESULTS + 25 }, (_, i) => task({ title: `item ${i}` }));
    const r = run(many, 'item');
    expect(r.hits).toHaveLength(MAX_RESULTS);
    expect(r.total).toBe(MAX_RESULTS + 25);
    expect(r.truncated).toBe(true);
  });
  it('does not mark a complete list as cut', () => {
    const r = run([task({ title: 'x' })], 'x');
    expect(r.truncated).toBe(false);
    expect(r.total).toBe(1);
  });
  it('never changes the tasks it is given', () => {
    const tasks = [task({ title: 'b x' }), task({ title: 'a x', completed: true })];
    const copy = JSON.stringify(tasks);
    run(tasks, 'x');
    expect(JSON.stringify(tasks)).toBe(copy);
  });
});

describe('highlightSegments', () => {
  const joined = (s: { text: string }[]) => s.map((p) => p.text).join('');

  it('marks matches and keeps the original text', () => {
    const segments = highlightSegments('Buy Café beans', ['cafe']);
    expect(segments).toEqual([
      { text: 'Buy ', match: false },
      { text: 'Café', match: true },
      { text: ' beans', match: false },
    ]);
  });
  it('joins back to the exact original for any input', () => {
    for (const text of ['Straße straße', 'İstanbul', 'a😀b😀c', 'x'.repeat(50), 'ÀÉÎ  õü']) {
      for (const terms of [['a'], ['e'], ['ss'], ['i'], ['x'], ['😀']]) {
        expect(joined(highlightSegments(text, terms))).toBe(text);
      }
    }
  });
  it('merges overlapping and touching matches', () => {
    expect(highlightSegments('abcd', ['ab', 'bc', 'cd'])).toEqual([{ text: 'abcd', match: true }]);
  });
  it('highlights every occurrence', () => {
    const marks = highlightSegments('go go go', ['go']).filter((s) => s.match);
    expect(marks).toHaveLength(3);
  });
  it('returns the plain text when nothing matches or there are no terms', () => {
    expect(highlightSegments('hello', ['zzz'])).toEqual([{ text: 'hello', match: false }]);
    expect(highlightSegments('hello', [])).toEqual([{ text: 'hello', match: false }]);
    expect(highlightSegments('', ['a'])).toEqual([]);
  });
  it('does not shift when an accented capital lower-cases to a longer string', () => {
    const segments = highlightSegments('İstanbul city', ['city']);
    expect(segments.filter((s) => s.match).map((s) => s.text)).toEqual(['city']);
  });
});

describe('makeSnippet', () => {
  it('returns short text unchanged and collapses whitespace', () => {
    expect(makeSnippet('a   b\n\nc', ['b'])).toBe('a b c');
  });
  it('centres long text on the first match and marks the cuts', () => {
    const text = `${'start '.repeat(30)}NEEDLE ${'end '.repeat(30)}`;
    const snippet = makeSnippet(text, ['needle'], 60);
    expect(snippet).toContain('NEEDLE');
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
    expect(snippet.length).toBeLessThanOrEqual(62);
  });
  it('starts at the beginning when there is no match', () => {
    const text = 'word '.repeat(60);
    const snippet = makeSnippet(text, ['zzz'], 40);
    expect(snippet.startsWith('word')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });
  it('does not end in the middle of nothing for a match at the very end', () => {
    const text = `${'x '.repeat(100)}NEEDLE`;
    const snippet = makeSnippet(text, ['needle'], 40);
    expect(snippet.endsWith('NEEDLE')).toBe(true);
  });
});

describe('sameTerms', () => {
  it('treats the same words in the same order as equal, whatever the array identity', () => {
    expect(sameTerms(['milk', 'buy'], ['milk', 'buy'])).toBe(true);
    expect(sameTerms(undefined, undefined)).toBe(true);
  });

  it('notices a longer, shorter, reordered or changed query (so highlights are redrawn)', () => {
    expect(sameTerms(['mil'], ['milk'])).toBe(false);
    expect(sameTerms(['milk'], ['milk', 'buy'])).toBe(false);
    expect(sameTerms(['milk', 'buy'], ['buy', 'milk'])).toBe(false);
  });

  it('notices words appearing or disappearing', () => {
    expect(sameTerms(undefined, ['milk'])).toBe(false);
    expect(sameTerms(['milk'], undefined)).toBe(false);
    expect(sameTerms([], ['milk'])).toBe(false);
  });
});
