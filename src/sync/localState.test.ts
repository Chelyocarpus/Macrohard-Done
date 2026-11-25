import { describe, expect, it } from 'vitest';
import { isLocalEmpty } from './localState.ts';

const empty = () => ({
  tasks: [] as unknown[],
  categories: [] as unknown[],
  listGroups: [] as unknown[],
  lists: [{ isSystem: true }, { isSystem: true }] as { isSystem?: boolean }[],
  customTimePresets: [] as unknown[],
  disabledBuiltInPresets: [] as unknown[],
});

describe('isLocalEmpty', () => {
  it('is true for a device with only the built-in lists', () => {
    expect(isLocalEmpty(empty())).toBe(true);
  });

  it.each([
    ['a task', { tasks: [{}] }],
    ['a tag', { categories: [{}] }],
    ['a group', { listGroups: [{}] }],
    ['a custom list', { lists: [{ isSystem: true }, { isSystem: false }] }],
    ['a custom time preset', { customTimePresets: [{}] }],
    ['a hidden built-in preset', { disabledBuiltInPresets: ['morning'] }],
  ])('is false when the device has %s', (_name, change) => {
    expect(isLocalEmpty({ ...empty(), ...change })).toBe(false);
  });
});
