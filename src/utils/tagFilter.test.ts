import { describe, expect, it } from 'vitest';
import { filterTasksByTag } from './tagFilter.ts';

const tasks = [
  { id: 'a', categoryIds: ['t1'] },
  { id: 'b', categoryIds: ['t1', 't2'] },
  { id: 'c', categoryIds: [] },
  { id: 'd' }, // saved by an older version: no list at all
];

describe('filterTasksByTag', () => {
  it('keeps only tasks with the tag', () => {
    expect(filterTasksByTag(tasks, 't1').map((t) => t.id)).toEqual(['a', 'b']);
    expect(filterTasksByTag(tasks, 't2').map((t) => t.id)).toEqual(['b']);
  });

  it('returns the same array when there is no filter', () => {
    expect(filterTasksByTag(tasks, null)).toBe(tasks);
    expect(filterTasksByTag(tasks, '')).toBe(tasks);
  });

  it('returns nothing for a tag no task has (for example a deleted tag)', () => {
    expect(filterTasksByTag(tasks, 'gone')).toEqual([]);
  });

  it('treats tasks without a tag list as untagged', () => {
    expect(() => filterTasksByTag(tasks, 't1')).not.toThrow();
    expect(filterTasksByTag(tasks, 't1').some((t) => t.id === 'd')).toBe(false);
  });

  it('does not change its input', () => {
    const copy = JSON.stringify(tasks);
    filterTasksByTag(tasks, 't1');
    expect(JSON.stringify(tasks)).toBe(copy);
  });
});
