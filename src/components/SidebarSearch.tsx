import { Search, X } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { FOCUS_SEARCH_EVENT, SEARCH_RESULTS_EVENT } from '../hooks/useKeyboardShortcuts.ts';
import { MAX_QUERY_LENGTH } from '../utils/search.ts';
import { cn } from '../utils/cn.ts';

export const SIDEBAR_SEARCH_ID = 'sidebar-search-input';

/**
 * The search box at the top of the labelled sidebar.
 *
 * - `live` (wide screens): a real text field. Clicking only puts the cursor in it; the Search view opens, with the
 *   results beside the sidebar, as soon as there is something typed, and the cursor stays where it is.
 * - not live (phones): a button that opens the Search view, which has its own box (the Lists screen is a screen of its own).
 */
export function SidebarSearch({ live }: { live: boolean }) {
  const query = useTaskStore((state) => state.searchQuery);
  const searching = useTaskStore((state) => state.currentView === 'search');

  if (!live) {
    return (
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent(FOCUS_SEARCH_EVENT))}
        aria-keyshortcuts="f Control+F Meta+F"
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border bg-canvas px-3 text-left text-sm text-muted transition-colors hover:bg-hover',
          searching ? 'border-accent text-ink' : 'border-line',
        )}
      >
        <Search size={16} aria-hidden="true" />
        <span className="flex-1 truncate">{query || 'Search'}</span>
      </button>
    );
  }

  const showResults = () => {
    const { currentView, setView } = useTaskStore.getState();
    if (currentView !== 'search') setView('search');
  };

  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id={SIDEBAR_SEARCH_ID}
        type="search"
        value={query}
        maxLength={MAX_QUERY_LENGTH}
        onChange={(event) => {
          useTaskStore.getState().setSearchQuery(event.target.value);
          if (event.target.value) showResults();
        }}
        // Coming back to words left in the box shows their results again
        onFocus={() => { if (query) showResults(); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter') {
            event.preventDefault();
            showResults();
            window.dispatchEvent(new CustomEvent(SEARCH_RESULTS_EVENT));
          } else if (event.key === 'Escape') {
            // First press empties the box, the next one leaves it
            event.preventDefault();
            if (query) useTaskStore.getState().setSearchQuery('');
            else event.currentTarget.blur();
          }
        }}
        placeholder="Search"
        aria-label="Search tasks"
        aria-keyshortcuts="f Control+F Meta+F"
        autoComplete="off"
        className={cn(
          'h-10 w-full rounded-md border bg-canvas pl-9 pr-9 text-sm text-ink placeholder:text-muted transition-colors hover:bg-hover focus:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-search-cancel-button]:hidden',
          searching ? 'border-accent' : 'border-line',
        )}
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            useTaskStore.getState().setSearchQuery('');
            document.getElementById(SIDEBAR_SEARCH_ID)?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:bg-hover hover:text-ink"
        >
          <X size={14} aria-hidden="true" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 text-xs font-sans text-muted [@media(hover:none)]:hidden">F</kbd>
      )}
    </div>
  );
}
