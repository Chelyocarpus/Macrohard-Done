import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn.ts';
import { useEscapeKey } from '../../hooks/useEscapeKey.ts';

type Side = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  /** What the control does, e.g. "Mark as important" */
  label: ReactNode;
  /** Optional keyboard shortcut shown as a key cap, e.g. "Ctrl+N" */
  shortcut?: string;
  /** Preferred side; flips automatically when there is no room */
  side?: Side;
  /** Skip the tooltip (e.g. while a control is in a state where it isn't relevant) */
  disabled?: boolean;
  /** Classes for the wrapper, e.g. "block w-full" for full-width buttons */
  className?: string;
  children: ReactNode;
}

const GAP = 10; // space between control and tooltip (includes the arrow)
const EDGE = 8; // minimum distance to the window edge
const SHOW_DELAY_MS = 450;
const WARM_WINDOW_MS = 600; // after one tooltip closes, the next one opens instantly

// Shared between all tooltips: when moving along a toolbar, neighbours open without the delay.
let lastClosedAt = 0;

interface Placement {
  x: number;
  y: number;
  side: Side;
  arrow: number;
}

function place(anchor: DOMRect, tip: { width: number; height: number }, preferred: Side): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const compute = (side: Side) => {
    switch (side) {
      case 'top':
        return { x: anchor.left + anchor.width / 2 - tip.width / 2, y: anchor.top - tip.height - GAP };
      case 'bottom':
        return { x: anchor.left + anchor.width / 2 - tip.width / 2, y: anchor.bottom + GAP };
      case 'left':
        return { x: anchor.left - tip.width - GAP, y: anchor.top + anchor.height / 2 - tip.height / 2 };
      default:
        return { x: anchor.right + GAP, y: anchor.top + anchor.height / 2 - tip.height / 2 };
    }
  };

  // Flip to the opposite side when the preferred one would leave the window
  let side = preferred;
  let pos = compute(side);
  if (side === 'top' && pos.y < EDGE) side = 'bottom';
  else if (side === 'bottom' && pos.y + tip.height > vh - EDGE) side = 'top';
  else if (side === 'left' && pos.x < EDGE) side = 'right';
  else if (side === 'right' && pos.x + tip.width > vw - EDGE) side = 'left';
  if (side !== preferred) pos = compute(side);

  const x = Math.min(Math.max(pos.x, EDGE), Math.max(EDGE, vw - tip.width - EDGE));
  const y = Math.min(Math.max(pos.y, EDGE), Math.max(EDGE, vh - tip.height - EDGE));

  // Keep the arrow pointing at the control's centre even when the box was nudged back on screen
  const vertical = side === 'top' || side === 'bottom';
  const centre = vertical ? anchor.left + anchor.width / 2 - x : anchor.top + anchor.height / 2 - y;
  const length = vertical ? tip.width : tip.height;
  const arrow = Math.min(Math.max(centre, 12), Math.max(12, length - 12));

  return { x, y, side, arrow };
}

/**
 * A small themed label that explains a control on hover or keyboard focus.
 *
 * Robustness / pitfalls guarded against:
 * - Rendered in a portal with fixed positioning, so parents with `overflow: hidden` (task cards, the
 *   sidebar) can't clip it, and it flips / clamps to stay inside the window.
 * - Never opens for touch: a finger "hover" is a tap, and a tooltip popping over the control that was
 *   just tapped only gets in the way. Keyboard focus opens it only for :focus-visible (not mouse clicks).
 * - Closes on click, Escape, scroll, resize and when the control unmounts, so it can't get stuck open
 *   (for example when the control removes itself on click).
 * - Disabled buttons don't fire pointer events themselves, so listeners sit on a wrapper element.
 * - Moving across neighbouring controls skips the delay so a toolbar doesn't flicker.
 * - Controls that already have an `aria-label` are not given a duplicate description for screen readers.
 */
export function Tooltip({ label, shortcut, side = 'top', disabled = false, className, children }: TooltipProps) {
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  // Becomes true one frame after placement so the fade-in actually animates
  const [visible, setVisible] = useState(false);

  const close = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setOpen((wasOpen) => {
      if (wasOpen) lastClosedAt = Date.now();
      return false;
    });
    setPlacement(null);
    setVisible(false);
  }, []);

  const openAfter = useCallback((delay: number) => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(true), delay);
  }, []);

  // Measure once the tooltip is in the DOM, before it is painted, so it never flashes in the wrong place
  useLayoutEffect(() => {
    if (!open || !tipRef.current || !wrapperRef.current) return;
    const anchorEl = (wrapperRef.current.firstElementChild as HTMLElement | null) ?? wrapperRef.current;
    const tip = tipRef.current.getBoundingClientRect();
    setPlacement(place(anchorEl.getBoundingClientRect(), tip, side));
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open, side, label, shortcut]);

  // Escape hides a shown tooltip first (the first press must not also close the panel the control is in)
  useEscapeKey(open, close);

  // Close on anything that would leave the tooltip pointing at the wrong place
  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // If the tooltip is turned off while visible, hide it
  useEffect(() => {
    if (disabled) close();
  }, [disabled, close]);

  const child = isValidElement(children) ? (children as ReactElement<Record<string, unknown>>) : null;
  const describedChild =
    child && open && !child.props['aria-label']
      ? cloneElement(child, { 'aria-describedby': id })
      : children;

  return (
    <>
      <span
        ref={wrapperRef}
        className={cn('inline-flex', className)}
        onPointerEnter={(e) => {
          if (disabled || e.pointerType === 'touch') return;
          openAfter(Date.now() - lastClosedAt < WARM_WINDOW_MS ? 0 : SHOW_DELAY_MS);
        }}
        onPointerLeave={close}
        onPointerDown={close}
        onFocus={(e) => {
          if (disabled) return;
          // Only keyboard focus: mouse clicks also focus a button, and the tooltip would stay open
          let keyboardFocus = false;
          try { keyboardFocus = e.target.matches(':focus-visible'); } catch { /* old browsers */ }
          if (keyboardFocus) openAfter(0);
        }}
        onBlur={close}
      >
        {describedChild}
      </span>
      {open && !disabled && createPortal(
        <div
          ref={tipRef}
          id={id}
          role="tooltip"
          style={{
            left: placement?.x ?? 0,
            top: placement?.y ?? 0,
            // Invisible until measured, then fades in from the control's direction
            opacity: visible ? 1 : 0,
            transform: visible ? 'translate(0, 0)' : `translate(0, ${side === 'bottom' ? '-3px' : '3px'})`,
          }}
          className={cn(
            'pointer-events-none fixed z-[80] flex max-w-[260px] items-center gap-2 rounded-lg px-2.5 py-1.5',
            'text-xs font-medium leading-snug shadow-lg ring-1',
            'bg-ink text-canvas ring-canvas/20',
            'transition-[opacity,transform] duration-150 ease-out'
          )}
        >
          <span>{label}</span>
          {shortcut && (
            <kbd className="rounded bg-canvas/15 px-1.5 py-0.5 font-mono text-[0.625rem] font-medium tracking-tight text-canvas">
              {shortcut}
            </kbd>
          )}
          {placement && (
            <span
              aria-hidden="true"
              className="absolute h-2 w-2 rotate-45 bg-ink"
              style={
                placement.side === 'top'
                  ? { left: placement.arrow - 4, bottom: -4 }
                  : placement.side === 'bottom'
                    ? { left: placement.arrow - 4, top: -4 }
                    : placement.side === 'left'
                      ? { top: placement.arrow - 4, right: -4 }
                      : { top: placement.arrow - 4, left: -4 }
              }
            />
          )}
        </div>,
        document.body
      )}
    </>
  );
}
