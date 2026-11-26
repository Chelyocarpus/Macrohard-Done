/**
 * Swipe gestures on a task row (touch screens): swipe right adds the task to or removes it from My Day,
 * swipe left deletes it (with the usual Undo message). Pure functions, so the thresholds can be tested.
 *
 * Robustness / pitfalls guarded against:
 * - Scrolling: a gesture only counts as a swipe when it is clearly sideways (at least 1.5 times as far
 *   across as up or down), so scrolling the list with a slightly diagonal finger never moves or deletes a row.
 * - Accidents: nothing happens until the finger has moved SWIPE_COMMIT_PX, and the gesture must END
 *   there (lifting the finger), so brushing a row or backing out by sliding the finger back does nothing.
 * - Wrong intent can't flip: once a gesture is classified as vertical it stays vertical until it ends.
 */
export type SwipeAction = 'my-day' | 'delete';
export type SwipeIntent = 'undecided' | 'horizontal' | 'vertical';

/** Movement before the direction is decided */
export const SWIPE_START_PX = 10;
/** Distance across needed to trigger the action when the finger lifts */
export const SWIPE_COMMIT_PX = 80;
/** How far the row follows the finger */
export const SWIPE_MAX_PX = 140;
/** How much further across than up/down a swipe must be */
export const SWIPE_RATIO = 1.5;

export function classifySwipe(dx: number, dy: number, current: SwipeIntent = 'undecided'): SwipeIntent {
  if (current !== 'undecided') return current;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < SWIPE_START_PX) return 'undecided';
  return ax >= ay * SWIPE_RATIO ? 'horizontal' : 'vertical';
}

/** Where the row is drawn while the finger is down: follows the finger, up to SWIPE_MAX_PX either way. */
export function swipeOffset(dx: number): number {
  if (!Number.isFinite(dx)) return 0;
  return Math.max(-SWIPE_MAX_PX, Math.min(SWIPE_MAX_PX, dx));
}

/** The action to run when the finger lifts, or null when the gesture was too short or not a swipe. */
export function resolveSwipe(dx: number, intent: SwipeIntent): SwipeAction | null {
  if (intent !== 'horizontal' || !Number.isFinite(dx)) return null;
  if (dx >= SWIPE_COMMIT_PX) return 'my-day';
  if (dx <= -SWIPE_COMMIT_PX) return 'delete';
  return null;
}
