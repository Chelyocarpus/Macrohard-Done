import { describe, expect, it } from 'vitest';
import { withCount } from './accessibleNames.ts';
import { isModalOpen } from '../hooks/useModalOpen.ts';

describe('withCount', () => {
  it('keeps the visible name first and adds the count after a comma', () => {
    expect(withCount('My Day', 3)).toBe('My Day, 3 open');
  });

  it('says only the name when nothing is open', () => {
    expect(withCount('Planned', 0)).toBe('Planned');
  });

  it('does not print a negative or missing count', () => {
    expect(withCount('Inbox', -1)).toBe('Inbox');
    expect(withCount('Inbox', Number.NaN)).toBe('Inbox');
  });
});

describe('isModalOpen', () => {
  const root = (found: boolean) => ({ querySelector: (selector: string) => (found && selector === '[aria-modal="true"]' ? {} : null) }) as unknown as ParentNode;

  it('is true while an element declares aria-modal', () => {
    expect(isModalOpen(root(true))).toBe(true);
  });

  it('is false when no dialog is open', () => {
    expect(isModalOpen(root(false))).toBe(false);
  });
});
