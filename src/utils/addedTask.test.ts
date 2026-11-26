import { addDays, startOfDay } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { describeAddedTask } from './addedTask.ts';

describe('describeAddedTask', () => {
  it('says where the task went, with no details when it started plain', () => {
    expect(describeAddedTask({ listName: 'Groceries' })).toEqual({ title: 'Added to Groceries', description: undefined });
  });

  it('says My Day instead of the list when the task is in My Day', () => {
    expect(describeAddedTask({ listName: 'Tasks', myDay: true }).title).toBe('Added to My Day');
  });

  it('names a due date in plain words', () => {
    const today = startOfDay(new Date());
    expect(describeAddedTask({ listName: 'Tasks', dueDate: today }).description).toBe('Due today');
    expect(describeAddedTask({ listName: 'Tasks', dueDate: addDays(today, 1) }).description).toBe('Due tomorrow');
  });

  it('lists everything the task started with, in one line', () => {
    const info = describeAddedTask({ listName: 'Tasks', important: true, dueDate: addDays(startOfDay(new Date()), 1), tagNames: ['home', 'urgent'] });
    expect(info.description).toBe('Due tomorrow · Marked important · Tagged #home #urgent');
  });

  it('ignores a due date that is not a real date', () => {
    expect(describeAddedTask({ listName: 'Tasks', dueDate: new Date(NaN) }).description).toBeUndefined();
  });
});
