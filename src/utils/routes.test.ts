import { describe, expect, it } from 'vitest';
import { hashToRoute, isRouteHash, resolveRoute, routeFromState, routeTitle, routeToHash, sameRoute, type Route } from './routes.ts';

const known = {
  lists: [
    { id: 'my-day', isSystem: true },
    { id: 'abc-123', isSystem: false },
    { id: 'we ird/id', isSystem: false },
  ],
  categories: [{ id: 'tag-1' }],
};

describe('routeToHash / hashToRoute', () => {
  const routes: Route[] = [
    { view: 'my-day' },
    { view: 'important' },
    { view: 'planned' },
    { view: 'all' },
    { view: 'search' },
    { view: 'settings' },
    { view: 'list', listId: 'abc-123' },
    { view: 'category', categoryId: 'tag-1' },
  ];

  it('round-trips every kind of place', () => {
    for (const route of routes) expect(hashToRoute(routeToHash(route))).toEqual(route);
  });

  it('writes people-friendly words (Tasks, not "all")', () => {
    expect(routeToHash({ view: 'all' })).toBe('#/tasks');
    expect(routeToHash({ view: 'list', listId: 'abc-123' })).toBe('#/list/abc-123');
    expect(routeToHash({ view: 'category', categoryId: 'tag-1' })).toBe('#/tag/tag-1');
  });

  it('round-trips an id with odd characters', () => {
    const route: Route = { view: 'list', listId: 'we ird/id' };
    expect(routeToHash(route)).toBe('#/list/we%20ird%2Fid');
    expect(hashToRoute(routeToHash(route))).toEqual(route);
  });

  it('writes a list or tag without an id as My Day', () => {
    expect(routeToHash({ view: 'list' })).toBe('#/my-day');
    expect(routeToHash({ view: 'category' })).toBe('#/my-day');
  });

  it('reads nothing from empty, foreign or malformed addresses', () => {
    for (const hash of ['', '#', '#/', '#access_token=abc&type=signup', '#/nope', '#/list', '#/list/', '#/tag/', '#/my-day/extra', '#/list/a/b', '#/list/%E0%A4%A']) {
      expect(hashToRoute(hash)).toBeNull();
    }
  });

  it('ignores an id that is too long to be one of ours', () => {
    expect(hashToRoute(`#/list/${'a'.repeat(101)}`)).toBeNull();
    expect(hashToRoute(`#/list/${'a'.repeat(100)}`)).toEqual({ view: 'list', listId: 'a'.repeat(100) });
  });

  it('only treats #/... as ours', () => {
    expect(isRouteHash('#/my-day')).toBe(true);
    expect(isRouteHash('#/')).toBe(false);
    expect(isRouteHash('')).toBe(false);
    expect(isRouteHash('#access_token=1')).toBe(false);
  });
});

describe('routeFromState', () => {
  it('keeps the id only for the views that use one', () => {
    expect(routeFromState({ currentView: 'list', currentListId: 'abc-123', currentCategoryId: 'tag-1' })).toEqual({ view: 'list', listId: 'abc-123' });
    expect(routeFromState({ currentView: 'category', currentListId: 'abc-123', currentCategoryId: 'tag-1' })).toEqual({ view: 'category', categoryId: 'tag-1' });
    expect(routeFromState({ currentView: 'planned', currentListId: 'abc-123' })).toEqual({ view: 'planned' });
  });
});

describe('sameRoute', () => {
  it('compares the place, not stray ids', () => {
    expect(sameRoute({ view: 'planned' }, { view: 'planned' })).toBe(true);
    expect(sameRoute({ view: 'list', listId: 'a' }, { view: 'list', listId: 'a' })).toBe(true);
    expect(sameRoute({ view: 'list', listId: 'a' }, { view: 'list', listId: 'b' })).toBe(false);
    expect(sameRoute({ view: 'category', categoryId: 'a' }, { view: 'list', listId: 'a' })).toBe(false);
  });
});

describe('resolveRoute', () => {
  it('keeps places that exist', () => {
    expect(resolveRoute({ view: 'list', listId: 'abc-123' }, known)).toEqual({ view: 'list', listId: 'abc-123' });
    expect(resolveRoute({ view: 'category', categoryId: 'tag-1' }, known)).toEqual({ view: 'category', categoryId: 'tag-1' });
    expect(resolveRoute({ view: 'settings' }, known)).toEqual({ view: 'settings' });
  });

  it('falls back to My Day for a deleted list or tag', () => {
    expect(resolveRoute({ view: 'list', listId: 'gone' }, known)).toEqual({ view: 'my-day' });
    expect(resolveRoute({ view: 'category', categoryId: 'gone' }, known)).toEqual({ view: 'my-day' });
    expect(resolveRoute({ view: 'list' }, known)).toEqual({ view: 'my-day' });
  });

  it('does not open a built-in list as a custom one', () => {
    expect(resolveRoute({ view: 'list', listId: 'my-day' }, known)).toEqual({ view: 'my-day' });
  });
});

describe('routeTitle', () => {
  const names = { lists: [{ id: 'abc-123', name: 'Groceries' }], categories: [{ id: 'tag-1', name: 'work' }] };
  it('names the page', () => {
    expect(routeTitle({ view: 'my-day' }, names)).toBe('My Day');
    expect(routeTitle({ view: 'all' }, names)).toBe('Tasks');
    expect(routeTitle({ view: 'list', listId: 'abc-123' }, names)).toBe('Groceries');
    expect(routeTitle({ view: 'category', categoryId: 'tag-1' }, names)).toBe('#work');
  });
  it('has a plain name for a place that is gone', () => {
    expect(routeTitle({ view: 'list', listId: 'x' }, names)).toBe('List');
    expect(routeTitle({ view: 'category', categoryId: 'x' }, names)).toBe('Tag');
  });
});
