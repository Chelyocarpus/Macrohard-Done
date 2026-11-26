import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Search, X, Star, StickyNote, CheckSquare, Tag } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { useCompletionHoldStore } from '../stores/completionHoldStore.ts';
import { TaskItem } from './TaskItem.tsx';
import { cn } from '../utils/cn.ts';
import { focusTaskRowSoon } from '../utils/taskDom.ts';
import { SEARCH_RESULTS_EVENT } from '../hooks/useKeyboardShortcuts.ts';
import { useLayoutMode } from '../hooks/useMediaQuery.ts';
import { isSidebarCollapsed } from '../utils/layout.ts';
import {
  NO_FILTERS,
  MAX_QUERY_LENGTH,
  hasActiveFilters,
  highlightSegments,
  makeSnippet,
  normalizeText,
  parseQuery,
  searchTasks,
  type DateFilter,
  type SearchFilters,
  type SearchHit,
} from '../utils/search.ts';
import type { Task } from '../types/index.ts';

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'any', label: 'Any date' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'none', label: 'No due date' },
];

const SELECT_CLASSES = 'h-9 max-w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink';

/** Text with the search words marked */
function Marked({ text, terms }: { text: string; terms: readonly string[] }) {
  return (
    <>
      {highlightSegments(text, terms).map((segment, index) =>
        segment.match
          ? <mark key={index} className="rounded-sm bg-accent/20 text-inherit">{segment.text}</mark>
          : <span key={index}>{segment.text}</span>,
      )}
    </>
  );
}

/** The line under a result that shows WHERE the words were found when it was not in the title */
function MatchLine({ hit, terms, tagNames }: { hit: SearchHit<Task>; terms: readonly string[]; tagNames: ReadonlyMap<string, string> }) {
  const { task, fields } = hit;
  let icon: ReactNode = null;
  let content: ReactNode = null;

  if (fields.includes('notes') && task.notes) {
    icon = <StickyNote size={12} aria-hidden="true" />;
    content = <><span className="sr-only">In the note: </span><Marked text={makeSnippet(task.notes, terms)} terms={terms} /></>;
  } else if (fields.includes('step')) {
    const step = task.steps.find((s) => terms.some((term) => normalizeText(s.title).includes(term)));
    if (step) {
      icon = <CheckSquare size={12} aria-hidden="true" />;
      content = <><span className="sr-only">In a step: </span><Marked text={step.title} terms={terms} /></>;
    }
  } else if (fields.includes('tag')) {
    const id = task.categoryIds?.find((tagId) => terms.some((term) => normalizeText(tagNames.get(tagId) ?? '').includes(term)));
    const name = id ? tagNames.get(id) : undefined;
    if (name) {
      icon = <Tag size={12} aria-hidden="true" />;
      content = <><span className="sr-only">Tagged </span><Marked text={`#${name}`} terms={terms} /></>;
    }
  }
  if (!content) return null;
  return (
    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{content}</span>
    </div>
  );
}

/**
 * The Search view: one box that looks through every task (titles, notes, steps and tags), with filters
 * for list, tag, date and importance. Results show the list each task is in and where the words were
 * found. Reached with F, Ctrl/Cmd+F or the sidebar's search box (on a wide screen that box is the one to type in,
 * so this view leaves out its own).
 */
export function SearchView() {
  const query = useTaskStore((state) => state.searchQuery);
  const setSearchQuery = useTaskStore((state) => state.setSearchQuery);
  const tasks = useTaskStore((state) => state.tasks);
  const lists = useTaskStore((state) => state.lists);
  const categories = useTaskStore((state) => state.categories);
  const holdPhases = useCompletionHoldStore((state) => state.phases);
  const [filters, setFilters] = useState<SearchFilters>(NO_FILTERS);
  const selectedTaskId = useUiStore((state) => state.selectedTaskId);
  // Clicking a tag in a result's details sets the tag filter here instead of filtering a list
  const tagFilter = useUiStore((state) => state.tagFilter);
  useEffect(() => {
    if (!tagFilter) return;
    setFilters((current) => ({ ...current, tagId: tagFilter }));
    useUiStore.getState().setTagFilter(null);
  }, [tagFilter]);

  // Typing stays instant; the (possibly long) list catches up right behind it
  const deferredQuery = useDeferredValue(query);
  const terms = useMemo(() => parseQuery(deferredQuery), [deferredQuery]);
  const tagNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  const result = useMemo(
    () => searchTasks(tasks, deferredQuery, filters, tagNames),
    [tasks, deferredQuery, filters, tagNames],
  );

  // A task that was just completed stays among the open ones for a moment, like in the lists
  const hits = useMemo(() => {
    const keep = (hit: SearchHit<Task>) => !hit.task.completed || !!holdPhases[hit.task.id];
    return [...result.hits.filter(keep), ...result.hits.filter((hit) => !keep(hit))];
  }, [result.hits, holdPhases]);

  // Tab reaches one result: the selected one, else the first
  const tabbableId = hits.some((hit) => hit.task.id === selectedTaskId) ? selectedTaskId : hits[0]?.task.id;
  const filtersOn = hasActiveFilters(filters);
  const searching = terms.length > 0 || filtersOn;

  // Ticked results that are no longer shown (the words or a filter changed) are unticked, so a bulk action never reaches
  // a task that is not on screen
  const shownKey = searching ? hits.map((hit) => hit.task.id).join('|') : '';
  useEffect(() => {
    useUiStore.getState().retainChecked(shownKey ? shownKey.split('|') : []);
  }, [shownKey]);
  const selectableLists = lists.filter((list) => !list.isSystem || list.id === 'all');
  const update = (patch: Partial<SearchFilters>) => setFilters((current) => ({ ...current, ...patch }));

  // With the full sidebar beside it, the sidebar's box is where the words are typed
  const layout = useLayoutMode();
  const storedCollapsed = useTaskStore((state) => state.sidebarCollapsed);
  const sidebarHasBox = layout === 'wide' && !isSidebarCollapsed(layout, storedCollapsed);

  const goToResults = () => {
    // Search again with what is in the box right now: the list on screen may still be catching up with
    // the last letters typed
    const fresh = searchTasks(tasks, query, filters, tagNames).hits;
    const first = (fresh.find((hit) => !hit.task.completed) ?? fresh[0])?.task.id;
    if (!first) return;
    useUiStore.getState().selectTask(first);
    focusTaskRowSoon(first, { force: true });
  };

  // Enter or arrow down in the sidebar's box moves into the results
  const goToResultsRef = useRef(goToResults);
  goToResultsRef.current = goToResults;
  useEffect(() => {
    const onResults = () => goToResultsRef.current();
    window.addEventListener(SEARCH_RESULTS_EVENT, onResults);
    return () => window.removeEventListener(SEARCH_RESULTS_EVENT, onResults);
  }, []);

  let status = '';
  if (searching) {
    if (result.total === 0) status = 'No results';
    else if (result.truncated) status = `Showing the first ${result.hits.length} of ${result.total} results. Narrow the search to see the rest.`;
    else status = `${result.total} result${result.total === 1 ? '' : 's'}`;
  }

  return (
    <div className="px-3 py-3 md:px-4 md:py-4">
      <div>
        {/* Search box (not when the sidebar has one) */}
        {!sidebarHasBox && <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="search-input"
            type="search"
            // Opening the view (from F, Ctrl+F or the sidebar) puts the cursor here straight away, so the first
            // letters typed are not lost
            autoFocus
            value={query}
            maxLength={MAX_QUERY_LENGTH}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'Enter') {
                event.preventDefault();
                goToResults();
              } else if (event.key === 'Escape') {
                // First press empties the box, the next one leaves it
                event.preventDefault();
                if (query) setSearchQuery('');
                else event.currentTarget.blur();
              }
            }}
            placeholder="Search tasks, notes, steps and tags"
            aria-label="Search tasks"
            aria-keyshortcuts="f Control+F Meta+F"
            autoComplete="off"
            className="h-11 w-full rounded-[10px] border border-line bg-canvas pl-10 pr-10 text-base text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                document.getElementById('search-input')?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:bg-hover hover:text-ink"
            >
              <X size={16} />
            </button>
          )}
        </div>}

        {/* Filters */}
        <div className={cn(sidebarHasBox ? 'mt-1' : 'mt-3', 'flex flex-wrap items-center gap-2')} role="group" aria-label="Filters">
          <label className="sr-only" htmlFor="search-filter-list">List</label>
          <select
            id="search-filter-list"
            value={filters.listId ?? ''}
            onChange={(event) => update({ listId: event.target.value || null })}
            className={SELECT_CLASSES}
          >
            <option value="">All lists</option>
            {selectableLists.map((list) => (
              <option key={list.id} value={list.id}>{list.id === 'all' ? 'Tasks' : list.name}</option>
            ))}
          </select>

          <label className="sr-only" htmlFor="search-filter-tag">Tag</label>
          <select
            id="search-filter-tag"
            value={filters.tagId ?? ''}
            onChange={(event) => update({ tagId: event.target.value || null })}
            className={SELECT_CLASSES}
          >
            <option value="">All tags</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>#{category.name}</option>
            ))}
          </select>

          <label className="sr-only" htmlFor="search-filter-date">Due date</label>
          <select
            id="search-filter-date"
            value={filters.date}
            onChange={(event) => update({ date: event.target.value as DateFilter })}
            className={SELECT_CLASSES}
          >
            {DATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <button
            type="button"
            aria-pressed={filters.importantOnly}
            onClick={() => update({ importantOnly: !filters.importantOnly })}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors',
              filters.importantOnly
                ? 'border-accent bg-accent/10 text-ink'
                : 'border-line bg-canvas text-muted hover:bg-hover hover:text-ink',
            )}
          >
            <Star size={14} className={filters.importantOnly ? 'fill-current text-important' : ''} aria-hidden="true" />
            Important
          </button>

          {filtersOn && (
            <button
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
              className="h-9 rounded-md px-2 text-sm text-accent hover:bg-accent/10"
            >
              Clear filters
            </button>
          )}
        </div>

        <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-muted">{status}</p>
      </div>

      {/* Results */}
      {!searching ? (
        <div className="px-4 py-10 text-center text-muted">
          <p className="text-base text-ink">Search all your tasks</p>
          <p className="mt-1 text-sm">Type a word, or pick a filter to browse by list, tag, due date or importance.</p>
        </div>
      ) : hits.length === 0 ? (
        <div className="px-4 py-10 text-center text-muted">
          <p className="text-base text-ink">{terms.length > 0 ? `Nothing matches “${query.trim()}”` : 'No tasks match these filters'}</p>
          <p className="mt-1 text-sm">{filtersOn ? 'Try clearing a filter or using fewer words.' : 'Check the spelling or try fewer words.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {hits.map((hit) => (
            <TaskItem
              key={hit.task.id}
              task={hit.task}
              highlight={terms}
              showListName
              extra={<MatchLine hit={hit} terms={terms} tagNames={tagNames} />}
              tabbable={hit.task.id === tabbableId}
            />
          ))}
        </div>
      )}
      <div className="h-24 sm:h-20" aria-hidden="true" />
    </div>
  );
}
