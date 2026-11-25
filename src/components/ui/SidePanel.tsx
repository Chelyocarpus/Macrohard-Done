import { useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap.ts';
import { Button } from './Button.tsx';

interface SidePanelProps {
  /** Heading, and the name screen readers announce */
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons along the bottom */
  footer: ReactNode;
}

/**
 * The panel that slides in from the right to make or change something (a list, a group): a dimmed backdrop you can click
 * to close, a heading with a close button, a scrolling body and a footer for the buttons. Render it only while it is open.
 * Escape is handled by the form inside, because it may have something of its own to close first (the emoji picker).
 */
export function SidePanel({ title, onClose, children, footer }: SidePanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true);

  return (
    <div ref={ref} className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex-1 bg-black/25" onClick={onClose} />
      <div className="relative flex w-full flex-col bg-canvas shadow-xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:w-96">
        <div className="flex items-center justify-between border-b border-line px-6 py-3">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="h-10 w-10 rounded-full p-0">
            <X size={20} aria-hidden="true" />
          </Button>
        </div>
        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">{children}</div>
        <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}
