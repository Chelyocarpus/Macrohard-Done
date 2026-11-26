import { parseBackup, MAX_BACKUP_CHARS, type BackupData, type CommitResult } from '../utils/backup.ts';

/**
 * Cloud sync, the part that decides what to do. It knows nothing about Supabase, the browser or React:
 * everything it touches comes in through `SyncDeps`, so every failure path can be tested with fakes.
 *
 * The whole app data travels as one snapshot (the same JSON an exported backup holds). The cloud keeps a
 * `version` that goes up by one per save. This device remembers the version it last synced (`baseVersion`)
 * and a fingerprint of the data it had then. From those two facts:
 *   - this device changed  = fingerprint(now) differs from `syncedFingerprint`
 *   - the cloud changed    = cloud version differs from `baseVersion`
 * Only one changed: copy it over. Both changed: a conflict, and the person chooses (nothing is merged).
 */

/** The largest snapshot this device will upload (the database accepts a little more). */
export const MAX_SNAPSHOT_CHARS = 5_000_000;

export interface RemoteSnapshot {
  version: number;
  payload: string;
  updatedAt: string;
}

export type PushResult = { ok: true; version: number } | { ok: false; reason: 'conflict' };

export interface RemoteStore {
  /** The cloud copy, or null when there is none yet. Throws when the cloud can't be reached. */
  fetch(): Promise<RemoteSnapshot | null>;
  /**
   * Saves `payload` only if the cloud is still at `baseVersion` (null = there must be no copy yet).
   * Returns a conflict when it isn't. Throws when the outcome is unknown (timeout, lost connection).
   */
  push(payload: string, baseVersion: number | null): Promise<PushResult>;
}

export interface SyncMeta {
  userId: string;
  baseVersion: number | null;
  syncedFingerprint: string | null;
  lastSyncedAt: string | null;
}

export interface SyncDeps {
  remote: RemoteStore;
  loadMeta(): SyncMeta | null;
  saveMeta(meta: SyncMeta): void;
  /** The current local data as backup JSON text */
  exportLocal(): string;
  /**
   * Replaces the local data with the backup (the app's own import).
   * `replacesLocalWork` is true only when the person chose the cloud copy over changes made on this device: then the
   * local data exists nowhere else, so a safety copy must be kept. In every other case the cloud already had what is replaced.
   */
  applyRemote(data: BackupData, options: { replacesLocalWork: boolean }): CommitResult;
  /** No tasks, no custom lists, no tags: nothing here worth keeping over the cloud copy */
  localIsEmpty(): boolean;
  now?(): Date;
}

export type SyncOutcome =
  | { kind: 'up-to-date' | 'pushed' | 'pulled' }
  | { kind: 'conflict'; cloudUpdatedAt: string }
  /** Nothing was changed on either side (or the failure was certain) */
  | { kind: 'error'; message: string }
  /** A change may or may not have gone through; the next sync finds out */
  | { kind: 'unknown'; message: string };

export type ConflictChoice = 'cloud' | 'device';

/** A small, fast, non-cryptographic hash (cyrb53) so two snapshots can be compared without keeping both. */
function hashText(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${text.length}:${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}`;
}

/**
 * Identifies the DATA of a snapshot: the export time and the device settings (sidebar, theme) are left out,
 * so exporting twice gives the same fingerprint and a settings tweak doesn't count as a change.
 */
export function fingerprint(payload: string): string {
  try {
    const parsed: unknown = JSON.parse(payload);
    const data = (parsed as { data?: Record<string, unknown> } | null)?.data;
    if (data && typeof data === 'object') {
      const rest = { ...data };
      delete rest.settings;
      return hashText(JSON.stringify(rest));
    }
  } catch { /* fall through: hash the raw text */ }
  return hashText(payload);
}

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

export interface SyncEngine {
  /** Brings this device and the cloud level, or reports why it didn't. Never throws. */
  sync(): Promise<SyncOutcome>;
  /** After a conflict: keep the cloud copy or this device's data. Never throws. */
  resolve(choice: ConflictChoice): Promise<SyncOutcome>;
  /** True when this device has changes the cloud doesn't have yet */
  isDirty(): boolean;
  /** The account signed out: from now on nothing is uploaded and nothing local is replaced */
  cancel(): void;
}

/**
 * Robustness / pitfalls guarded against (this engine changes the cloud copy and the local data):
 * - Two devices saving at once / stale preconditions: every upload is conditional on the version this device last
 *   saw (`remote.push(payload, baseVersion)`, an atomic compare-and-set in the database). A lost race comes back as
 *   a conflict, never as a silent overwrite.
 * - Both sides changed: nothing is merged or overwritten automatically; the outcome is 'conflict' and the person
 *   picks a side. Picking "this device" is itself conditional on the cloud version just read.
 * - First sync with data on both sides: no `baseVersion` yet, so it is treated as a conflict unless this device is
 *   empty (then the cloud copy is simply taken). A fresh install never uploads an empty state over real data.
 * - Edits during an upload: after a successful push the remembered fingerprint is that of the payload that was
 *   SENT, not of the current data, so an edit made meanwhile still counts as a change and goes up next time.
 * - Lost acknowledgement: if a push throws, it may still have committed. The sent payload is remembered (in memory)
 *   and, when the next fetch shows version base+1 with exactly that payload, it is recognised as our own save
 *   instead of a conflict. A push is never repeated blindly.
 * - A bad cloud copy (unreadable, newer format) is parsed and validated BEFORE anything local is replaced; the local
 *   apply reports failed/unknown and the sync state only advances on a confirmed 'ok'.
 * - Size: payloads over MAX_SNAPSHOT_CHARS are refused before any request is made.
 * - Overlapping runs: a second `sync()` while one is running shares its result instead of starting a parallel one.
 * - Another account's state: meta saved for a different user id is ignored.
 * - Signing out in the middle of a run: `cancel()` is checked after every wait and right before anything is uploaded or
 *   replaced locally, so a late answer from the cloud can't be imported (or an upload made) for a signed-out account.
 * - Choosing a side in a conflict while a sync is running: `resolve()` waits for that run and then runs alone, so two
 *   fetches, pushes or local replacements never overlap and `inflight` can't be overwritten by the other one.
 */
export function createSyncEngine(userId: string, deps: SyncDeps): SyncEngine {
  const now = () => (deps.now ? deps.now() : new Date()).toISOString();

  let meta: SyncMeta = (() => {
    const saved = deps.loadMeta();
    return saved && saved.userId === userId
      ? saved
      : { userId, baseVersion: null, syncedFingerprint: null, lastSyncedAt: null };
  })();
  const remember = (next: SyncMeta) => {
    meta = next;
    try {
      deps.saveMeta(next);
    } catch { /* best effort: memory still has it, the worst case after a reload is a conflict prompt */ }
  };

  /** A push that threw: what was sent, and the version it would have created */
  let inflight: { payload: string; version: number } | null = null;
  let running: Promise<SyncOutcome> | null = null;

  const isDirty = () => fingerprint(deps.exportLocal()) !== meta.syncedFingerprint;

  let cancelled = false;
  const SIGNED_OUT: SyncOutcome = { kind: 'error', message: 'You signed out, so nothing was changed.' };

  const pull = (remote: RemoteSnapshot, replacesLocalWork = false): SyncOutcome => {
    if (cancelled) return SIGNED_OUT;
    const parsed = parseBackup(remote.payload);
    if (!parsed.ok) return { kind: 'error', message: `The cloud copy can't be used: ${parsed.error}` };
    const result = deps.applyRemote(parsed.data, { replacesLocalWork });
    if (result.status === 'failed') return { kind: 'error', message: result.reason ?? 'The cloud data could not be saved on this device.' };
    if (result.status === 'unknown') return { kind: 'unknown', message: result.reason ?? 'It is not certain the cloud data was saved on this device.' };
    // Fingerprint what is now local (the app normalises on import), not what was in the cloud
    remember({ userId, baseVersion: remote.version, syncedFingerprint: fingerprint(deps.exportLocal()), lastSyncedAt: now() });
    return { kind: 'pulled' };
  };

  const push = async (baseVersion: number | null): Promise<SyncOutcome> => {
    if (cancelled) return SIGNED_OUT;
    const payload = deps.exportLocal();
    if (payload.length > MAX_SNAPSHOT_CHARS || payload.length > MAX_BACKUP_CHARS) {
      return { kind: 'error', message: 'Your data is too large to sync. Nothing was uploaded.' };
    }
    inflight = { payload, version: (baseVersion ?? 0) + 1 };
    let result: PushResult;
    try {
      result = await deps.remote.push(payload, baseVersion);
    } catch (error) {
      // May or may not have committed: keep `inflight` so the next fetch can recognise it
      return { kind: 'unknown', message: `Could not confirm the upload (${describe(error)}). It will be checked on the next sync.` };
    }
    inflight = null;
    if (!result.ok) return { kind: 'conflict', cloudUpdatedAt: '' };
    remember({ userId, baseVersion: result.version, syncedFingerprint: fingerprint(payload), lastSyncedAt: now() });
    return { kind: 'pushed' };
  };

  const run = async (): Promise<SyncOutcome> => {
    let remote: RemoteSnapshot | null;
    try {
      remote = await deps.remote.fetch();
    } catch (error) {
      return { kind: 'error', message: `The cloud can't be reached (${describe(error)}).` };
    }
    if (cancelled) return SIGNED_OUT;

    // An earlier upload whose answer was lost: did it land?
    if (inflight && remote && remote.version === inflight.version && remote.payload === inflight.payload) {
      remember({ userId, baseVersion: remote.version, syncedFingerprint: fingerprint(remote.payload), lastSyncedAt: now() });
      inflight = null;
    } else if (inflight) {
      inflight = null; // it did not land (or something newer replaced it): decide from the current state
    }

    if (!remote) return push(null);

    if (meta.baseVersion === null) {
      if (deps.localIsEmpty()) return pull(remote);
      return { kind: 'conflict', cloudUpdatedAt: remote.updatedAt };
    }

    const dirty = isDirty();
    if (remote.version === meta.baseVersion) return dirty ? push(meta.baseVersion) : { kind: 'up-to-date' };
    if (!dirty) return pull(remote);
    return { kind: 'conflict', cloudUpdatedAt: remote.updatedAt };
  };

  const guarded = async (work: () => Promise<SyncOutcome>): Promise<SyncOutcome> => {
    try {
      return await work();
    } catch (error) {
      return { kind: 'error', message: describe(error) };
    }
  };

  return {
    isDirty,
    sync() {
      if (!running) {
        running = guarded(run).finally(() => { running = null; });
      }
      return running;
    },
    cancel() {
      cancelled = true;
    },
    resolve(choice) {
      const start = (): Promise<SyncOutcome> => {
        running = guarded(async () => {
          let remote: RemoteSnapshot | null;
          try {
            remote = await deps.remote.fetch();
          } catch (error) {
            return { kind: 'error', message: `The cloud can't be reached (${describe(error)}).` };
          }
          if (cancelled) return SIGNED_OUT;
          if (choice === 'cloud') {
            return remote ? pull(remote, true) : { kind: 'error', message: 'There is no cloud copy to use.' };
          }
          // This device wins: overwrite, but only the version we just read
          return push(remote ? remote.version : null);
        }).finally(() => { running = null; });
        return running;
      };
      // Never alongside a sync: wait for the one that is running (its outcome does not matter here), then go
      return running ? running.then(start, start) : start();
    },
  };
}
