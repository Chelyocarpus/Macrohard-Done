import type { Category, ListGroup, ListSortMode, RowDensity, Task, TaskList, ThemePreference, TimePreset } from '../types/index.ts';
import { generateId, toDate } from './storage.ts';
import { normalizeInterval } from './repeat.ts';
import { isHexColor } from './color.ts';
import { parseRowDensity } from './density.ts';

/**
 * Backup files: export, check and import everything the app keeps (tasks, lists, groups, tags, time
 * presets and the appearance settings), and the careful "replace my data" step.
 *
 * File format (version 1), a JSON object:
 *   { "app": "macrohard-done", "formatVersion": 1, "exportedAt": "<ISO time>", "data": { ... } }
 * Dates are ISO strings. Built-in lists (My Day, Important, Planned, Tasks) are not stored; the app
 * always has them.
 */

export const BACKUP_APP_ID = 'macrohard-done';
export const BACKUP_FORMAT_VERSION = 1;

// Limits, so a huge or hostile file can't freeze or fill the browser
export const MAX_BACKUP_CHARS = 20 * 1024 * 1024;
export const MAX_TASKS = 50_000;
export const MAX_LISTS = 2_000;
export const MAX_GROUPS = 500;
export const MAX_CATEGORIES = 2_000;
export const MAX_PRESETS = 200;
export const MAX_STEPS_PER_TASK = 500;
const MAX_TEXT = 100_000;

const SYSTEM_LIST_IDS: ReadonlySet<string> = new Set(['my-day', 'important', 'planned', 'all']);
const REPEAT_VALUES = ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const;
const SORT_MODES: readonly ListSortMode[] = ['manual', 'importance', 'dueDate', 'myDay', 'alphabetical', 'created'];

export type { RowDensity, ThemePreference };

export interface BackupSettings {
  themePreference: ThemePreference;
  rowDensity: RowDensity;
  sidebarCollapsed: boolean;
}

export interface BackupData {
  tasks: Task[];
  /** Custom lists only */
  lists: TaskList[];
  listGroups: ListGroup[];
  categories: Category[];
  customTimePresets: TimePreset[];
  disabledBuiltInPresets: string[];
  /** Missing in a file from before settings existed: then the current settings are kept */
  settings?: BackupSettings;
}

export interface BackupSummary {
  tasks: number;
  lists: number;
  listGroups: number;
  categories: number;
}

export type ParseResult =
  | { ok: true; data: BackupData; summary: BackupSummary; warnings: string[]; exportedAt: string | null }
  | { ok: false; error: string };

// ---- Export ----------------------------------------------------------------------------------

export interface BackupSource {
  tasks: Task[];
  lists: TaskList[];
  listGroups: ListGroup[];
  categories: Category[];
  customTimePresets: TimePreset[];
  disabledBuiltInPresets: string[];
  themePreference: ThemePreference;
  rowDensity: RowDensity;
  sidebarCollapsed: boolean;
}

/** The text of a backup file for the current data. */
export function createBackup(source: BackupSource, now: Date = new Date()): string {
  const data = {
    tasks: source.tasks,
    lists: source.lists.filter((list) => !list.isSystem).map((list) => ({ ...list, taskCount: 0 })),
    listGroups: source.listGroups,
    categories: source.categories,
    customTimePresets: source.customTimePresets,
    disabledBuiltInPresets: source.disabledBuiltInPresets,
    settings: {
      themePreference: source.themePreference,
      rowDensity: source.rowDensity,
      sidebarCollapsed: source.sidebarCollapsed,
    },
  };
  return JSON.stringify({ app: BACKUP_APP_ID, formatVersion: BACKUP_FORMAT_VERSION, exportedAt: now.toISOString(), data }, null, 2);
}

/** "macrohard-done-backup-2026-11-23.json" */
export function backupFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `macrohard-done-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

// ---- Import: check and clean -----------------------------------------------------------------

type Raw = Record<string, unknown>;
const isRaw = (value: unknown): value is Raw => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value.slice(0, MAX_TEXT) : fallback);
const optionalText = (value: unknown): string | undefined => (typeof value === 'string' && value !== '' ? value.slice(0, MAX_TEXT) : undefined);
const finiteNumber = (value: unknown, fallback: number): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const requiredDate = (value: unknown, now: Date): Date => toDate(value) ?? now;

/**
 * Reads the text of a backup file and returns clean data, or says what is wrong with it.
 *
 * Robustness / pitfalls guarded against:
 * - Not a backup at all (random JSON, a list, a number, a file from another app): rejected with a plain
 *   message and nothing is returned, so it can never be applied.
 * - A file from a NEWER version of the app: rejected instead of guessing at fields this version doesn't know.
 * - Size bombs: the text, and the number of tasks, lists, groups, tags, presets and steps, are capped.
 * - Prototype pollution: every record is rebuilt field by field from known keys, never spread from the file,
 *   so keys like `__proto__` or `constructor` can't reach the app's objects.
 * - Wrong types (a number as a title, text as a date, "yes" as a boolean): each field is coerced to a safe
 *   value or the record is skipped, never passed on as it was.
 * - Duplicate ids: the first one is kept, the rest are dropped and counted in the warnings.
 * - Dangling references (a task in a list or group that is not in the file, a tag that does not exist): repaired
 *   (to the default Tasks list, no group, tag removed) and counted, so the app never points at nothing.
 * - Invalid dates: optional ones are dropped, required ones become "now"; nothing becomes an Invalid Date.
 * - Nothing is changed by parsing: it only reads text and returns new objects.
 */
export function parseBackup(input: string, now: Date = new Date()): ParseResult {
  if (typeof input !== 'string' || input.length === 0) return { ok: false, error: 'The file is empty.' };
  if (input.length > MAX_BACKUP_CHARS) return { ok: false, error: 'The file is too large to be one of this app\'s backups.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return { ok: false, error: 'This is not a valid backup file (it can\'t be read as JSON).' };
  }
  if (!isRaw(parsed) || parsed.app !== BACKUP_APP_ID) {
    return { ok: false, error: 'This file was not made by this app\'s Export.' };
  }
  const version = parsed.formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'This backup has no valid version number.' };
  }
  if (version > BACKUP_FORMAT_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of the app. Update the app and try again.' };
  }
  const raw = parsed.data;
  if (!isRaw(raw) || !Array.isArray(raw.tasks) || !Array.isArray(raw.lists)) {
    return { ok: false, error: 'The backup is missing its tasks or lists.' };
  }

  const checkCount = (value: unknown, max: number, what: string): string | null =>
    Array.isArray(value) && value.length > max ? `The backup has too many ${what} (more than ${max}).` : null;
  const tooMany =
    checkCount(raw.tasks, MAX_TASKS, 'tasks') ?? checkCount(raw.lists, MAX_LISTS, 'lists')
    ?? checkCount(raw.listGroups, MAX_GROUPS, 'groups') ?? checkCount(raw.categories, MAX_CATEGORIES, 'tags')
    ?? checkCount(raw.customTimePresets, MAX_PRESETS, 'time presets');
  if (tooMany) return { ok: false, error: tooMany };

  const counts = { duplicates: 0, skipped: 0, listRepairs: 0, groupRepairs: 0, tagRepairs: 0 };

  // ---- groups
  const groups: ListGroup[] = [];
  const groupIds = new Set<string>();
  for (const [index, item] of (Array.isArray(raw.listGroups) ? raw.listGroups : []).entries()) {
    if (!isRaw(item) || typeof item.id !== 'string' || item.id === '' || typeof item.name !== 'string' || item.name.trim() === '') { counts.skipped++; continue; }
    if (groupIds.has(item.id)) { counts.duplicates++; continue; }
    groupIds.add(item.id);
    groups.push({
      id: item.id,
      name: text(item.name).trim(),
      emoji: optionalText(item.emoji),
      color: isHexColor(item.color) ? item.color : undefined,
      collapsed: item.collapsed === true,
      order: finiteNumber(item.order, index),
      createdAt: requiredDate(item.createdAt, now),
      overrideListIcons: item.overrideListIcons === true ? true : undefined,
    });
  }

  // ---- lists (custom only; the built-in ones always exist)
  const lists: TaskList[] = [];
  const listIds = new Set<string>(SYSTEM_LIST_IDS);
  for (const [index, item] of raw.lists.entries()) {
    if (!isRaw(item) || typeof item.id !== 'string' || item.id === '' || typeof item.name !== 'string' || item.name.trim() === '') { counts.skipped++; continue; }
    if (SYSTEM_LIST_IDS.has(item.id)) continue; // the built-in lists are not restored from a file
    if (listIds.has(item.id)) { counts.duplicates++; continue; }
    listIds.add(item.id);
    let groupId: string | null = null;
    if (typeof item.groupId === 'string' && item.groupId !== '') {
      if (groupIds.has(item.groupId)) groupId = item.groupId;
      else counts.groupRepairs++;
    }
    lists.push({
      id: item.id,
      name: text(item.name).trim(),
      emoji: optionalText(item.emoji),
      color: isHexColor(item.color) ? item.color : undefined,
      isSystem: false,
      taskCount: 0,
      groupId,
      order: finiteNumber(item.order, index),
      createdAt: requiredDate(item.createdAt, now),
      sortMode: SORT_MODES.find((mode) => mode === item.sortMode),
      sortReverse: item.sortReverse === true ? true : undefined,
      showCompleted: item.showCompleted === false ? false : undefined,
      addToTop: item.addToTop === true ? true : undefined,
    });
  }

  // ---- tags
  const categories: Category[] = [];
  const categoryIds = new Set<string>();
  const categoryNames = new Set<string>();
  for (const item of Array.isArray(raw.categories) ? raw.categories : []) {
    if (!isRaw(item) || typeof item.id !== 'string' || item.id === '' || typeof item.name !== 'string' || item.name.trim() === '') { counts.skipped++; continue; }
    const name = text(item.name).trim();
    const normalizedName = name.toLowerCase().replace(/\s+/g, ' ');
    if (categoryIds.has(item.id) || categoryNames.has(normalizedName)) { counts.duplicates++; continue; }
    categoryIds.add(item.id);
    categoryNames.add(normalizedName);
    categories.push({
      id: item.id,
      name,
      color: isHexColor(item.color) ? item.color : undefined,
      emoji: optionalText(item.emoji),
      description: optionalText(item.description),
      createdAt: requiredDate(item.createdAt, now),
      updatedAt: requiredDate(item.updatedAt, now),
    });
  }

  // ---- tasks
  const tasks: Task[] = [];
  const taskIds = new Set<string>();
  for (const [index, item] of raw.tasks.entries()) {
    if (!isRaw(item) || typeof item.id !== 'string' || item.id === '' || typeof item.title !== 'string' || item.title.trim() === '') { counts.skipped++; continue; }
    if (taskIds.has(item.id)) { counts.duplicates++; continue; }
    taskIds.add(item.id);

    let listId = typeof item.listId === 'string' && item.listId !== '' ? item.listId : 'all';
    if (!listIds.has(listId)) { counts.listRepairs++; listId = 'all'; }

    const rawTagIds = Array.isArray(item.categoryIds) ? item.categoryIds.filter((id): id is string => typeof id === 'string') : [];
    const tagIds = Array.from(new Set(rawTagIds.filter((id) => categoryIds.has(id))));
    if (tagIds.length !== new Set(rawTagIds).size) counts.tagRepairs++;

    const steps: Task['steps'] = [];
    const stepIds = new Set<string>();
    for (const step of (Array.isArray(item.steps) ? item.steps : []).slice(0, MAX_STEPS_PER_TASK)) {
      if (!isRaw(step) || typeof step.title !== 'string') continue;
      let id = typeof step.id === 'string' && step.id !== '' ? step.id : generateId();
      if (stepIds.has(id)) id = generateId();
      stepIds.add(id);
      steps.push({ id, title: text(step.title), completed: step.completed === true, createdAt: requiredDate(step.createdAt, now) });
    }

    const repeat = REPEAT_VALUES.find((value) => value === item.repeat) ?? 'none';
    const repeatDays = Array.isArray(item.repeatDays)
      ? Array.from(new Set(item.repeatDays.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6)))
      : undefined;
    tasks.push({
      id: item.id,
      title: text(item.title).trim(),
      notes: optionalText(item.notes),
      completed: item.completed === true,
      important: item.important === true,
      myDay: item.myDay === true,
      myDayDate: typeof item.myDayDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.myDayDate) ? item.myDayDate : undefined,
      pinned: item.pinned === true,
      pinnedGlobally: item.pinnedGlobally === true,
      dueDate: toDate(item.dueDate),
      reminder: toDate(item.reminder),
      repeat,
      repeatDays: repeatDays && repeatDays.length > 0 ? repeatDays : undefined,
      repeatInterval: repeat !== 'none' && item.repeatInterval !== undefined ? normalizeInterval(item.repeatInterval) : undefined,
      repeatAnchor: item.repeatAnchor === 'completion' ? 'completion' : item.repeatAnchor === 'due' ? 'due' : undefined,
      repeatSpawnedId: optionalText(item.repeatSpawnedId),
      order: finiteNumber(item.order, index),
      createdAt: requiredDate(item.createdAt, now),
      updatedAt: requiredDate(item.updatedAt, now),
      listId,
      categoryIds: tagIds,
      steps,
    });
  }

  // ---- time presets
  const presets: TimePreset[] = [];
  const presetIds = new Set<string>();
  for (const item of Array.isArray(raw.customTimePresets) ? raw.customTimePresets : []) {
    if (!isRaw(item) || typeof item.id !== 'string' || item.id === '' || typeof item.label !== 'string') { counts.skipped++; continue; }
    const hour = finiteNumber(item.hour, NaN);
    const minute = finiteNumber(item.minute, NaN);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) { counts.skipped++; continue; }
    if (presetIds.has(item.id)) { counts.duplicates++; continue; }
    presetIds.add(item.id);
    presets.push({ id: item.id, label: text(item.label), hour, minute, isCustom: true, createdAt: requiredDate(item.createdAt, now) });
  }

  const disabled = Array.isArray(raw.disabledBuiltInPresets)
    ? raw.disabledBuiltInPresets.filter((id): id is string => typeof id === 'string').slice(0, MAX_PRESETS)
    : [];

  // ---- settings
  let settings: BackupSettings | undefined;
  if (isRaw(raw.settings)) {
    const s = raw.settings;
    settings = {
      themePreference: (['system', 'light', 'dark'] as const).find((v) => v === s.themePreference) ?? 'system',
      rowDensity: parseRowDensity(s.rowDensity),
      sidebarCollapsed: s.sidebarCollapsed === true,
    };
  }

  const warnings: string[] = [];
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (counts.skipped) warnings.push(`${plural(counts.skipped, 'item was', 'items were')} skipped because it was damaged or had no name.`);
  if (counts.duplicates) warnings.push(`${plural(counts.duplicates, 'duplicate was', 'duplicates were')} left out.`);
  if (counts.listRepairs) warnings.push(`${plural(counts.listRepairs, 'task', 'tasks')} belonged to a list that is not in the file and ${counts.listRepairs === 1 ? 'was' : 'were'} moved to Tasks.`);
  if (counts.groupRepairs) warnings.push(`${plural(counts.groupRepairs, 'list', 'lists')} pointed to a missing group and ${counts.groupRepairs === 1 ? 'is' : 'are'} now ungrouped.`);
  if (counts.tagRepairs) warnings.push(`${plural(counts.tagRepairs, 'task', 'tasks')} had tags that are not in the file; those tags were removed from the task.`);

  return {
    ok: true,
    data: { tasks, lists, listGroups: groups, categories, customTimePresets: presets, disabledBuiltInPresets: disabled, settings },
    summary: { tasks: tasks.length, lists: lists.length, listGroups: groups.length, categories: categories.length },
    warnings,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
  };
}

// ---- Replacing the saved data ----------------------------------------------------------------

/** The small part of `localStorage` the steps below need (so tests can use a fake). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StorageKeys {
  data: string;
  backup: string;
  /** Other copies the app keeps of the person's data and that "remove all data" must remove too */
  extra?: readonly string[];
}

export type CommitStatus = 'ok' | 'failed' | 'unknown';
export interface CommitResult {
  status: CommitStatus;
  /** A plain-language reason for 'failed' or 'unknown' */
  reason?: string;
}

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Replaces the saved data with `newPayload`, keeping the old data as a backup first.
 *
 * Robustness / pitfalls guarded against:
 * - Safety copy first: the current data is copied to the backup key BEFORE anything is overwritten. If that
 *   copy can't be written (storage full), nothing else is done and the old data is untouched.
 * - Interruption between the two writes: if the main write fails after the backup was written, the previous
 *   backup (if there was one) is put back, so a failed attempt leaves storage as it was. A single
 *   `setItem` is all-or-nothing, so the main key is never half-written.
 * - Lost acknowledgement / silent failure: after writing, the main key is read back and compared with what was
 *   meant to be written. A different value is reported as 'unknown' (not 'ok'), because the write may or
 *   may not have happened; the backup is kept so the person can undo.
 * - Nothing is retried: a second write after an unclear first one could undo a write that did go through.
 * - Only the caller's own keys are touched.
 * - `saveUndoCopy: false` (a routine cloud pull that only brings in what the cloud already had): the undo copy is
 *   neither written nor replaced, so the copy from the person's last real import survives, and the replacement does
 *   not need room for a second full copy of the data.
 */
export function commitReplacement(
  storage: KeyValueStorage,
  keys: StorageKeys,
  newPayload: string,
  options: { saveUndoCopy?: boolean } = {},
): CommitResult {
  const saveUndoCopy = options.saveUndoCopy !== false;
  let current: string | null;
  let previousBackup: string | null;
  try {
    current = storage.getItem(keys.data);
    previousBackup = storage.getItem(keys.backup);
  } catch (error) {
    return { status: 'failed', reason: `Your browser's storage can't be read (${describeError(error)}).` };
  }

  if (saveUndoCopy && current !== null) {
    try {
      storage.setItem(keys.backup, current);
    } catch (error) {
      return { status: 'failed', reason: `A safety copy of your current data could not be saved, so nothing was changed (${describeError(error)}).` };
    }
  }

  try {
    storage.setItem(keys.data, newPayload);
  } catch (error) {
    // The main key is unchanged; put the previous backup back so this attempt leaves no trace
    // (nothing to put back when no copy was written)
    try {
      if (!saveUndoCopy) { /* the undo copy was never touched */ }
      else if (previousBackup === null) storage.removeItem(keys.backup);
      else storage.setItem(keys.backup, previousBackup);
    } catch { /* best effort: the main data is intact either way */ }
    return { status: 'failed', reason: `The new data could not be saved, so nothing was changed (${describeError(error)}).` };
  }

  let readBack: string | null;
  try {
    readBack = storage.getItem(keys.data);
  } catch {
    return { status: 'unknown', reason: 'The data was written but could not be read back to check it.' };
  }
  if (readBack !== newPayload) {
    return { status: 'unknown', reason: 'The data was written but reading it back gave something different, so it is not certain it was saved.' };
  }
  return { status: 'ok' };
}

/**
 * Puts the backup made by `commitReplacement` back as the saved data and removes the backup.
 *
 * Robustness / pitfalls guarded against:
 * - No backup: reports 'failed' ("nothing to restore") and changes nothing.
 * - The backup is only removed AFTER the restored data was read back and matches; otherwise it is kept, so a
 *   restore that did not work can be tried again.
 * - A failed or unclear write leaves the backup where it is.
 */
export function restoreBackup(storage: KeyValueStorage, keys: StorageKeys): CommitResult {
  let backup: string | null;
  try {
    backup = storage.getItem(keys.backup);
  } catch (error) {
    return { status: 'failed', reason: `Your browser's storage can't be read (${describeError(error)}).` };
  }
  if (backup === null) return { status: 'failed', reason: 'There is no earlier copy to go back to.' };

  try {
    storage.setItem(keys.data, backup);
  } catch (error) {
    return { status: 'failed', reason: `The earlier data could not be put back (${describeError(error)}).` };
  }
  try {
    if (storage.getItem(keys.data) !== backup) {
      return { status: 'unknown', reason: 'The earlier data was written but reading it back gave something different.' };
    }
    storage.removeItem(keys.backup);
  } catch {
    return { status: 'unknown', reason: 'The earlier data was written but could not be read back to check it.' };
  }
  return { status: 'ok' };
}

/**
 * Removes all the app's saved data, including its backups.
 *
 * Robustness / pitfalls guarded against:
 * - Every key is attempted even if one fails, so a failure on the first doesn't leave the others behind.
 * - Success is only reported after reading every key back as empty; a key that is still there is 'failed'.
 * - Only the app's own keys are touched.
 */
export function clearAllStoredData(storage: KeyValueStorage, keys: StorageKeys): CommitResult {
  const all = [keys.data, keys.backup, ...(keys.extra ?? [])];
  const errors: string[] = [];
  for (const key of all) {
    try { storage.removeItem(key); } catch (error) { errors.push(describeError(error)); }
  }
  const remaining: string[] = [];
  for (const key of all) {
    try { if (storage.getItem(key) !== null) remaining.push(key); } catch { remaining.push(key); }
  }
  if (remaining.length > 0 || errors.length > 0) {
    return { status: 'failed', reason: 'Some of the data could not be removed from this browser.' };
  }
  return { status: 'ok' };
}
