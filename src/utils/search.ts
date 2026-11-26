import { differenceInCalendarDays } from 'date-fns';

/**
 * Search and filters for the Search view. Everything here is pure (no stores, no DOM) so it can be
 * unit-tested.
 *
 * Robustness / pitfalls guarded against:
 * - Bounded work: the query is cut to MAX_QUERY_LENGTH characters and MAX_TERMS words, and at most
 *   MAX_RESULTS results are returned. When more matched, `truncated` is true and `total` has the real
 *   count, so the screen can say the list is incomplete instead of pretending it is all there is.
 * - Case, accents and odd characters: both sides are compared without case and accents ("cafe" finds
 *   "Café"), and highlighting maps back to the ORIGINAL text, so letters whose lower-case form has a
 *   different length can't shift the highlight.
 * - Regular-expression characters in the query (".", "(", "*") are plain text: no regex is built from
 *   what the person types.
 * - Damaged saved data: tasks without notes, steps or tag lists, or with an invalid due date, are
 *   treated as "empty", never as an error.
 * - No input is changed; results are new arrays.
 */

export const MAX_QUERY_LENGTH = 100;
export const MAX_TERMS = 6;
export const MAX_RESULTS = 200;

export type DateFilter = 'any' | 'overdue' | 'today' | 'tomorrow' | 'week' | 'none';

export interface SearchFilters {
  /** A list id ('all' is the default "Tasks" list), or null for every list */
  listId: string | null;
  /** A tag (category) id, or null */
  tagId: string | null;
  date: DateFilter;
  importantOnly: boolean;
}

export const NO_FILTERS: SearchFilters = { listId: null, tagId: null, date: 'any', importantOnly: false };

export function hasActiveFilters(filters: SearchFilters): boolean {
  return filters.listId !== null || filters.tagId !== null || filters.date !== 'any' || filters.importantOnly;
}

export interface SearchableTask {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
  important: boolean;
  dueDate?: Date | string;
  listId: string;
  categoryIds?: string[];
  steps?: { title: string }[];
  pinned?: boolean;
  pinnedGlobally?: boolean;
  order: number;
}

export type MatchField = 'title' | 'notes' | 'step' | 'tag';

export interface SearchHit<T> {
  task: T;
  /** Where the words were found (nothing when only filters were used) */
  fields: MatchField[];
}

export interface SearchResult<T> {
  hits: SearchHit<T>[];
  /** How many tasks matched in all, before the MAX_RESULTS cut */
  total: number;
  truncated: boolean;
}

// ---- Text ------------------------------------------------------------------------------------

const COMBINING_MARKS = /[̀-ͯ]/g;

/** Lower-case, without accents. One output string per input character, so positions can be mapped back. */
function normalizeChar(char: string): string {
  return char.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}

export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}

/** Normalized text plus, for each normalized character, the index of the original character it came from. */
function normalizeWithMap(text: string): { norm: string; map: number[] } {
  let norm = '';
  const map: number[] = [];
  let index = 0;
  for (const char of text) {
    const piece = normalizeChar(char);
    for (let i = 0; i < piece.length; i++) map.push(index);
    norm += piece;
    index += char.length;
  }
  return { norm, map };
}

/** The words to look for: normalized, without duplicates, at most MAX_TERMS. */
export function parseQuery(query: string): string[] {
  const words = normalizeText(query.slice(0, MAX_QUERY_LENGTH)).split(/\s+/).filter(Boolean);
  return Array.from(new Set(words)).slice(0, MAX_TERMS);
}

export interface Segment {
  text: string;
  match: boolean;
}

/** Splits `text` into pieces, marking the ones that contain a search word. Joined, the pieces equal `text`. */
/**
 * True when two lists of search words are the same words in the same order (or both are missing).
 * Used by the row's memo check: the Search view makes a new array on each render, so comparing by
 * identity would redraw every row, and ignoring the words leaves old highlights on screen.
 */
export function sameTerms(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((term, index) => term === b[index]);
}

export function highlightSegments(text: string, terms: readonly string[]): Segment[] {
  if (!text || terms.length === 0) return text ? [{ text, match: false }] : [];
  const { norm, map } = normalizeWithMap(text);

  // Ranges in the ORIGINAL text
  const ranges: [number, number][] = [];
  for (const term of terms) {
    if (!term) continue;
    let from = 0;
    for (;;) {
      const at = norm.indexOf(term, from);
      if (at === -1) break;
      const start = map[at];
      const lastChar = map[at + term.length - 1];
      // end = just after the original character that produced the last matched character
      const end = lastChar + (String.fromCodePoint(text.codePointAt(lastChar) ?? 0).length || 1);
      ranges.push([start, end]);
      from = at + term.length;
    }
  }
  if (ranges.length === 0) return [{ text, match: false }];

  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}

/**
 * A short piece of `text` around the first search word, for showing under a result. Whitespace is
 * collapsed; "…" marks what was cut. With no match it is just the start of the text.
 */
export function makeSnippet(text: string, terms: readonly string[], maxLength = 100): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= maxLength) return flat;

  const { norm, map } = normalizeWithMap(flat);
  let at = -1;
  for (const term of terms) {
    const found = term ? norm.indexOf(term) : -1;
    if (found !== -1 && (at === -1 || found < at)) at = found;
  }
  const origin = at === -1 ? 0 : map[at];

  let start = Math.max(0, origin - Math.floor(maxLength / 3));
  const end = Math.min(flat.length, start + maxLength);
  start = Math.max(0, end - maxLength);
  return `${start > 0 ? '…' : ''}${flat.slice(start, end).trim()}${end < flat.length ? '…' : ''}`;
}

// ---- Filters ---------------------------------------------------------------------------------

function toDate(value: Date | string | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whether a task's due date passes the date filter. Days are calendar days, so 23:59 today is "today". */
export function matchesDateFilter(
  dueDate: Date | string | undefined,
  filter: DateFilter,
  completed: boolean,
  now: Date,
): boolean {
  if (filter === 'any') return true;
  const due = toDate(dueDate);
  if (filter === 'none') return due === null;
  if (due === null) return false;
  const days = differenceInCalendarDays(due, now);
  switch (filter) {
    case 'overdue': return days < 0 && !completed; // a finished task is not overdue
    case 'today': return days === 0;
    case 'tomorrow': return days === 1;
    case 'week': return days >= 0 && days <= 6; // today and the next six days
    default: return true;
  }
}

// ---- Search ----------------------------------------------------------------------------------

/**
 * Finds tasks whose title, notes, step titles or tag names contain ALL the words of the query, and that
 * pass the filters. With no words and no filters nothing is returned (the screen shows a hint).
 *
 * Order: open tasks before finished ones, then tasks whose title matched, then the usual order
 * (pinned first, then their position). The sort is stable, so equal tasks never swap between searches.
 */
export function searchTasks<T extends SearchableTask>(
  tasks: readonly T[],
  query: string,
  filters: SearchFilters,
  tagNames: ReadonlyMap<string, string>,
  now: Date = new Date(),
): SearchResult<T> {
  const terms = parseQuery(query);
  if (terms.length === 0 && !hasActiveFilters(filters)) return { hits: [], total: 0, truncated: false };

  const hits: SearchHit<T>[] = [];
  for (const task of tasks) {
    if (filters.listId !== null && task.listId !== filters.listId) continue;
    if (filters.tagId !== null && !(task.categoryIds?.includes(filters.tagId) ?? false)) continue;
    if (filters.importantOnly && !task.important) continue;
    if (!matchesDateFilter(task.dueDate, filters.date, task.completed, now)) continue;

    const fields = new Set<MatchField>();
    if (terms.length > 0) {
      const title = normalizeText(task.title ?? '');
      const notes = normalizeText(task.notes ?? '');
      const steps = (task.steps ?? []).map((step) => normalizeText(step.title ?? ''));
      const tags = (task.categoryIds ?? []).map((id) => normalizeText(tagNames.get(id) ?? ''));

      let allFound = true;
      for (const term of terms) {
        let found = false;
        if (title.includes(term)) { fields.add('title'); found = true; }
        if (notes.includes(term)) { fields.add('notes'); found = true; }
        if (steps.some((step) => step.includes(term))) { fields.add('step'); found = true; }
        if (tags.some((tag) => tag.includes(term))) { fields.add('tag'); found = true; }
        if (!found) { allFound = false; break; }
      }
      if (!allFound) continue;
    }
    hits.push({ task, fields: Array.from(fields) });
  }

  const pinRank = (task: SearchableTask) => (task.pinnedGlobally ? 0 : task.pinned ? 1 : 2);
  const sorted = hits
    .map((hit, index) => ({ hit, index }))
    .sort((a, b) =>
      Number(a.hit.task.completed) - Number(b.hit.task.completed)
      || Number(!a.hit.fields.includes('title')) - Number(!b.hit.fields.includes('title'))
      || pinRank(a.hit.task) - pinRank(b.hit.task)
      || a.hit.task.order - b.hit.task.order
      || a.index - b.index)
    .map(({ hit }) => hit);

  return {
    hits: sorted.slice(0, MAX_RESULTS),
    total: sorted.length,
    truncated: sorted.length > MAX_RESULTS,
  };
}
