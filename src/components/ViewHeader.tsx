import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from './ui/Button.tsx';

interface ViewHeaderProps {
  /** The icon, emoji or # shown in the tinted tile */
  glyph: ReactNode;
  title: string;
  /** The quiet line under the title (date, number of open tasks) */
  subtitle?: string;
  /** True on a page that has its own color (a list or tag with one): adds a soft wash behind the header */
  tinted: boolean;
  /** Phone layout only: back to the Lists screen (a chevron, to leave the room to the title) */
  onBack?: () => void;
  /** Buttons on the right (edit, sort and view, search, ...) */
  actions?: ReactNode;
}

/**
 * The top of every page: a tinted tile with the page's icon, the title with a quiet line beneath it, and the
 * page's buttons on the right. The tile and wash take the list's or tag's color (the blue accent when it has none).
 */
export function ViewHeader({ glyph, title, subtitle, tinted, onBack, actions }: ViewHeaderProps) {
  const titleClass = 'text-2xl md:text-[28px] leading-tight font-semibold text-ink truncate';
  return (
    <header
      className="relative border-b border-line p-4 pt-[max(1rem,env(safe-area-inset-top))] md:p-6 md:pt-6"
      // The same flat tint as the page below it (TaskView), so the two join without a visible step
      style={tinted ? { backgroundColor: 'rgb(var(--c-list) / var(--list-wash))' } : undefined}
    >
      {/* A little more color on the left, fading out into that same tint on the right */}
      {tinted && <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-list/[0.07] to-transparent" />}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5 md:gap-4">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              aria-label="Back to Lists"
              className="md:hidden -ml-2.5 -mr-1 h-11 w-9 flex-shrink-0 p-0 text-accent hover:text-accent"
            >
              <ChevronLeft size={28} aria-hidden="true" />
            </Button>
          )}
          <span
            aria-hidden="true"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-list/[0.14] text-xl md:h-11 md:w-11 md:text-2xl leading-none text-list-text"
          >
            {glyph}
          </span>
          <div className="min-w-0">
            {/* Focusable by code only (not by Tab): navigating moves focus here so screen readers announce the new page */}
            <h2 id="view-title" tabIndex={-1} className={`${titleClass} outline-none`}>{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-0.5 sm:gap-1">{actions}</div>}
      </div>
    </header>
  );
}
