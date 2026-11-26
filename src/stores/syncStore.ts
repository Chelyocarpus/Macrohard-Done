import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { useTaskStore } from './taskStore.ts';
import { useUiStore } from './uiStore.ts';
import { SYNC_META_KEY } from '../utils/storage.ts';
import { createSyncEngine, type ConflictChoice, type SyncEngine, type SyncMeta, type SyncOutcome } from '../sync/syncCore.ts';
import { createStartGate } from '../sync/startGate.ts';
import { isLocalEmpty } from '../sync/localState.ts';
import { createCloudProfiles, createSupabaseRemote, getSupabase, isSyncConfigured, type CloudProfiles } from '../sync/supabaseRemote.ts';
import { getActiveProfile, setProfileHooks, useProfileStore } from './profileStore.ts';
import { useToastStore } from './toastStore.ts';
import { planLabelSync } from '../utils/profiles.ts';

/** Wait this long after the last edit before uploading, so typing a title is one upload, not many */
const UPLOAD_DELAY_MS = 3_000;
/** Coming back to the tab or regaining the connection checks the cloud, but at most this often */
const MIN_CHECK_INTERVAL_MS = 15_000;
/** Leaving a profile waits at most this long for its last changes to upload, then switches anyway */
const SWITCH_FLUSH_TIMEOUT_MS = 4_000;
/** After this many failed automatic attempts in a row, stop trying until the person presses "Sync now" */
const MAX_AUTO_FAILURES = 5;
const RETRY_DELAY_MS = 30_000;

export type SyncPhase = 'off' | 'signed-out' | 'idle' | 'syncing' | 'conflict' | 'error' | 'unknown';

interface SyncStore {
  phase: SyncPhase;
  email: string | null;
  /** A plain-language line for the Account section */
  message: string | null;
  lastSyncedAt: string | null;
  cloudUpdatedAt: string | null;
  authBusy: boolean;
  init: () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  resolveConflict: (choice: ConflictChoice) => Promise<void>;
}

function loadMeta(): SyncMeta | null {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    return raw ? (JSON.parse(raw) as SyncMeta) : null;
  } catch {
    return null;
  }
}

function saveMeta(meta: SyncMeta): void {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
}

function localIsEmpty(): boolean {
  return isLocalEmpty(useTaskStore.getState());
}

let engine: SyncEngine | null = null;
/** The account's list of profiles; set while signed in */
let cloudProfiles: CloudProfiles | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let failures = 0;
let lastRunAt = 0;
let started = false;
/** Lets one sign-in start the engine at a time, and stops a start that a sign-out has made out of date */
const startGate = createStartGate();

export const useSyncStore = create<SyncStore>()((set, get) => {
  const apply = (outcome: SyncOutcome) => {
    const now = new Date().toISOString();
    switch (outcome.kind) {
      case 'up-to-date':
      case 'pushed':
      case 'pulled':
        failures = 0;
        set({ phase: 'idle', message: null, lastSyncedAt: now, cloudUpdatedAt: null });
        break;
      case 'conflict':
        set({ phase: 'conflict', message: null, cloudUpdatedAt: outcome.cloudUpdatedAt || null });
        break;
      case 'unknown':
        failures += 1;
        set({ phase: 'unknown', message: outcome.message });
        break;
      case 'error':
        failures += 1;
        set({ phase: 'error', message: outcome.message });
        break;
    }
    // A local change made while syncing, or a failure worth retrying (bounded), schedules the next attempt
    if (outcome.kind === 'error' || outcome.kind === 'unknown') {
      if (failures < MAX_AUTO_FAILURES) schedule(RETRY_DELAY_MS);
    } else if (outcome.kind !== 'conflict' && engine?.isDirty()) {
      schedule(UPLOAD_DELAY_MS);
    }
  };

  /** Runs one sync now. Safe to call often: overlapping calls share one run (see createSyncEngine). */
  const runSync = async () => {
    if (!engine || get().phase === 'conflict') return;
    lastRunAt = Date.now();
    set({ phase: 'syncing', message: null });
    const running = engine;
    const outcome = await running.sync();
    // Signed out (or signed in again) while it ran: this answer belongs to a session that no longer exists
    if (engine !== running) return;
    apply(outcome);
  };

  function schedule(delayMs: number) {
    if (!engine || failures >= MAX_AUTO_FAILURES) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; void runSync(); }, delayMs);
  }

  /**
   * Matches the names and colours of this device's profiles with the account's (see `planLabelSync`): profiles made on
   * another device appear here, and the newer rename wins. Data is not touched. A failure is not shown as a sync
   * error: the profile list is simply refreshed again at the next sync.
   *
   * Robustness / pitfalls guarded against: the directory captured at the start is used throughout, so a sign-out in
   * the middle can't make it talk to a different account; profiles beyond the limit are counted and reported (the
   * result is incomplete), not silently dropped.
   */
  const reconcileProfiles = async () => {
    const directory = cloudProfiles;
    if (!directory) return;
    try {
      const plan = planLabelSync(useProfileStore.getState().profiles, await directory.list());
      useProfileStore.getState().applyLabelPlan(plan);
      for (const profile of plan.pushToCloud) {
        await directory.updateLabel(profile.id, { name: profile.name, color: profile.color, updatedAt: profile.updatedAt });
      }
      if (plan.skipped > 0) {
        useToastStore.getState().showWarning(
          'Some profiles were not added',
          `Your account has ${plan.skipped} more profile${plan.skipped === 1 ? '' : 's'} than this app can show. Delete a profile you no longer need, then press "Sync now".`,
        );
      }
    } catch { /* retried at the next sync */ }
  };

  /** Before switching profile: upload this one's unsynced changes if that takes a moment, never longer than the limit */
  const flushBeforeSwitch = async () => {
    if (!engine || get().phase === 'conflict' || !engine.isDirty()) return;
    await Promise.race([runSync(), new Promise<void>((resolve) => setTimeout(resolve, SWITCH_FLUSH_TIMEOUT_MS))]);
  };

  /**
   * Starts syncing for a signed-in account.
   *
   * Robustness / pitfalls guarded against:
   * - Two sign-in events close together (the account sends INITIAL_SESSION and SIGNED_IN on page load): the gate is
   *   taken BEFORE the first wait, so only one engine is made, and a second call returns at once.
   * - Signing out while this is still waiting for the Supabase client: `end()` invalidates the gate, and this stops
   *   after the wait instead of creating an engine (and uploading) for a signed-out account.
   * - A failed wait (client could not load): the gate is released in `finally`, so the next sign-in can start.
   */
  const begin = async (session: Session) => {
    if (engine) return;
    const ticket = startGate.tryStart();
    if (ticket === null) return;
    let client: Awaited<ReturnType<typeof getSupabase>>;
    try {
      client = await getSupabase();
      if (!startGate.isCurrent(ticket) || engine) return;
    } finally {
      // From here `engine` itself blocks a second start (it is set in the same step below)
      startGate.done(ticket);
    }
    const userId = session.user.id;
    cloudProfiles = createCloudProfiles(client, userId);
    engine = createSyncEngine(userId, {
      remote: createSupabaseRemote(client, userId, getActiveProfile().id, () => {
        const { name, color, updatedAt } = getActiveProfile();
        return { name, color, updatedAt };
      }),
      loadMeta,
      saveMeta,
      exportLocal: () => useTaskStore.getState().exportBackup(),
      applyRemote: (data, options) => {
        // Keep the "undo" copy only when this replaces work that exists nowhere else (the person chose the cloud copy)
        // Without `settings`, this device keeps its own theme, row height and sidebar: they are not synced data
        const result = useTaskStore.getState().importBackup({ ...data, settings: undefined }, { saveUndoCopy: options.replacesLocalWork });
        if (result.status !== 'failed') {
          const ui = useUiStore.getState();
          ui.selectTask(null);
          ui.clearOpenTask();
          ui.setTagFilter(null);
        }
        return result;
      },
      localIsEmpty,
    });
    failures = 0;
    set({ phase: 'idle', email: session.user.email ?? null, message: null, authBusy: false });
    // The account's profile names first, so this profile has the account's name before its data row is made
    // (the name is read when the row is written, not now)
    await reconcileProfiles();
    await runSync();
  };

  const end = () => {
    startGate.invalidate();
    engine?.cancel(); // a run still waiting for the cloud must not import or upload anything now
    engine = null;
    cloudProfiles = null;
    if (timer) clearTimeout(timer);
    timer = null;
    set({ phase: 'signed-out', email: null, message: null, lastSyncedAt: null, cloudUpdatedAt: null });
  };

  const watchLocalChanges = () => {
    // Only the data that is synced: moving between views or opening a task must not cause uploads
    useTaskStore.subscribe((state, previous) => {
      if (!engine) return;
      if (
        state.tasks !== previous.tasks
        || state.lists !== previous.lists
        || state.listGroups !== previous.listGroups
        || state.categories !== previous.categories
        || state.customTimePresets !== previous.customTimePresets
        || state.disabledBuiltInPresets !== previous.disabledBuiltInPresets
      ) {
        failures = 0;
        if (get().phase !== 'conflict') schedule(UPLOAD_DELAY_MS);
      }
    });
    const recheck = () => {
      if (!engine || document.visibilityState === 'hidden') return;
      if (Date.now() - lastRunAt < MIN_CHECK_INTERVAL_MS) return;
      schedule(0);
    };
    window.addEventListener('focus', recheck);
    window.addEventListener('online', recheck);
    document.addEventListener('visibilitychange', recheck);
  };

  return {
    phase: isSyncConfigured ? 'signed-out' : 'off',
    email: null,
    message: null,
    lastSyncedAt: null,
    cloudUpdatedAt: null,
    authBusy: false,

    init: () => {
      if (!isSyncConfigured || started) return;
      started = true;
      setProfileHooks({
        beforeSwitch: flushBeforeSwitch,
        removeCloud: async (profileId) => { if (cloudProfiles) await cloudProfiles.remove(profileId); },
        labelChanged: (profile) => {
          void cloudProfiles?.updateLabel(profile.id, { name: profile.name, color: profile.color, updatedAt: profile.updatedAt }).catch(() => { /* sent again at the next sync */ });
        },
      });
      watchLocalChanges();
      void getSupabase().then((client) => {
        client.auth.onAuthStateChange((event, session) => {
          // Don't call back into Supabase from inside this callback (it can deadlock): defer a tick
          setTimeout(() => {
            if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
              if (!engine) {
                begin(session).catch((error: unknown) => {
                  set({ phase: 'error', message: error instanceof Error ? error.message : String(error) });
                });
              }
            } else if (!session && (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION')) {
              end();
            }
          }, 0);
        });
      }).catch((error: unknown) => {
        set({ phase: 'error', message: error instanceof Error ? error.message : String(error) });
      });
    },

    signIn: async (email, password) => {
      set({ authBusy: true });
      try {
        const client = await getSupabase();
        const { error } = await client.auth.signInWithPassword({ email, password });
        return error ? error.message : null;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      } finally {
        set({ authBusy: false });
      }
    },

    signUp: async (email, password) => {
      set({ authBusy: true });
      try {
        const client = await getSupabase();
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) return error.message;
        return data.session ? null : 'Account created. Check your email for a link to confirm it, then sign in.';
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      } finally {
        set({ authBusy: false });
      }
    },

    signOut: async () => {
      try {
        const client = await getSupabase();
        await client.auth.signOut();
      } catch { /* the local session is dropped below either way */ }
      end(); // this device keeps its data
    },

    syncNow: async () => {
      failures = 0;
      if (get().phase === 'syncing') return;
      if (get().phase === 'conflict') return;
      await reconcileProfiles();
      await runSync();
    },

    resolveConflict: async (choice) => {
      if (!engine || get().phase !== 'conflict') return;
      set({ phase: 'syncing', message: null });
      const running = engine;
      const outcome = await running.resolve(choice);
      if (engine !== running) return;
      apply(outcome);
    },
  };
});
