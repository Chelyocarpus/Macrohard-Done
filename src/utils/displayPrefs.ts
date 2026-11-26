/**
 * Reading comfort (Settings > Appearance): how big the text is, and how long messages stay on screen. Both are per
 * device and shared by all profiles, like the theme. Plain functions over a tiny storage interface, so they can be
 * tested with a fake.
 */
import type { KeyValueStorage } from './profiles.ts';

export const DISPLAY_PREFS_KEY = 'todo-clone-display';

export type TextSizeId = 'standard' | 'large' | 'xlarge';
export type MessageTimeId = 'normal' | 'long' | 'stay';

export interface DisplayPrefs {
  textSize: TextSizeId;
  messageTime: MessageTimeId;
}

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = { textSize: 'standard', messageTime: 'normal' };

interface TextSizeOption {
  id: TextSizeId;
  label: string;
  /** Size of the page's text in percent of the browser's own text size (what the person set in the browser) */
  percent: number;
}

/** Every text size, in the order Settings shows them. Everything sized in rem (text, buttons, spacing) follows this. */
export const TEXT_SIZES: readonly TextSizeOption[] = [
  { id: 'standard', label: 'Standard', percent: 100 },
  { id: 'large', label: 'Large', percent: 125 },
  { id: 'xlarge', label: 'Extra large', percent: 150 },
];

interface MessageTimeOption {
  id: MessageTimeId;
  label: string;
  hint: string;
}

/** How long messages (such as the one with the Undo button) stay */
export const MESSAGE_TIMES: readonly MessageTimeOption[] = [
  { id: 'normal', label: 'Normal', hint: 'About 8 to 15 seconds' },
  { id: 'long', label: 'Long', hint: '30 seconds' },
  { id: 'stay', label: 'Until I close them', hint: 'Tap the X to close a message' },
];

/** With "Long", every message that closes by itself stays this long (never shorter than it would have) */
export const LONG_MESSAGE_MS = 30_000;

export const textSizeOption = (id: TextSizeId): TextSizeOption => TEXT_SIZES.find((option) => option.id === id) ?? TEXT_SIZES[0];

/** The page's root font size for a text size, e.g. "125%" */
export const rootFontSize = (id: TextSizeId): string => `${textSizeOption(id).percent}%`;

/**
 * How long a message stays under the chosen setting.
 *
 * `base` is the message's own time in milliseconds; 0 (or none) means it stays until it is closed, whatever the setting.
 * - normal: unchanged. long: at least 30 seconds. stay: never closes by itself (0).
 */
export function messageDuration(base: number | undefined, time: MessageTimeId): number {
  if (!base || base <= 0) return 0;
  if (time === 'stay') return 0;
  if (time === 'long') return Math.max(base, LONG_MESSAGE_MS);
  return base;
}

/**
 * Turns saved settings into preferences. Anything that is not a known choice (a damaged value, a choice from a newer
 * version of the app) becomes the default for that one setting, so a bad value can never reach the page.
 */
export function parseDisplayPrefs(value: unknown): DisplayPrefs {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    textSize: TEXT_SIZES.find((option) => option.id === raw.textSize)?.id ?? DEFAULT_DISPLAY_PREFS.textSize,
    messageTime: MESSAGE_TIMES.find((option) => option.id === raw.messageTime)?.id ?? DEFAULT_DISPLAY_PREFS.messageTime,
  };
}

/** Reads the settings. Never throws; unreadable or missing settings give the defaults. */
export function readDisplayPrefs(storage: KeyValueStorage): DisplayPrefs {
  try {
    const text = storage.getItem(DISPLAY_PREFS_KEY);
    if (text) return parseDisplayPrefs(JSON.parse(text));
  } catch {
    // fall through to the defaults
  }
  return { ...DEFAULT_DISPLAY_PREFS };
}

/**
 * Saves the settings and reads them back.
 *
 * Robustness / pitfalls guarded against:
 * - Storage that is full, blocked or switched off (private mode): the write is wrapped in try/catch and the function
 *   returns false instead of throwing, so the caller can say the choice will not be kept.
 * - A browser that accepts the write but drops it: the value is read back and compared, so `true` means it is really
 *   there, not just that nothing threw.
 * - A bad value never reaches storage: the settings are cleaned with `parseDisplayPrefs` first.
 */
export function writeDisplayPrefs(storage: KeyValueStorage, prefs: DisplayPrefs): boolean {
  try {
    const text = JSON.stringify(parseDisplayPrefs(prefs));
    storage.setItem(DISPLAY_PREFS_KEY, text);
    return storage.getItem(DISPLAY_PREFS_KEY) === text;
  } catch {
    return false;
  }
}
