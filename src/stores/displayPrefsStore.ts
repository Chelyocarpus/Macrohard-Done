import { create } from 'zustand';
import { useToastStore } from './toastStore.ts';
import {
  DEFAULT_DISPLAY_PREFS,
  DISPLAY_PREFS_KEY,
  parseDisplayPrefs,
  readDisplayPrefs,
  rootFontSize,
  textSizeOption,
  writeDisplayPrefs,
  type DisplayPrefs,
  type MessageTimeId,
  type TextSizeId,
} from '../utils/displayPrefs.ts';

/**
 * This device's reading comfort settings: the text size (applied to the whole page here) and how long messages stay
 * (read by the message component).
 */
interface DisplayPrefsState extends DisplayPrefs {
  setTextSize: (size: TextSizeId) => void;
  setMessageTime: (time: MessageTimeId) => void;
}

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // some browsers throw when site data is blocked
  }
};

/** Makes the page's text the chosen size. Everything sized in rem follows the root font size. */
export function applyTextSize(size: TextSizeId): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.fontSize = rootFontSize(size);
  // Icons drawn at a fixed pixel size grow with the text too (see `.lucide` in index.css)
  root.style.setProperty('--icon-scale', String(textSizeOption(size).percent / 100));
}

const initial: DisplayPrefs = (() => {
  const store = storage();
  return store ? readDisplayPrefs(store) : { ...DEFAULT_DISPLAY_PREFS };
})();
applyTextSize(initial.textSize); // before the first draw, so the page never shows in the wrong size first

export const useDisplayPrefsStore = create<DisplayPrefsState>()((set, get) => {
  /**
   * Shows the new setting at once, then saves it.
   *
   * Robustness / pitfalls guarded against:
   * - A choice that is already in effect does nothing (no write, no redraw).
   * - Storage that fails or drops the write: the setting still changes for this session, and a message says it will not
   *   be remembered (the outcome is never reported as saved when it was not).
   * - The other setting is taken from the latest state, which other tabs keep current through the "storage" event
   *   below, so changing one setting cannot undo a change just made to the other in another tab.
   * - A value that is not a known choice is cleaned to the default before anything is shown or saved.
   */
  const change = (changes: Partial<DisplayPrefs>) => {
    const current = get();
    const next = parseDisplayPrefs({ textSize: current.textSize, messageTime: current.messageTime, ...changes });
    if (next.textSize === current.textSize && next.messageTime === current.messageTime) return;
    set(next);
    applyTextSize(next.textSize);
    const store = storage();
    if (!store || !writeDisplayPrefs(store, next)) {
      useToastStore.getState().showWarning('Not saved', 'This browser did not keep this setting, so it may be back to the default after a reload.');
    }
  };

  return {
    ...initial,
    setTextSize: (textSize) => change({ textSize }),
    setMessageTime: (messageTime) => change({ messageTime }),
  };
});

// Another tab changed a setting: follow it
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== DISPLAY_PREFS_KEY) return;
    const store = storage();
    if (!store) return;
    const next = readDisplayPrefs(store);
    const current = useDisplayPrefsStore.getState();
    if (next.textSize !== current.textSize || next.messageTime !== current.messageTime) {
      useDisplayPrefsStore.setState(next);
      applyTextSize(next.textSize);
    }
  });
}
