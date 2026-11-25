import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup, type BackupData, type CommitResult } from '../utils/backup.ts';
import { createSyncEngine, fingerprint, MAX_SNAPSHOT_CHARS, type PushResult, type RemoteSnapshot, type RemoteStore, type SyncMeta } from './syncCore.ts';
import type { Task } from '../types/index.ts';

const USER = 'user-1';

function task(id: string, title: string): Task {
  const date = new Date('2026-01-01T00:00:00Z');
  return {
    id, title, completed: false, important: false, myDay: false, pinned: false, pinnedGlobally: false,
    order: 0, createdAt: date, updatedAt: date, listId: 'all', categoryIds: [], steps: [],
  };
}

function backupOf(titles: string[], exportedAt = new Date('2026-02-01T00:00:00Z')): string {
  return createBackup({
    tasks: titles.map((title, i) => task(`t${i}`, title)),
    lists: [], listGroups: [], categories: [], customTimePresets: [], disabledBuiltInPresets: [],
    themePreference: 'system', rowDensity: 'compact', sidebarCollapsed: false,
  }, exportedAt);
}

/** An in-memory cloud with the same compare-and-set rule as the database */
class FakeCloud implements RemoteStore {
  row: RemoteSnapshot | null = null;
  fetchError: Error | null = null;
  /** 'before': the request is lost, nothing saved. 'after': saved, but the answer is lost. */
  failNextPush: 'before' | 'after' | null = null;
  pushes = 0;
  fetches = 0;
  /** While set, a fetch waits for it (to test what happens while a request is in the air) */
  fetchGate: Promise<void> | null = null;
  beforePush: (() => void) | null = null;

  async fetch() {
    this.fetches += 1;
    if (this.fetchGate) await this.fetchGate;
    if (this.fetchError) throw this.fetchError;
    return this.row ? { ...this.row } : null;
  }

  async push(payload: string, base: number | null): Promise<PushResult> {
    this.pushes += 1;
    this.beforePush?.();
    if (this.failNextPush === 'before') { this.failNextPush = null; throw new Error('network down'); }
    const current = this.row?.version ?? null;
    if (current !== base) return { ok: false, reason: 'conflict' };
    this.row = { payload, version: (base ?? 0) + 1, updatedAt: '2026-02-02T00:00:00Z' };
    if (this.failNextPush === 'after') { this.failNextPush = null; throw new Error('timeout'); }
    return { ok: true, version: this.row.version };
  }

  /** Another device saved something */
  otherDeviceSaves(titles: string[]) {
    this.row = { payload: backupOf(titles), version: (this.row?.version ?? 0) + 1, updatedAt: '2026-02-03T00:00:00Z' };
  }
}

function setup(localTitles: string[], opts: { meta?: SyncMeta | null; applyResult?: CommitResult } = {}) {
  const cloud = new FakeCloud();
  const device = { titles: localTitles, meta: opts.meta ?? null as SyncMeta | null, applied: [] as BackupData[], applyOptions: [] as { replacesLocalWork: boolean }[], applyResult: opts.applyResult ?? { status: 'ok' } as CommitResult };
  const engine = createSyncEngine(USER, {
    remote: cloud,
    loadMeta: () => device.meta,
    saveMeta: (meta) => { device.meta = meta; },
    exportLocal: () => backupOf(device.titles),
    applyRemote: (data, options) => {
      device.applied.push(data);
      device.applyOptions.push(options);
      if (device.applyResult.status !== 'failed') device.titles = data.tasks.map((t) => t.title);
      return device.applyResult;
    },
    localIsEmpty: () => device.titles.length === 0,
  });
  return { cloud, device, engine };
}

describe('fingerprint', () => {
  it('ignores the export time and the device settings, but not the data', () => {
    expect(fingerprint(backupOf(['a'], new Date(1)))).toBe(fingerprint(backupOf(['a'], new Date(2))));
    expect(fingerprint(backupOf(['a']))).not.toBe(fingerprint(backupOf(['b'])));
  });
});

describe('first sync', () => {
  it('uploads when the cloud has nothing', async () => {
    const { cloud, device, engine } = setup(['a']);
    expect(await engine.sync()).toEqual({ kind: 'pushed' });
    expect(cloud.row?.version).toBe(1);
    expect(device.meta?.baseVersion).toBe(1);
    expect(engine.isDirty()).toBe(false);
  });

  it('takes the cloud copy when this device is empty', async () => {
    const { cloud, device, engine } = setup([]);
    cloud.otherDeviceSaves(['from cloud']);
    expect(await engine.sync()).toEqual({ kind: 'pulled' });
    expect(device.titles).toEqual(['from cloud']);
    expect(device.meta?.baseVersion).toBe(1);
  });

  it('reports a conflict, and changes nothing, when both sides already have data', async () => {
    const { cloud, device, engine } = setup(['mine']);
    cloud.otherDeviceSaves(['theirs']);
    const before = cloud.row;
    expect((await engine.sync()).kind).toBe('conflict');
    expect(device.titles).toEqual(['mine']);
    expect(cloud.row).toEqual(before);
    expect(cloud.pushes).toBe(0);
  });
});

describe('later syncs', () => {
  const synced = (): SyncMeta => ({ userId: USER, baseVersion: 1, syncedFingerprint: fingerprint(backupOf(['a'])), lastSyncedAt: null });

  it('does nothing when neither side changed', async () => {
    const { cloud, engine } = setup(['a'], { meta: synced() });
    cloud.row = { payload: backupOf(['a']), version: 1, updatedAt: 'x' };
    expect(await engine.sync()).toEqual({ kind: 'up-to-date' });
    expect(cloud.pushes).toBe(0);
  });

  it('uploads a local change', async () => {
    const { cloud, device, engine } = setup(['a', 'b'], { meta: synced() });
    cloud.row = { payload: backupOf(['a']), version: 1, updatedAt: 'x' };
    expect(await engine.sync()).toEqual({ kind: 'pushed' });
    expect(cloud.row?.version).toBe(2);
    expect(device.meta?.baseVersion).toBe(2);
  });

  it('downloads a change made on another device', async () => {
    const { cloud, device, engine } = setup(['a'], { meta: synced() });
    cloud.row = { payload: backupOf(['a']), version: 1, updatedAt: 'x' };
    cloud.otherDeviceSaves(['a', 'c']);
    expect(await engine.sync()).toEqual({ kind: 'pulled' });
    expect(device.titles).toEqual(['a', 'c']);
  });

  it('reports a conflict when both changed, and overwrites neither', async () => {
    const { cloud, device, engine } = setup(['a', 'mine'], { meta: synced() });
    cloud.row = { payload: backupOf(['a']), version: 1, updatedAt: 'x' };
    cloud.otherDeviceSaves(['a', 'theirs']);
    expect((await engine.sync()).kind).toBe('conflict');
    expect(device.titles).toEqual(['a', 'mine']);
    expect(cloud.row?.version).toBe(2);
    expect(cloud.pushes).toBe(0);
  });

  it('reports a conflict when another device wins the race during the upload', async () => {
    const { cloud, device, engine } = setup(['a', 'mine'], { meta: synced() });
    cloud.row = { payload: backupOf(['a']), version: 1, updatedAt: 'x' };
    cloud.beforePush = () => { cloud.otherDeviceSaves(['a', 'theirs']); };
    expect((await engine.sync()).kind).toBe('conflict');
    expect(JSON.parse(cloud.row.payload).data.tasks.map((t: Task) => t.title)).toEqual(['a', 'theirs']);
    expect(device.meta?.baseVersion).toBe(1); // unchanged: still unsynced
  });

  it('ignores sync state saved for another account', async () => {
    const other: SyncMeta = { ...synced(), userId: 'someone-else' };
    const { cloud, engine } = setup(['mine'], { meta: other });
    cloud.otherDeviceSaves(['theirs']);
    expect((await engine.sync()).kind).toBe('conflict');
  });

  it('keeps an edit made during the upload as a pending change', async () => {
    const { cloud, device, engine } = setup(['a', 'b'], { meta: synced() });
    cloud.row = { payload: backupOf(['a']), version: 1, updatedAt: 'x' };
    cloud.beforePush = () => { device.titles = ['a', 'b', 'typed meanwhile']; };
    expect(await engine.sync()).toEqual({ kind: 'pushed' });
    expect(engine.isDirty()).toBe(true);
    cloud.beforePush = null;
    expect(await engine.sync()).toEqual({ kind: 'pushed' });
    expect(cloud.row?.version).toBe(3);
  });
});

describe('failures', () => {
  const synced = (): SyncMeta => ({ userId: USER, baseVersion: 1, syncedFingerprint: fingerprint(backupOf(['a'])), lastSyncedAt: null });

  it('reports an error and changes nothing when the cloud cannot be reached', async () => {
    const { cloud, device, engine } = setup(['a', 'b'], { meta: synced() });
    cloud.fetchError = new Error('offline');
    expect((await engine.sync()).kind).toBe('error');
    expect(device.meta?.baseVersion).toBe(1);
    expect(engine.isDirty()).toBe(true);
  });

  it('upload lost before it arrived: unknown, then uploaded on the next sync', async () => {
    const { cloud, engine } = setup(['a', 'b'], { meta: synced() });
    cloud.row = { payload: backupOf(['a']), version: 1, updatedAt: 'x' };
    cloud.failNextPush = 'before';
    expect((await engine.sync()).kind).toBe('unknown');
    expect(cloud.row.version).toBe(1);
    expect(await engine.sync()).toEqual({ kind: 'pushed' });
    expect(cloud.row.version).toBe(2);
  });

  it('upload saved but the answer was lost: recognised as our own save, not a conflict, not repeated', async () => {
    const { cloud, device, engine } = setup(['a', 'b'], { meta: synced() });
    cloud.row = { payload: backupOf(['a']), version: 1, updatedAt: 'x' };
    cloud.failNextPush = 'after';
    expect((await engine.sync()).kind).toBe('unknown');
    expect(cloud.row.version).toBe(2);
    const pushesBefore = cloud.pushes;
    expect(await engine.sync()).toEqual({ kind: 'up-to-date' });
    expect(cloud.pushes).toBe(pushesBefore);
    expect(device.meta?.baseVersion).toBe(2);
  });

  it('refuses to upload data over the size limit, before any request', async () => {
    const { cloud } = setup([]);
    const huge = 'x'.repeat(MAX_SNAPSHOT_CHARS + 1);
    const big = createSyncEngine(USER, {
      remote: cloud, loadMeta: () => null, saveMeta: () => {},
      exportLocal: () => huge, applyRemote: () => ({ status: 'ok' }), localIsEmpty: () => false,
    });
    expect((await big.sync()).kind).toBe('error');
    expect(cloud.pushes).toBe(0);
  });

  it('does not apply an unreadable cloud copy', async () => {
    const { cloud, device, engine } = setup([]);
    cloud.row = { payload: '{not json', version: 3, updatedAt: 'x' };
    expect((await engine.sync()).kind).toBe('error');
    expect(device.applied).toHaveLength(0);
    expect(device.meta).toBeNull();
  });

  it('does not move on when the local save of the cloud data failed', async () => {
    const { cloud, device, engine } = setup([], { applyResult: { status: 'failed', reason: 'disk full' } });
    cloud.otherDeviceSaves(['x']);
    const outcome = await engine.sync();
    expect(outcome).toEqual({ kind: 'error', message: 'disk full' });
    expect(device.meta).toBeNull();
  });

  it('reports unknown (not pulled) when the local save could not be confirmed', async () => {
    const { cloud, device, engine } = setup([], { applyResult: { status: 'unknown', reason: 'not sure' } });
    cloud.otherDeviceSaves(['x']);
    expect((await engine.sync()).kind).toBe('unknown');
    expect(device.meta).toBeNull();
  });

  it('shares one run between overlapping calls', async () => {
    const { cloud, engine } = setup(['a']);
    const [one, two] = await Promise.all([engine.sync(), engine.sync()]);
    expect(one).toBe(two);
    expect(cloud.pushes).toBe(1);
  });
});

describe('resolving a conflict', () => {
  function conflicted() {
    const ctx = setup(['mine']);
    ctx.cloud.otherDeviceSaves(['theirs']);
    return ctx;
  }

  it('keeping the cloud copy replaces this device', async () => {
    const { device, engine } = conflicted();
    await engine.sync();
    expect(await engine.resolve('cloud')).toEqual({ kind: 'pulled' });
    expect(device.titles).toEqual(['theirs']);
    expect(engine.isDirty()).toBe(false);
  });

  it('keeping this device replaces the cloud, conditional on the version just read', async () => {
    const { cloud, engine } = conflicted();
    await engine.sync();
    expect(await engine.resolve('device')).toEqual({ kind: 'pushed' });
    expect(parseBackup(cloud.row!.payload)).toMatchObject({ ok: true });
    expect(cloud.row!.version).toBe(2);
  });

  it('keeping this device is a conflict again if the cloud changed in between', async () => {
    const { cloud, engine } = conflicted();
    await engine.sync();
    cloud.beforePush = () => { cloud.otherDeviceSaves(['newer']); };
    expect((await engine.resolve('device')).kind).toBe('conflict');
    expect(JSON.parse(cloud.row!.payload).data.tasks[0].title).toBe('newer');
  });
});

describe('the undo copy of the local data', () => {
  const synced = (): SyncMeta => ({ userId: USER, baseVersion: 1, syncedFingerprint: fingerprint(backupOf(['a'])), lastSyncedAt: null });

  it('is not asked for when an empty device takes the cloud copy (nothing to lose)', async () => {
    const { cloud, device, engine } = setup([]);
    cloud.otherDeviceSaves(['from cloud']);
    await engine.sync();
    expect(device.applyOptions).toEqual([{ replacesLocalWork: false }]);
  });

  it('is not asked for in a routine download, so it never replaces the copy of the last real import', async () => {
    const { cloud, device, engine } = setup(['a'], { meta: synced() });
    cloud.row = { payload: backupOf(['a']), version: 1, updatedAt: 'x' };
    cloud.otherDeviceSaves(['a', 'c']);
    await engine.sync();
    expect(device.applyOptions).toEqual([{ replacesLocalWork: false }]);
  });

  it('is asked for when the person keeps the cloud copy over changes made on this device', async () => {
    const { cloud, device, engine } = setup(['mine']);
    cloud.otherDeviceSaves(['theirs']);
    await engine.sync();
    await engine.resolve('cloud');
    expect(device.applyOptions).toEqual([{ replacesLocalWork: true }]);
  });
});

describe('signing out in the middle of a run', () => {
  function gated() {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    return { gate, release };
  }

  it('does not import the cloud copy that arrives after the sign-out', async () => {
    const { cloud, device, engine } = setup([]);
    cloud.otherDeviceSaves(['from cloud']);
    const { gate, release } = gated();
    cloud.fetchGate = gate;
    const run = engine.sync();
    engine.cancel();
    release();
    expect((await run).kind).toBe('error');
    expect(device.applied).toHaveLength(0);
    expect(device.titles).toEqual([]);
  });

  it('does not upload after the sign-out', async () => {
    const { cloud, engine } = setup(['mine']);
    const { gate, release } = gated();
    cloud.fetchGate = gate;
    const run = engine.sync();
    engine.cancel();
    release();
    expect((await run).kind).toBe('error');
    expect(cloud.pushes).toBe(0);
    expect(cloud.row).toBeNull();
  });

  it('does not apply a conflict choice made just before the sign-out', async () => {
    const { cloud, device, engine } = setup(['mine']);
    cloud.otherDeviceSaves(['theirs']);
    await engine.sync(); // conflict
    const { gate, release } = gated();
    cloud.fetchGate = gate;
    const choice = engine.resolve('cloud');
    engine.cancel();
    release();
    expect((await choice).kind).toBe('error');
    expect(device.applied).toHaveLength(0);
    expect(device.titles).toEqual(['mine']);
  });
});

describe('choosing a side while a sync is running', () => {
  it('waits for the running sync instead of fetching and writing alongside it', async () => {
    const { cloud, engine } = setup(['mine']);
    cloud.otherDeviceSaves(['theirs']);
    let release!: () => void;
    cloud.fetchGate = new Promise<void>((resolve) => { release = resolve; });
    const running = engine.sync();
    const choice = engine.resolve('device');
    await Promise.resolve();
    await Promise.resolve();
    expect(cloud.fetches).toBe(1); // only the sync has asked the cloud so far
    release();
    expect((await running).kind).toBe('conflict');
    expect(await choice).toEqual({ kind: 'pushed' });
    expect(cloud.fetches).toBe(2);
    expect(cloud.pushes).toBe(1);
  });
});
