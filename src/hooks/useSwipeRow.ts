import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { classifySwipe, resolveSwipe, swipeOffset, type SwipeAction, type SwipeIntent } from '../utils/swipe.ts';

interface SwipeState {
  pointerId: number;
  startX: number;
  startY: number;
  dx: number;
  intent: SwipeIntent;
}

/**
 * Touch swipe on a task row. Returns the row's current sideways offset (to draw it) and pointer handlers
 * to put on the row. The thresholds live in utils/swipe.ts.
 *
 * Robustness / pitfalls guarded against:
 * - The action runs exactly once, when the finger LIFTS past the threshold. A cancelled gesture (the
 *   browser took over to scroll, a call came in, the window lost focus) runs nothing.
 * - Only touch: a mouse or pen never swipes. Only the first finger counts; a second finger is ignored, and
 *   pointer events from another finger can't end this one's gesture (matched by pointer id).
 * - Starting on a button, link or field leaves that control alone, so tapping the checkbox or star never
 *   turns into a swipe.
 * - The tap that browsers send after a swipe must not open the details: `consumeClick()` reports (once)
 *   that a swipe just ended, for a short time only, so a later real tap is never swallowed.
 * - The timer that clears that flag is cleared when the row goes away.
 */
export function useSwipeRow({ enabled, onAction }: { enabled: boolean; onAction: (action: SwipeAction) => void }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<SwipeState | null>(null);
  const justSwiped = useRef(false);
  const clearTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(clearTimer.current), []);

  const reset = useCallback(() => {
    gesture.current = null;
    setDragging(false);
    setOffset(0);
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || event.pointerType !== 'touch' || !event.isPrimary || gesture.current) return;
    if ((event.target as HTMLElement).closest('a, button, input, textarea, select, label')) return;
    gesture.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, intent: 'undecided' };
  }, [enabled]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    const before = current.intent;
    current.intent = classifySwipe(dx, dy, before);
    if (current.intent !== 'horizontal') return;
    if (before !== 'horizontal') {
      setDragging(true);
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* the gesture still works without capture */ }
    }
    current.dx = dx;
    setOffset(swipeOffset(dx));
  }, []);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const action = resolveSwipe(current.dx, current.intent);
    if (current.intent === 'horizontal') {
      justSwiped.current = true;
      window.clearTimeout(clearTimer.current);
      clearTimer.current = window.setTimeout(() => { justSwiped.current = false; }, 400);
    }
    reset();
    if (action) onAction(action);
  }, [onAction, reset]);

  const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (gesture.current && event.pointerId === gesture.current.pointerId) reset();
  }, [reset]);

  /** True once right after a swipe ended: the click the browser sends then should be ignored. */
  const consumeClick = useCallback(() => {
    const swiped = justSwiped.current;
    justSwiped.current = false;
    return swiped;
  }, []);

  return { offset, dragging, consumeClick, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } };
}
