import type { SupabaseClient } from '@supabase/supabase-js';
import type { PushResult, RemoteSnapshot, RemoteStore } from './syncCore.ts';

const TABLE = 'user_snapshots';
/** Give up on a request after this long; the result is then "unknown", never "failed" */
const REQUEST_TIMEOUT_MS = 20_000;

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Sync is on only when the project's address and public key were given at build time (see README). */
export const isSyncConfigured = Boolean(url && anonKey);

let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * The Supabase client, loaded on first use so people who never sign in don't download it.
 * The key here is the public "anon" key: what it may do is decided by the row-level security
 * rules in supabase/schema.sql, not by keeping the key secret.
 */
export function getSupabase(): Promise<SupabaseClient> {
  if (!url || !anonKey) return Promise.reject(new Error('Sync is not set up for this copy of the app.'));
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }),
  );
  return clientPromise;
}

/** Runs a request but stops waiting after the timeout (the request itself may still finish). */
function withTimeout<T>(work: PromiseLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The request timed out.')), REQUEST_TIMEOUT_MS);
    Promise.resolve(work).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}

/** The name and colour of a profile, written along with its data so other devices can list the account's profiles */
export interface ProfileLabel {
  name: string;
  color: string;
  updatedAt: string;
}

/**
 * The cloud copy of one profile's data (one row per account AND profile).
 *
 * Robustness / pitfalls guarded against:
 * - Concurrent writers: an update only matches the row while `version` still equals the version this device
 *   last saw (`.eq('version', base)`), and sets version = base + 1. The check and the write are ONE statement
 *   in the database, so two devices can't both win; the loser gets zero rows back and reports a conflict.
 *   The database trigger also refuses any version jump other than +1.
 * - First upload racing another device's first upload: the insert hits the primary key (error 23505), which is
 *   reported as a conflict, not an error.
 * - Another account's row: every request is also filtered by `user_id`, and row-level security refuses anything
 *   that isn't the signed-in user's own row, even if this code were wrong.
 * - Another PROFILE's row: every request is also filtered by `profile_id`, so saving "Work" can never touch
 *   "Personal". The profile is fixed when this object is made (the page reloads to change profile).
 * - Lost acknowledgement / timeout: the call throws (it does NOT report "conflict" or "ok"), so the engine treats
 *   the outcome as unknown and checks on the next sync instead of retrying blindly.
 * - Verifying the effect: an update is only a success when the database returns the row with the new version.
 */
export function createSupabaseRemote(client: SupabaseClient, userId: string, profileId: string, getLabel: () => ProfileLabel): RemoteStore {
  const labelColumns = () => {
    const label = getLabel();
    return { profile_name: label.name, profile_color: label.color, profile_updated_at: label.updatedAt };
  };
  return {
    async fetch(): Promise<RemoteSnapshot | null> {
      const { data, error } = await withTimeout(
        client.from(TABLE).select('payload, version, updated_at').eq('user_id', userId).eq('profile_id', profileId).maybeSingle(),
      );
      if (error) throw new Error(error.message);
      if (!data) return null;
      return { payload: String(data.payload), version: Number(data.version), updatedAt: String(data.updated_at) };
    },

    async push(payload: string, baseVersion: number | null): Promise<PushResult> {
      if (baseVersion === null) {
        const { error } = await withTimeout(client.from(TABLE).insert({ user_id: userId, profile_id: profileId, payload, version: 1, ...labelColumns() }));
        if (!error) return { ok: true, version: 1 };
        if (error.code === '23505') return { ok: false, reason: 'conflict' };
        throw new Error(error.message);
      }
      const { data, error } = await withTimeout(
        client
          .from(TABLE)
          .update({ payload, version: baseVersion + 1 }) // the name/colour are only ever changed by `updateCloudLabel`, newest wins
          .eq('user_id', userId)
          .eq('profile_id', profileId)
          .eq('version', baseVersion)
          .select('version'),
      );
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return { ok: false, reason: 'conflict' };
      const saved = Number((data[0] as { version: unknown }).version);
      if (saved !== baseVersion + 1) throw new Error('The cloud answered with an unexpected version.');
      return { ok: true, version: saved };
    },
  };
}

/** One profile of the account as the cloud lists it (its data is not downloaded) */
export interface CloudProfileRow {
  id: string;
  name: string;
  color: string;
  updatedAt: string;
}

/** Never ask for more than this many rows; the app only keeps `MAX_PROFILES` anyway */
const MAX_LISTED_PROFILES = 50;

/**
 * The account's list of profiles: who they are, not what is in them.
 *
 * Robustness / pitfalls guarded against:
 * - Another account's or profile's rows: filtered by `user_id` (and by RLS); changes are filtered by `profile_id` too.
 * - Two devices renaming at once: a label update only matches while the cloud's label is OLDER than the one being
 *   sent (`.lt('profile_updated_at', ...)`), in one statement, so the newest change wins no matter who arrives first.
 * - Deleting: the result is verified by reading the row back; "removed" is only reported when it is really gone.
 * - Bounded: a listing is capped at MAX_LISTED_PROFILES rows.
 */
export function createCloudProfiles(client: SupabaseClient, userId: string) {
  return {
    async list(): Promise<CloudProfileRow[]> {
      const { data, error } = await withTimeout(
        client.from(TABLE).select('profile_id, profile_name, profile_color, profile_updated_at').eq('user_id', userId).limit(MAX_LISTED_PROFILES),
      );
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => ({
        id: String(row.profile_id),
        name: String(row.profile_name),
        color: String(row.profile_color),
        updatedAt: String(row.profile_updated_at),
      }));
    },

    /** Sends a newer name/colour. Does nothing (and is not an error) when the cloud already has a newer one or no row yet. */
    async updateLabel(profileId: string, label: ProfileLabel): Promise<void> {
      const { error } = await withTimeout(
        client
          .from(TABLE)
          .update({ profile_name: label.name, profile_color: label.color, profile_updated_at: label.updatedAt })
          .eq('user_id', userId)
          .eq('profile_id', profileId)
          .lt('profile_updated_at', label.updatedAt),
      );
      if (error) throw new Error(error.message);
    },

    /** Removes the profile's cloud copy. Throws unless the row is confirmed gone. */
    async remove(profileId: string): Promise<void> {
      const { error } = await withTimeout(client.from(TABLE).delete().eq('user_id', userId).eq('profile_id', profileId));
      if (error) throw new Error(error.message);
      const { data, error: checkError } = await withTimeout(
        client.from(TABLE).select('profile_id').eq('user_id', userId).eq('profile_id', profileId).maybeSingle(),
      );
      if (checkError) throw new Error(checkError.message);
      if (data) throw new Error('The cloud copy of this profile is still there.');
    },
  };
}

export type CloudProfiles = ReturnType<typeof createCloudProfiles>;
