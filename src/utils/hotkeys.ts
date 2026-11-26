/**
 * Keyboard map: which key press means which action.
 *
 * Everything here is pure (no DOM, no stores), so it can be unit-tested. The browser-facing part lives
 * in `hooks/useKeyboardShortcuts.ts`, which describes the focus situation as a `HotkeyContext`.
 *
 * Robustness / pitfalls guarded against:
 * - Typing: letters never trigger actions while a text field has focus, so "d" in a title stays a "d".
 *   Only Ctrl/Cmd+K (search) still works there, like in most apps.
 * - Open dialogs and menus: nothing fires underneath them (`modalOpen`).
 * - Native behaviour: Space and Enter on a button, link or checkbox keep doing what that control does
 *   (`zone: 'other'`), so a keyboard user pressing Space on the star never also completes the task.
 * - Browser and OS shortcuts: plain-letter actions need NO Ctrl/Cmd/Alt, so Ctrl+D, Ctrl+S, Ctrl+R and
 *   friends are never swallowed.
 * - Key repeat: holding a key down must not toggle a task over and over, so only navigation and
 *   moving a task repeat (`REPEATABLE`).
 * - Select several: Space, S, M, P and Delete act on the whole selection once tasks are selected (see
 *   utils/bulkTasks.ts); Ctrl+A only selects all from a task row, so it never replaces the browser's own
 *   "select all text".
 * - Caps Lock and layouts: single characters are compared lower-cased, and "?" is accepted with or
 *   without Shift because layouts differ.
 */

export type HotkeyId =
  | 'new-task'
  | 'search'
  | 'complete'
  | 'important'
  | 'pin'
  | 'my-day'
  | 'due-date'
  | 'reminder'
  | 'open'
  | 'delete'
  | 'move-up'
  | 'move-down'
  | 'move-to-list'
  | 'undo'
  | 'select-next'
  | 'select-previous'
  | 'go-my-day'
  | 'go-important'
  | 'go-planned'
  | 'go-tasks'
  | 'toggle-check'
  | 'select-all'
  | 'extend-next'
  | 'extend-previous'
  | 'clear-selection'
  | 'help';

/** The parts of a keyboard event the map looks at (a real `KeyboardEvent` fits). */
export interface KeyInfo {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  repeat: boolean;
}

/**
 * Where the key was pressed.
 * - typing: a text field (input, textarea, select, editable text) has focus.
 * - zone: 'task' = a task row itself has focus, 'body' = nothing in particular, 'button' = a plain button or
 *   link (it only reacts to Space/Enter, so arrow keys can still move the selection, e.g. right after
 *   clicking a list in the sidebar), 'other' = any control that uses the arrow keys itself (radio, slider,
 *   tab, checkbox...).
 * - modalOpen: a dialog or menu is open.
 */
export interface HotkeyContext {
  typing: boolean;
  zone: 'task' | 'body' | 'button' | 'other';
  modalOpen: boolean;
}

/** Actions that may fire again while the key is held down. */
const REPEATABLE: ReadonlySet<HotkeyId> = new Set<HotkeyId>(['move-up', 'move-down', 'select-next', 'select-previous', 'extend-next', 'extend-previous']);

export function resolveHotkey(e: KeyInfo, ctx: HotkeyContext): HotkeyId | null {
  const id = resolveIgnoringRepeat(e, ctx);
  if (id && e.repeat && !REPEATABLE.has(id)) return null;
  return id;
}

function resolveIgnoringRepeat(e: KeyInfo, ctx: HotkeyContext): HotkeyId | null {
  if (ctx.modalOpen) return null;

  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const mod = e.ctrlKey || e.metaKey;

  // Ctrl/Cmd combinations
  if (mod && !e.altKey) {
    if (key === 'f' && !e.shiftKey) return 'search'; // Strg+F ("Suchen"); also from inside a text field
    if (ctx.typing) return null; // let the field handle its own undo, etc.
    // Select all tasks, but only from a task row: elsewhere Ctrl+A keeps selecting the page's text
    if (key === 'a' && !e.shiftKey && ctx.zone === 'task') return 'select-all';
    if (key === 'z' && !e.shiftKey) return 'undo';
    if (key === 'm' && e.shiftKey) return 'move-to-list';
    return null;
  }
  if (mod) return null;

  if (ctx.typing) return null;

  // Alt+Up / Alt+Down move the selected task
  if (e.altKey) {
    if (e.shiftKey || ctx.zone === 'other') return null;
    if (key === 'ArrowUp') return 'move-up';
    if (key === 'ArrowDown') return 'move-down';
    return null;
  }

  // "?" is Shift+/ on many layouts; some report the key as "/" with Shift held, so accept both
  if (key === '?' || (key === '/' && e.shiftKey)) return 'help';
  // Shift+Up / Shift+Down add the next row to the selection
  if (e.shiftKey) {
    if (ctx.zone === 'other') return null;
    if (key === 'ArrowDown') return 'extend-next';
    if (key === 'ArrowUp') return 'extend-previous';
    return null;
  }

  switch (key) {
    case 'n': return 'new-task';
    case 'f': return 'search'; // F for "Finden" / "Suchen"
    case 's': return 'important';
    case 'm': return 'my-day';
    case 'p': return 'pin';
    case 'd': return 'due-date';
    case 'r': return 'reminder';
    case 'x': return 'toggle-check';
    case 'Escape': return 'clear-selection'; // only used when tasks are selected (the app checks)
    case 'Delete': return 'delete';
    // The four views, in the order the sidebar lists them
    case '1': return 'go-my-day';
    case '2': return 'go-important';
    case '3': return 'go-planned';
    case '4': return 'go-tasks';
    // Space and Enter also mean something to focused controls, so they only work on a row or the page itself;
    // the arrow keys are only held back from controls that use them (radio, slider, ...)
    case ' ': return ctx.zone === 'task' || ctx.zone === 'body' ? 'complete' : null;
    case 'Enter': return ctx.zone === 'task' || ctx.zone === 'body' ? 'open' : null;
    case 'ArrowDown': return ctx.zone === 'other' ? null : 'select-next';
    case 'ArrowUp': return ctx.zone === 'other' ? null : 'select-previous';
    default: return null;
  }
}

// ---- Help text -------------------------------------------------------------------------------

export interface HotkeyHelpEntry {
  id: HotkeyId;
  group: 'Tasks' | 'Select several' | 'Move around' | 'App';
  label: string;
  /** Alternatives, each a list of key names; "Mod" means Ctrl (⌘ on Apple devices) */
  keys: string[][];
}

export const HOTKEY_HELP: HotkeyHelpEntry[] = [
  { id: 'new-task', group: 'Tasks', label: 'New task', keys: [['N']] },
  { id: 'complete', group: 'Tasks', label: 'Complete or reopen the selected task', keys: [['Space']] },
  { id: 'important', group: 'Tasks', label: 'Mark as important', keys: [['S']] },
  { id: 'my-day', group: 'Tasks', label: 'Add to or remove from My Day', keys: [['M']] },
  { id: 'pin', group: 'Tasks', label: 'Pin to or unpin from the top of its list', keys: [['P']] },
  { id: 'due-date', group: 'Tasks', label: 'Set the due date', keys: [['D']] },
  { id: 'reminder', group: 'Tasks', label: 'Set a reminder', keys: [['R']] },
  { id: 'open', group: 'Tasks', label: 'Open the task details', keys: [['Enter']] },
  { id: 'delete', group: 'Tasks', label: 'Delete the selected task', keys: [['Delete']] },
  { id: 'move-to-list', group: 'Tasks', label: 'Move to another list', keys: [['Mod', 'Shift', 'M']] },
  { id: 'move-up', group: 'Tasks', label: 'Move up in a manually ordered list', keys: [['Alt', 'Up']] },
  { id: 'move-down', group: 'Tasks', label: 'Move down in a manually ordered list', keys: [['Alt', 'Down']] },
  { id: 'toggle-check', group: 'Select several', label: 'Select or unselect the current task', keys: [['X']] },
  { id: 'extend-next', group: 'Select several', label: 'Add the next task to the selection', keys: [['Shift', 'Down']] },
  { id: 'extend-previous', group: 'Select several', label: 'Add the previous task to the selection', keys: [['Shift', 'Up']] },
  { id: 'select-all', group: 'Select several', label: 'Select all tasks on the page', keys: [['Mod', 'A']] },
  { id: 'clear-selection', group: 'Select several', label: 'Clear the selection', keys: [['Esc']] },
  { id: 'select-next', group: 'Move around', label: 'Select the next task', keys: [['Down']] },
  { id: 'select-previous', group: 'Move around', label: 'Select the previous task', keys: [['Up']] },
  { id: 'go-my-day', group: 'Move around', label: 'Go to My Day', keys: [['1']] },
  { id: 'go-important', group: 'Move around', label: 'Go to Important', keys: [['2']] },
  { id: 'go-planned', group: 'Move around', label: 'Go to Planned', keys: [['3']] },
  { id: 'go-tasks', group: 'Move around', label: 'Go to Tasks', keys: [['4']] },
  { id: 'search', group: 'App', label: 'Search', keys: [['F'], ['Mod', 'F']] },
  { id: 'undo', group: 'App', label: 'Undo (while the Undo message is showing)', keys: [['Mod', 'Z']] },
  { id: 'help', group: 'App', label: 'Show this list', keys: [['?']] },
];

/** "Mod" + "F" becomes "Ctrl+F" (Strg+F on a German keyboard), or "⌘F" on Apple devices. */
export function formatHotkey(keys: string[], apple: boolean): string {
  const names: Record<string, string> = apple
    ? { Mod: '⌘', Shift: '⇧', Alt: '⌥', Up: '↑', Down: '↓' }
    : { Mod: 'Ctrl', Up: '↑', Down: '↓' };
  const parts = keys.map((k) => names[k] ?? k);
  return apple ? parts.join('') : parts.join('+');
}
