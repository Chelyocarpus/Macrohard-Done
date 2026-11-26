import { describe, expect, it } from 'vitest';
import {
  BACKUP_FORMAT_VERSION,
  MAX_BACKUP_CHARS,
  MAX_TASKS,
  backupFileName,
  clearAllStoredData,
  commitReplacement,
  createBackup,
  parseBackup,
  restoreBackup,
  type BackupSource,
  type KeyValueStorage,
} from './backup.ts';
import type { Task } from '../types/index.ts';

const NOW = new Date('2026-11-23T12:00:00.000Z');
const KEYS = { data: 'data', backup: 'backup', extra: ['corrupt'] as const };

// ---- helpers ----------------------------------------------------------------------------------

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1', title: 'Buy milk', completed: false, important: true, myDay: false, pinned: false, pinnedGlobally: false,
    order: 0, createdAt: new Date('2026-11-01T08:00:00Z'), updatedAt: new Date('2026-11-02T08:00:00Z'),
    listId: 'all', categoryIds: [], steps: [], ...over,
  };
}

const source = (over: Partial<BackupSource> = {}): BackupSource => ({
  tasks: [
    task({ dueDate: new Date('2026-12-01T00:00:00Z'), notes: 'two litres', steps: [{ id: 's1', title: 'Ask', completed: true, createdAt: new Date('2026-11-01T09:00:00Z') }], categoryIds: ['c1'], listId: 'l1' }),
    task({ id: 't2', title: 'Second', repeat: 'weekly', repeatInterval: 2 }),
  ],
  lists: [
    { id: 'my-day', name: 'My Day', isSystem: true, taskCount: 3, order: 0, createdAt: NOW },
    { id: 'l1', name: 'Home', emoji: '🏠', color: '#16a34a', isSystem: false, taskCount: 5, groupId: 'g1', order: 4, createdAt: new Date('2026-10-01T00:00:00Z'), sortMode: 'dueDate' },
  ],
  listGroups: [{ id: 'g1', name: 'Life', collapsed: true, order: 0, createdAt: new Date('2026-10-01T00:00:00Z') }],
  categories: [{ id: 'c1', name: 'Errands', color: '#d97706', createdAt: new Date('2026-10-02T00:00:00Z'), updatedAt: new Date('2026-10-03T00:00:00Z') }],
  customTimePresets: [{ id: 'p1', label: 'Lunch', hour: 12, minute: 30, isCustom: true, createdAt: new Date('2026-10-04T00:00:00Z') }],
  disabledBuiltInPresets: ['evening'],
  themePreference: 'dark', rowDensity: 'comfortable', sidebarCollapsed: true,
  ...over,
});

/** A backup file with `data` replaced by hand, for testing what the checker does with odd content */
const file = (data: unknown, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ app: 'macrohard-done', formatVersion: 1, exportedAt: NOW.toISOString(), data, ...extra });
const okData = (over: Record<string, unknown> = {}) => ({ tasks: [], lists: [], ...over });

function parseOk(text: string) {
  const result = parseBackup(text, NOW);
  if (!result.ok) throw new Error(`expected a valid backup, got: ${result.error}`);
  return result;
}

/** An in-memory storage that can be told to fail in the ways real ones do */
class FakeStorage implements KeyValueStorage {
  data = new Map<string, string>();
  /** setItem throws for these keys (storage full, blocked) */
  throwOnSet = new Set<string>();
  /** setItem "succeeds" but stores nothing for these keys (lost write) */
  dropWrites = new Set<string>();
  /** getItem throws for these keys */
  throwOnGet = new Set<string>();
  /** removeItem throws for these keys */
  throwOnRemove = new Set<string>();
  /** removeItem silently keeps these keys */
  keepOnRemove = new Set<string>();
  getItem(key: string) {
    if (this.throwOnGet.has(key)) throw new Error('read blocked');
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.throwOnSet.has(key)) throw new DOMException('quota exceeded', 'QuotaExceededError');
    if (!this.dropWrites.has(key)) this.data.set(key, value);
  }
  removeItem(key: string) {
    if (this.throwOnRemove.has(key)) throw new Error('remove blocked');
    if (!this.keepOnRemove.has(key)) this.data.delete(key);
  }
}

// ---- export and round trip --------------------------------------------------------------------

describe('createBackup / parseBackup round trip', () => {
  it('gives back the same data, with real dates, and leaves out the built-in lists', () => {
    const src = source();
    const result = parseOk(createBackup(src, NOW));
    expect(result.summary).toEqual({ tasks: 2, lists: 1, listGroups: 1, categories: 1 });
    expect(result.warnings).toEqual([]);
    expect(result.exportedAt).toBe(NOW.toISOString());

    const first = result.data.tasks[0];
    expect(first.dueDate).toEqual(new Date('2026-12-01T00:00:00Z'));
    expect(first.createdAt).toBeInstanceOf(Date);
    expect(first.steps[0]).toMatchObject({ id: 's1', title: 'Ask', completed: true });
    expect(first.categoryIds).toEqual(['c1']);
    expect(result.data.tasks[1]).toMatchObject({ repeat: 'weekly', repeatInterval: 2 });
    expect(result.data.lists).toHaveLength(1);
    expect(result.data.lists[0]).toMatchObject({ id: 'l1', name: 'Home', groupId: 'g1', isSystem: false, sortMode: 'dueDate', color: '#16a34a', emoji: '🏠' });
    expect(result.data.listGroups[0]).toMatchObject({ id: 'g1', collapsed: true });
    expect(result.data.customTimePresets[0]).toMatchObject({ id: 'p1', hour: 12, minute: 30 });
    expect(result.data.disabledBuiltInPresets).toEqual(['evening']);
    expect(result.data.settings).toEqual({ themePreference: 'dark', rowDensity: 'comfortable', sidebarCollapsed: true });
  });

  it('exports an empty app as a valid, importable file', () => {
    const result = parseOk(createBackup(source({ tasks: [], lists: [], listGroups: [], categories: [], customTimePresets: [], disabledBuiltInPresets: [] }), NOW));
    expect(result.summary).toEqual({ tasks: 0, lists: 0, listGroups: 0, categories: 0 });
  });

  it('names the file after the local date', () => {
    expect(backupFileName(new Date(2026, 10, 3))).toBe('macrohard-done-backup-2026-11-03.json');
  });
});

// ---- files that are not a good backup ---------------------------------------------------------

describe('parseBackup: rejects what is not a backup', () => {
  const rejected = (text: string) => {
    const result = parseBackup(text, NOW);
    expect(result.ok).toBe(false);
    return result.ok ? '' : result.error;
  };

  it('empty text, broken JSON, other JSON', () => {
    expect(rejected('')).toMatch(/empty/i);
    expect(rejected('{ not json')).toMatch(/not a valid backup/i);
    expect(rejected('[]')).toMatch(/not made by/i);
    expect(rejected('"hello"')).toMatch(/not made by/i);
    expect(rejected('42')).toMatch(/not made by/i);
    expect(rejected('null')).toMatch(/not made by/i);
    expect(rejected(JSON.stringify({ tasks: [], lists: [] }))).toMatch(/not made by/i);
    expect(rejected(JSON.stringify({ app: 'other-app', formatVersion: 1, data: okData() }))).toMatch(/not made by/i);
  });

  it('a version that is missing, wrong or newer than this app', () => {
    expect(rejected(JSON.stringify({ app: 'macrohard-done', data: okData() }))).toMatch(/version/i);
    expect(rejected(JSON.stringify({ app: 'macrohard-done', formatVersion: 'one', data: okData() }))).toMatch(/version/i);
    expect(rejected(JSON.stringify({ app: 'macrohard-done', formatVersion: 1.5, data: okData() }))).toMatch(/version/i);
    expect(rejected(JSON.stringify({ app: 'macrohard-done', formatVersion: 0, data: okData() }))).toMatch(/version/i);
    expect(rejected(JSON.stringify({ app: 'macrohard-done', formatVersion: BACKUP_FORMAT_VERSION + 1, data: okData() }))).toMatch(/newer version/i);
  });

  it('missing or wrongly shaped data', () => {
    expect(rejected(file(null))).toMatch(/missing/i);
    expect(rejected(file({ tasks: 'x', lists: [] }))).toMatch(/missing/i);
    expect(rejected(file({ tasks: [] }))).toMatch(/missing/i);
    expect(rejected(file([]))).toMatch(/missing/i);
  });

  it('files that are too big, by size or by number of tasks', () => {
    expect(rejected('x'.repeat(MAX_BACKUP_CHARS + 1))).toMatch(/too large/i);
    const many = Array.from({ length: MAX_TASKS + 1 }, (_, i) => ({ id: `t${i}`, title: 'x' }));
    expect(rejected(file(okData({ tasks: many })))).toMatch(/too many tasks/i);
  });

  it('is not fooled by a task count at exactly the limit', () => {
    const exactly = Array.from({ length: MAX_TASKS }, (_, i) => ({ id: `t${i}`, title: 'x' }));
    expect(parseBackup(file(okData({ tasks: exactly })), NOW).ok).toBe(true);
  });
});

// ---- damaged content inside a real backup -----------------------------------------------------

describe('parseBackup: cleans damaged content', () => {
  it('skips records without an id or a title, and says so', () => {
    const r = parseOk(file(okData({ tasks: [{ id: 'a', title: 'ok' }, { title: 'no id' }, { id: 'b' }, { id: 'c', title: '   ' }, 'text', null, 7] })));
    expect(r.data.tasks.map((t) => t.id)).toEqual(['a']);
    expect(r.warnings.join(' ')).toMatch(/6 items were skipped/);
  });

  it('keeps the first of duplicate ids and drops the rest', () => {
    const r = parseOk(file(okData({
      tasks: [{ id: 'a', title: 'first' }, { id: 'a', title: 'second' }],
      lists: [{ id: 'l', name: 'one' }, { id: 'l', name: 'two' }],
      categories: [{ id: 'c1', name: 'Errands' }, { id: 'c2', name: ' errands ' }, { id: 'c1', name: 'Other' }],
    })));
    expect(r.data.tasks.map((t) => t.title)).toEqual(['first']);
    expect(r.data.lists.map((l) => l.name)).toEqual(['one']);
    expect(r.data.categories.map((c) => c.id)).toEqual(['c1']);
    expect(r.warnings.join(' ')).toMatch(/4 duplicates were left out/);
  });

  it('turns wrong types into safe values', () => {
    const r = parseOk(file(okData({
      tasks: [{
        id: 'a', title: 'x', completed: 'yes', important: 1, myDay: 'true', pinned: {}, order: 'first',
        dueDate: 'not a date', reminder: { __type: 'nope' }, createdAt: 12345, updatedAt: null,
        repeat: 'hourly', repeatDays: [1, 9, 'x', 1, -1, 3.5, 6], repeatInterval: 'many',
        notes: 42, myDayDate: 'yesterday', steps: 'none', categoryIds: 'abc',
      }],
    })));
    const t = r.data.tasks[0];
    expect(t).toMatchObject({ completed: false, important: false, myDay: false, pinned: false, order: 0, repeat: 'none', steps: [], categoryIds: [] });
    expect(t.dueDate).toBeUndefined();
    expect(t.reminder).toBeUndefined();
    expect(t.notes).toBeUndefined();
    expect(t.myDayDate).toBeUndefined();
    expect(t.repeatInterval).toBeUndefined();
    expect(t.createdAt).toBeInstanceOf(Date);
    expect(Number.isNaN(t.updatedAt.getTime())).toBe(false);
  });

  it('keeps only valid repeat days and a sane interval', () => {
    const r = parseOk(file(okData({ tasks: [{ id: 'a', title: 'x', repeat: 'daily', repeatDays: [1, 9, 1, 6, 3.5], repeatInterval: '5000' }] })));
    expect(r.data.tasks[0].repeatDays).toEqual([1, 6]);
    expect(r.data.tasks[0].repeatInterval).toBe(999);
  });

  it('never lets dates become Invalid Date', () => {
    const r = parseOk(file(okData({
      tasks: [{ id: 'a', title: 'x', dueDate: 'garbage', createdAt: 'garbage', updatedAt: 'garbage', steps: [{ id: 's', title: 'y', createdAt: 'garbage' }] }],
      lists: [{ id: 'l', name: 'L', createdAt: 'garbage' }],
    })));
    const all = [r.data.tasks[0].createdAt, r.data.tasks[0].updatedAt, r.data.tasks[0].steps[0].createdAt, r.data.lists[0].createdAt];
    for (const date of all) expect(Number.isNaN(date.getTime())).toBe(false);
  });

  it('repairs references to things that are not in the file', () => {
    const r = parseOk(file(okData({
      tasks: [{ id: 'a', title: 'x', listId: 'ghost-list', categoryIds: ['c1', 'ghost-tag', 'c1'] }],
      lists: [{ id: 'l', name: 'L', groupId: 'ghost-group' }],
      categories: [{ id: 'c1', name: 'Real' }],
    })));
    expect(r.data.tasks[0].listId).toBe('all');
    expect(r.data.tasks[0].categoryIds).toEqual(['c1']);
    expect(r.data.lists[0].groupId).toBeNull();
    expect(r.warnings.join(' ')).toMatch(/moved to Tasks/);
    expect(r.warnings.join(' ')).toMatch(/missing group/);
    expect(r.warnings.join(' ')).toMatch(/tags that are not in the file/);
  });

  it('puts tasks of built-in lists in Tasks and never restores built-in lists from a file', () => {
    const r = parseOk(file(okData({
      tasks: [{ id: 'a', title: 'x', listId: 'my-day' }, { id: 'b', title: 'y', listId: 'all' }],
      lists: [{ id: 'my-day', name: 'Hacked', isSystem: false }, { id: 'all', name: 'Also' }, { id: 'important', name: 'No' }],
    })));
    expect(r.data.lists).toEqual([]);
    expect(r.data.tasks.map((t) => t.listId)).toEqual(['my-day', 'all']);
  });

  it('rebuilds every record from known fields, so dangerous keys cannot get in', () => {
    const text = '{"app":"macrohard-done","formatVersion":1,"data":{"tasks":[{"id":"a","title":"x","__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"extra":"unknown"}],"lists":[]}}';
    const r = parseOk(text);
    const t = r.data.tasks[0] as unknown as Record<string, unknown>;
    expect(t.extra).toBeUndefined();
    expect(t.polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(t)).not.toContain('constructor');
  });

  it('gives steps unique ids and drops steps that are not objects', () => {
    const r = parseOk(file(okData({ tasks: [{ id: 'a', title: 'x', steps: [{ id: 's', title: 'one' }, { id: 's', title: 'two' }, { title: 'three' }, 'bad', { id: 'z' }] }] })));
    const steps = r.data.tasks[0].steps;
    expect(steps.map((s) => s.title)).toEqual(['one', 'two', 'three']);
    expect(new Set(steps.map((s) => s.id)).size).toBe(3);
  });

  it('ignores a color that is not #rrggbb and an unknown sort mode', () => {
    const r = parseOk(file(okData({ lists: [{ id: 'l', name: 'L', color: 'red', sortMode: 'random', emoji: 5 }], categories: [{ id: 'c', name: 'C', color: 'javascript:alert(1)' }] })));
    expect(r.data.lists[0].color).toBeUndefined();
    expect(r.data.lists[0].sortMode).toBeUndefined();
    expect(r.data.lists[0].emoji).toBeUndefined();
    expect(r.data.categories[0].color).toBeUndefined();
  });

  it('skips time presets with impossible times', () => {
    const r = parseOk(file(okData({ customTimePresets: [{ id: 'a', label: 'ok', hour: 9, minute: 5 }, { id: 'b', label: 'bad', hour: 25, minute: 0 }, { id: 'c', label: 'bad', hour: 1, minute: 99 }, { id: 'd', label: 'bad', hour: 'x', minute: 0 }] })));
    expect(r.data.customTimePresets.map((p) => p.id)).toEqual(['a']);
  });

  it('keeps the current settings when the file has none, and cleans settings that are odd', () => {
    expect(parseOk(file(okData())).data.settings).toBeUndefined();
    const odd = parseOk(file(okData({ settings: { themePreference: 'purple', rowDensity: 'huge', sidebarCollapsed: 'yes' } })));
    expect(odd.data.settings).toEqual({ themePreference: 'system', rowDensity: 'compact', sidebarCollapsed: false });
  });

  it('accepts the minimal row density from a backup', () => {
    const r = parseOk(file(okData({ settings: { themePreference: 'light', rowDensity: 'minimal', sidebarCollapsed: false } })));
    expect(r.data.settings?.rowDensity).toBe('minimal');
  });

  it('does not change or depend on anything outside the text it is given', () => {
    const text = createBackup(source(), NOW);
    expect(JSON.stringify(parseOk(text).data)).toBe(JSON.stringify(parseOk(text).data));
  });
});

// ---- replacing the saved data ----------------------------------------------------------------

describe('commitReplacement', () => {
  it('writes the new data and keeps the old data as a backup', () => {
    const s = new FakeStorage();
    s.data.set('data', 'OLD');
    expect(commitReplacement(s, KEYS, 'NEW')).toEqual({ status: 'ok' });
    expect(s.data.get('data')).toBe('NEW');
    expect(s.data.get('backup')).toBe('OLD');
  });

  it('leaves the undo copy alone when asked not to save one', () => {
    const s = new FakeStorage();
    s.data.set('data', 'OLD');
    s.data.set('backup', 'FROM LAST IMPORT');
    expect(commitReplacement(s, KEYS, 'NEW', { saveUndoCopy: false })).toEqual({ status: 'ok' });
    expect(s.data.get('data')).toBe('NEW');
    expect(s.data.get('backup')).toBe('FROM LAST IMPORT');
  });

  it('without an undo copy, a failed write changes nothing and does not touch the old undo copy', () => {
    const s = new FakeStorage();
    s.data.set('data', 'OLD');
    s.data.set('backup', 'FROM LAST IMPORT');
    s.throwOnSet.add('data');
    const result = commitReplacement(s, KEYS, 'NEW', { saveUndoCopy: false });
    expect(result.status).toBe('failed');
    expect(s.data.get('data')).toBe('OLD');
    expect(s.data.get('backup')).toBe('FROM LAST IMPORT');
  });

  it('without an undo copy, needs no room for a second copy of the data', () => {
    const s = new FakeStorage();
    s.data.set('data', 'OLD');
    s.throwOnSet.add('backup'); // storage too full for a copy
    expect(commitReplacement(s, KEYS, 'NEW', { saveUndoCopy: false })).toEqual({ status: 'ok' });
    expect(s.data.get('data')).toBe('NEW');
  });

  it('works the first time, when there is nothing to back up', () => {
    const s = new FakeStorage();
    expect(commitReplacement(s, KEYS, 'NEW').status).toBe('ok');
    expect(s.data.get('data')).toBe('NEW');
    expect(s.data.has('backup')).toBe(false);
  });

  it('changes nothing when the safety copy cannot be saved (storage full)', () => {
    const s = new FakeStorage();
    s.data.set('data', 'OLD');
    s.data.set('backup', 'OLDER');
    s.throwOnSet.add('backup');
    const result = commitReplacement(s, KEYS, 'NEW');
    expect(result.status).toBe('failed');
    expect(result.reason).toMatch(/safety copy/i);
    expect(s.data.get('data')).toBe('OLD');
    expect(s.data.get('backup')).toBe('OLDER');
  });

  it('leaves no trace when the main write fails after the backup was written (interrupted between steps)', () => {
    const s = new FakeStorage();
    s.data.set('data', 'OLD');
    s.data.set('backup', 'OLDER');
    s.throwOnSet.add('data');
    const result = commitReplacement(s, KEYS, 'NEW');
    expect(result.status).toBe('failed');
    expect(s.data.get('data')).toBe('OLD');
    expect(s.data.get('backup')).toBe('OLDER'); // the previous backup is back, not replaced by a copy of OLD
  });

  it('removes the backup it made when there was none before and the main write fails', () => {
    const s = new FakeStorage();
    s.data.set('data', 'OLD');
    s.throwOnSet.add('data');
    expect(commitReplacement(s, KEYS, 'NEW').status).toBe('failed');
    expect(s.data.has('backup')).toBe(false);
    expect(s.data.get('data')).toBe('OLD');
  });

  it('reports "unknown", not "ok", when the write was acknowledged but nothing was stored', () => {
    const s = new FakeStorage();
    s.data.set('data', 'OLD');
    s.dropWrites.add('data');
    const result = commitReplacement(s, KEYS, 'NEW');
    expect(result.status).toBe('unknown');
    expect(s.data.get('data')).toBe('OLD');
    expect(s.data.get('backup')).toBe('OLD'); // kept so the person can go back
  });

  it('reports "unknown" when the value cannot be read back to check it', () => {
    const s = new FakeStorage();
    s.data.set('data', 'OLD');
    // allow the first reads (before writing), then fail the check
    let reads = 0;
    const original = s.getItem.bind(s);
    s.getItem = (key: string) => {
      if (key === 'data' && ++reads > 1) throw new Error('read blocked');
      return original(key);
    };
    expect(commitReplacement(s, KEYS, 'NEW').status).toBe('unknown');
  });

  it('does not touch anything when storage cannot even be read', () => {
    const s = new FakeStorage();
    s.data.set('data', 'OLD');
    s.throwOnGet.add('data');
    const result = commitReplacement(s, KEYS, 'NEW');
    expect(result.status).toBe('failed');
    expect(s.data.get('data')).toBe('OLD');
    expect(s.data.has('backup')).toBe(false);
  });

  it('never writes the new data twice (no retry that could undo an unclear first write)', () => {
    const s = new FakeStorage();
    s.data.set('data', 'OLD');
    s.dropWrites.add('data');
    let writes = 0;
    const set = s.setItem.bind(s);
    s.setItem = (k, v) => { if (k === 'data') writes++; set(k, v); };
    commitReplacement(s, KEYS, 'NEW');
    expect(writes).toBe(1);
  });
});

describe('restoreBackup', () => {
  it('puts the backup back as the data and removes the backup', () => {
    const s = new FakeStorage();
    s.data.set('data', 'NEW');
    s.data.set('backup', 'OLD');
    expect(restoreBackup(s, KEYS)).toEqual({ status: 'ok' });
    expect(s.data.get('data')).toBe('OLD');
    expect(s.data.has('backup')).toBe(false);
  });

  it('says so, and changes nothing, when there is no backup', () => {
    const s = new FakeStorage();
    s.data.set('data', 'NEW');
    const result = restoreBackup(s, KEYS);
    expect(result.status).toBe('failed');
    expect(s.data.get('data')).toBe('NEW');
  });

  it('keeps the backup when the restore write fails', () => {
    const s = new FakeStorage();
    s.data.set('data', 'NEW');
    s.data.set('backup', 'OLD');
    s.throwOnSet.add('data');
    expect(restoreBackup(s, KEYS).status).toBe('failed');
    expect(s.data.get('backup')).toBe('OLD');
    expect(s.data.get('data')).toBe('NEW');
  });

  it('keeps the backup and reports "unknown" when the restored data does not read back', () => {
    const s = new FakeStorage();
    s.data.set('data', 'NEW');
    s.data.set('backup', 'OLD');
    s.dropWrites.add('data');
    expect(restoreBackup(s, KEYS).status).toBe('unknown');
    expect(s.data.get('backup')).toBe('OLD');
  });
});

describe('clearAllStoredData', () => {
  it('removes the data, the backup and the other copies', () => {
    const s = new FakeStorage();
    ['data', 'backup', 'corrupt', 'unrelated'].forEach((k) => s.data.set(k, 'x'));
    expect(clearAllStoredData(s, KEYS)).toEqual({ status: 'ok' });
    expect([...s.data.keys()]).toEqual(['unrelated']); // only the app's own keys
  });

  it('tries every key even when one fails, and reports the failure', () => {
    const s = new FakeStorage();
    ['data', 'backup', 'corrupt'].forEach((k) => s.data.set(k, 'x'));
    s.throwOnRemove.add('data');
    const result = clearAllStoredData(s, KEYS);
    expect(result.status).toBe('failed');
    expect(s.data.has('backup')).toBe(false);
    expect(s.data.has('corrupt')).toBe(false);
  });

  it('does not report success when a key is still there afterwards', () => {
    const s = new FakeStorage();
    s.data.set('data', 'x');
    s.keepOnRemove.add('data');
    expect(clearAllStoredData(s, KEYS).status).toBe('failed');
  });

  it('is fine when there is nothing to remove', () => {
    expect(clearAllStoredData(new FakeStorage(), KEYS).status).toBe('ok');
  });
});
