/**
 * Where you are in the app, written as a web address: `#/my-day`, `#/list/<id>`, `#/tag/<id>`, `#/search`, ...
 *
 * Pure (no DOM, no stores), so it can be unit-tested. `hooks/useRouteSync.ts` connects it to the browser's history,
 * which is what makes Back, Forward, reload and shared links work.
 *
 * Robustness / pitfalls guarded against:
 * - Unknown, malformed or hostile addresses (`#/list/`, `#/nope`, `#/list/%E0%A4%A`, a 10,000 character id) never
 *   throw and never become a place: `hashToRoute` returns null.
 * - Links to something that no longer exists (a deleted list or tag, a list of another profile) are not followed
 *   blindly: `resolveRoute` falls back to My Day instead of showing an empty page called "List".
 * - Other things that use the address hash (a sign-in redirect such as `#access_token=...`) are not ours:
 *   only hashes that start with `#/` are read as routes (`isRouteHash`), everything else is left alone.
 * - Ids are percent-encoded on the way out and decoded on the way in, so an id with odd characters round-trips.
 */
import type { Category, TaskList, ViewType } from '../types/index.ts';

export interface Route {
  view: ViewType;
  listId?: string;
  categoryId?: string;
}

/** The longest id read from an address. Real ids are 36 characters; anything past this is not one of ours. */
const MAX_ID_LENGTH = 100;

/** The address word of each view that has no id. (The Tasks view is called "all" inside the app, "tasks" for people.) */
const VIEW_SLUGS = {
  'my-day': 'my-day',
  important: 'important',
  planned: 'planned',
  all: 'tasks',
  search: 'search',
  settings: 'settings',
} as const;

type PlainView = keyof typeof VIEW_SLUGS;

const SLUG_TO_VIEW = new Map<string, PlainView>(
  (Object.entries(VIEW_SLUGS) as [PlainView, string][]).map(([view, slug]) => [slug, view]),
);

export const DEFAULT_ROUTE: Route = { view: 'my-day' };

/** The route the store's navigation fields describe. */
export function routeFromState(state: { currentView: ViewType; currentListId?: string; currentCategoryId?: string }): Route {
  if (state.currentView === 'list') return { view: 'list', listId: state.currentListId };
  if (state.currentView === 'category') return { view: 'category', categoryId: state.currentCategoryId };
  return { view: state.currentView };
}

/** `#/my-day`, `#/list/<id>`, `#/tag/<id>`. A list or tag route without an id is written as My Day (it has no place to point at). */
export function routeToHash(route: Route): string {
  if (route.view === 'list') return route.listId ? `#/list/${encodeURIComponent(route.listId)}` : `#/${VIEW_SLUGS['my-day']}`;
  if (route.view === 'category') return route.categoryId ? `#/tag/${encodeURIComponent(route.categoryId)}` : `#/${VIEW_SLUGS['my-day']}`;
  return `#/${VIEW_SLUGS[route.view]}`;
}

/** True for addresses this module writes (`#/...`). The empty address and other uses of the hash are not routes. */
export function isRouteHash(hash: string): boolean {
  return hash.startsWith('#/') && hash.length > 2;
}

function decodeId(raw: string): string | null {
  if (!raw || raw.length > MAX_ID_LENGTH * 3) return null; // *3: room for percent-encoding
  try {
    const id = decodeURIComponent(raw);
    return id && id.length <= MAX_ID_LENGTH ? id : null;
  } catch {
    return null; // a broken %-escape
  }
}

/** Reads an address. Null means "not a place we know" (empty, someone else's hash, or malformed). */
export function hashToRoute(hash: string): Route | null {
  if (!isRouteHash(hash)) return null;
  const [kind, rest, ...extra] = hash.slice(2).split('/');
  if (extra.length > 0) return null;
  if (rest === undefined) {
    const view = SLUG_TO_VIEW.get(kind);
    return view ? { view } : null;
  }
  const id = decodeId(rest);
  if (!id) return null;
  if (kind === 'list') return { view: 'list', listId: id };
  if (kind === 'tag') return { view: 'category', categoryId: id };
  return null;
}

export function sameRoute(a: Route, b: Route): boolean {
  if (a.view !== b.view) return false;
  if (a.view === 'list') return a.listId === b.listId;
  if (a.view === 'category') return a.categoryId === b.categoryId;
  return true;
}

/** What exists right now (the lists and tags of the profile that is open). */
export interface KnownPlaces {
  lists: Pick<TaskList, 'id' | 'isSystem'>[];
  categories: Pick<Category, 'id'>[];
}

/** The route itself when it points at something that exists, My Day when it does not. */
export function resolveRoute(route: Route, known: KnownPlaces): Route {
  if (route.view === 'list') {
    return known.lists.some((list) => list.id === route.listId && !list.isSystem) ? route : DEFAULT_ROUTE;
  }
  if (route.view === 'category') {
    return known.categories.some((category) => category.id === route.categoryId) ? route : DEFAULT_ROUTE;
  }
  return route;
}

const VIEW_TITLES: Record<PlainView, string> = {
  'my-day': 'My Day',
  important: 'Important',
  planned: 'Planned',
  all: 'Tasks',
  search: 'Search',
  settings: 'Settings',
};

/** The page's name, as shown in the tab and in the browser's history list ("Groceries", "#work", "Planned"). */
export function routeTitle(route: Route, known: { lists: Pick<TaskList, 'id' | 'name'>[]; categories: Pick<Category, 'id' | 'name'>[] }): string {
  if (route.view === 'list') return known.lists.find((list) => list.id === route.listId)?.name || 'List';
  if (route.view === 'category') {
    const category = known.categories.find((c) => c.id === route.categoryId);
    return category ? `#${category.name}` : 'Tag';
  }
  return VIEW_TITLES[route.view];
}
