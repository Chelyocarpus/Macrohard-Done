import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '../utils/cn.ts';
import { QUICK_ADD_EVENT } from '../hooks/useKeyboardShortcuts.ts';

interface FloatingActionButtonProps {
  onQuickAdd: () => void;
  /** Returns true when the task was created; the typed text is kept when it returns false. */
  onInlineTaskCreate?: (title: string) => boolean;
  className?: string;
  // Immediate state-based positioning (not waiting for DOM)
  isAnySidebarOpening?: boolean;
}

export function FloatingActionButton({
  onQuickAdd,
  onInlineTaskCreate,
  className,
  isAnySidebarOpening = false
}: FloatingActionButtonProps) {
  const [quickAddText, setQuickAddText] = useState('');
  const [isQuickAddMode, setIsQuickAddMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fabContainerRef = useRef<HTMLDivElement>(null);

  // The "N" shortcut: open the bar and put the cursor in it (or just focus it when already open)
  useEffect(() => {
    const open = () => {
      setIsQuickAddMode(true);
      inputRef.current?.focus();
    };
    window.addEventListener(QUICK_ADD_EVENT, open);
    return () => window.removeEventListener(QUICK_ADD_EVENT, open);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Use component ref instead of global query selector for robustness
      if (fabContainerRef.current && !fabContainerRef.current.contains(event.target as Node)) {
        setIsQuickAddMode(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ref callback to focus input when it's mounted
  const inputRefCallback = (element: HTMLInputElement | null) => {
    inputRef.current = element;
    // Focus the input immediately when it's mounted in quick add mode
    if (element && isQuickAddMode) {
      element.focus();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsQuickAddMode(false);
      setQuickAddText('');
    }
  };

  const handleQuickAdd = () => {
    if (quickAddText.trim()) {
      // Create task directly inline if handler is provided
      if (onInlineTaskCreate) {
        // Keep the typed text if creation failed so it isn't lost
        // The bar stays open and focused so several tasks can be typed in a row (Esc closes it)
        if (onInlineTaskCreate(quickAddText.trim())) {
          setQuickAddText('');
          inputRef.current?.focus();
        }
      } else {
        // Fallback to opening modal
        onQuickAdd();
        setQuickAddText('');
        setIsQuickAddMode(false);
      }
    }
  };

  const handleQuickAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd();
    }
  };

  // Is a dialog or side panel open over the page? Every one of them (task details, list and group editors, tag manager,
  // pickers, ...) declares `aria-modal`, so that is what is looked for. (The old check looked for elements by their width
  // class; the pop-up message container has one too, so on a phone it hid this bar for good.)
  //
  // Robustness / pitfalls guarded against:
  // - Bursts of changes in the page cause at most one look per animation frame.
  // - Only the page's own structure is watched (added/removed elements and the `aria-modal` attribute), not every class
  //   change, and there is no timer polling.
  useEffect(() => {
    const check = () => setModalOpen(!!document.querySelector('[aria-modal="true"]'));
    check();
    let frame = 0;
    const scheduleCheck = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        check();
      });
    };
    const observer = new MutationObserver(scheduleCheck);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal'] });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // While a side panel (task details, list or group editor) is open the bar is hidden: the panel has its
  // own buttons, and the bar would only sit on top of the dimmed page. Hidden with CSS rather than
  // unmounted, so a half-typed task is still there when the panel closes.
  const hideBar = isAnySidebarOpening || modalOpen;

  return (
    <div
      ref={fabContainerRef}
      className={cn(
        // The strip itself lets taps through (on a phone it is as wide as the screen but only the button is solid)
        "absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-50 pointer-events-none",
        hideBar ? "hidden" : "flex", // Spans the full available width when shown
        className
      )}
      onKeyDown={handleKeyDown}
    >
      {/* Phones, closed: just a round button in the bottom right corner. Tapping it opens the field below. */}
      {!isQuickAddMode && (
        <button
          type="button"
          onClick={() => setIsQuickAddMode(true)}
          aria-label="Add a task"
          className="sm:hidden pointer-events-auto ml-auto h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0 bg-list text-on-list shadow-lg active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-list focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <Plus size={26} strokeWidth={2.5} aria-hidden="true" />
        </button>
      )}

      {/* A plain surface bar: it reads as an input field, with the one accent colour only on the plus, the
          focus ring and the Add button. A list's own colour never reaches these controls. On a phone it is
          only there while open (the round button above is the closed state). */}
      <div
        className={cn(
          "pointer-events-auto w-full h-12 sm:h-14 items-center gap-3 pl-2.5 sm:pl-3 pr-2.5 sm:pr-3 rounded-[10px] border transition-shadow duration-150",
          "bg-canvas",
          isQuickAddMode ? "flex" : "hidden sm:flex",
          isQuickAddMode
            ? "border-list ring-1 ring-list shadow-lg"
            : "border-line shadow-md hover:shadow-lg"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <span
          aria-hidden="true"
          className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center flex-shrink-0 bg-list text-on-list"
        >
          <Plus size={20} strokeWidth={2.5} />
        </span>
        {/* There is no Esc key on a phone, so the open field gets a way to close it (what was typed is kept) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsQuickAddMode(false);
          }}
          aria-label="Close"
          className="sm:hidden w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-muted hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-list"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {isQuickAddMode ? (
          <>
            <input
              ref={inputRefCallback}
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              onKeyDown={handleQuickAddKeyDown}
              placeholder='Task name, e.g. "Call Mom tomorrow"'
              aria-label="New task name"
              className="flex-1 min-w-0 bg-transparent text-base text-ink placeholder:text-muted border-none outline-none"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleQuickAdd();
              }}
              disabled={!quickAddText.trim()}
              className="px-4 h-8 sm:h-9 rounded-md text-sm font-semibold flex-shrink-0 transition-colors bg-list text-on-list hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-list focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Add
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsQuickAddMode(true);
            }}
            className="flex-1 min-w-0 h-full flex items-center justify-between gap-3 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-list"
          >
            <span className="truncate text-base text-muted">Add a task</span>
            <kbd className="hidden sm:inline [@media(hover:none)]:hidden flex-shrink-0 px-2 py-0.5 rounded-md border border-line bg-sidebar text-xs font-sans text-muted">
              N
            </kbd>
          </button>
        )}
      </div>
    </div>
  );
}
