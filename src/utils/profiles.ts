/**
 * Profiles: separate workspaces (Personal, Work, ...) inside one account. Each profile has its own lists, tasks,
 * tags and My Day. Device settings (theme, row height, sidebar) are shared by all of them.
 *
 * How it is stored: the list of profiles lives under one small key (`PROFILES_KEY`); every profile's data lives under
 * its own keys (see `keysFor`). The profile with the id `default` uses the keys the app had before profiles existed,
 * so nobody's data has to be moved when they update.
 *
 * Everything here is plain logic over a tiny storage interface (no React, no stores), so it can be tested with fakes.
 * This file must not import `storage.ts` or `backup.ts` (they import it).
 */

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface Profile {
  id: string;
  name: string;
  /** #rrggbb */
  color: string;
  /** ISO time of the last rename or colour change (the newer one wins when devices disagree) */
  updatedAt: string;
}

export interface ProfilesState {
  /** The profile a NEW tab opens with. A tab that is already open keeps the one it started with. */
  activeId: string;
  profiles: Profile[];
}

export const PROFILES_KEY = 'todo-clone-profiles';
export const PROFILES_CORRUPT_KEY = 'todo-clone-profiles-corrupt-backup';
export const DEFAULT_PROFILE_ID = 'default';
export const DEFAULT_PROFILE_NAME = 'Personal';
/** How many profiles a person can make (the app asks for confirmation of nothing beyond this: it is a plain limit) */
export const MAX_PROFILES = 8;
export const MAX_PROFILE_NAME = 30;
/** Never drop profiles that already exist when reading, however many there are (only creating is limited) */
const MAX_READ_PROFILES = 50;

export const PROFILE_COLORS: readonly { value: string; label: string }[] = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#78716c', label: 'Stone' },
];

const HEX = /^#[0-9A-Fa-f]{6}$/;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const isProfileId = (value: unknown): value is string => typeof value === 'string' && ID_PATTERN.test(value);

// ---- Storage keys ----------------------------------------------------------------------------

const BASE_KEYS = {
  data: 'todo-clone-data',
  backup: 'todo-clone-data-before-import',
  corrupt: 'todo-clone-data-corrupt-backup',
  syncMeta: 'todo-clone-sync-meta',
  reminders: 'todo-clone-reminders-delivered',
} as const;

export interface ProfileKeys {
  data: string;
  /** The copy kept just before an import replaced the data */
  backup: string;
  corrupt: string;
  /** What this device remembers about the last cloud sync of this profile */
  syncMeta: string;
  /** Which reminders of this profile this device has already alerted (see utils/reminders.ts) */
  reminders: string;
}

/** The storage keys of one profile. `default` keeps the original names; the others get a suffix. */
export function keysFor(profileId: string): ProfileKeys {
  if (profileId === DEFAULT_PROFILE_ID) return { ...BASE_KEYS };
  return {
    data: `${BASE_KEYS.data}:profile:${profileId}`,
    backup: `${BASE_KEYS.backup}:profile:${profileId}`,
    corrupt: `${BASE_KEYS.corrupt}:profile:${profileId}`,
    syncMeta: `${BASE_KEYS.syncMeta}:profile:${profileId}`,
    reminders: `${BASE_KEYS.reminders}:profile:${profileId}`,
  };
}

/** The first character of a name, for the round badge. Takes a whole emoji or accented letter, not half of one. */
export function profileInitial(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toLocaleUpperCase() : '?';
}

// ---- Reading and repairing the list ----------------------------------------------------------

export function defaultProfilesState(now: string = new Date().toISOString()): ProfilesState {
  return {
    activeId: DEFAULT_PROFILE_ID,
    profiles: [{ id: DEFAULT_PROFILE_ID, name: DEFAULT_PROFILE_NAME, color: PROFILE_COLORS[0].value, updatedAt: now }],
  };
}

const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ');
const nameKey = (name: string) => cleanName(name).toLowerCase();

/**
 * Turns whatever was stored into a valid list.
 *
 * Robustness / pitfalls guarded against:
 * - Damaged entries (no id, a bad id, no name, a bad colour, a repeated id) are repaired or skipped one by one, so
 *   one bad entry never costs the person the others.
 * - Nothing left, or not an object at all: the single default profile, so the app always has somewhere to put data.
 * - An active id that no longer exists falls back to the first profile.
 * - Existing profiles are never dropped for being "too many".
 */
export function normalizeProfiles(raw: unknown, now: string = new Date().toISOString()): ProfilesState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaultProfilesState(now);
  const source = raw as { activeId?: unknown; profiles?: unknown };
  const seen = new Set<string>();
  const profiles: Profile[] = [];
  if (Array.isArray(source.profiles)) {
    for (const item of source.profiles) {
      if (profiles.length >= MAX_READ_PROFILES) break;
      if (!item || typeof item !== 'object') continue;
      const entry = item as Record<string, unknown>;
      if (!isProfileId(entry.id) || seen.has(entry.id)) continue;
      const name = typeof entry.name === 'string' ? cleanName(entry.name).slice(0, MAX_PROFILE_NAME) : '';
      if (!name) continue;
      seen.add(entry.id);
      profiles.push({
        id: entry.id,
        name,
        color: typeof entry.color === 'string' && HEX.test(entry.color) ? entry.color : PROFILE_COLORS[0].value,
        updatedAt: typeof entry.updatedAt === 'string' && !Number.isNaN(Date.parse(entry.updatedAt)) ? entry.updatedAt : now,
      });
    }
  }
  if (profiles.length === 0) return defaultProfilesState(now);
  const activeId = typeof source.activeId === 'string' && seen.has(source.activeId) ? source.activeId : profiles[0].id;
  return { activeId, profiles };
}

/**
 * Reads the list of profiles. Never throws and never writes the list itself.
 *
 * Robustness / pitfalls guarded against:
 * - Unreadable storage: the default profile, so the app still opens.
 * - A damaged list: the raw text is copied to a backup key before the default is used, because the next save of the
 *   list would otherwise overwrite it.
 */
export function loadProfiles(storage: KeyValueStorage): ProfilesState {
  let text: string | null = null;
  try {
    text = storage.getItem(PROFILES_KEY);
    if (text === null) return defaultProfilesState();
    return normalizeProfiles(JSON.parse(text));
  } catch {
    if (text) {
      try { storage.setItem(PROFILES_CORRUPT_KEY, text); } catch { /* best effort */ }
    }
    return defaultProfilesState();
  }
}

// ---- Changing the list (pure) ----------------------------------------------------------------

export type ProfileResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** A plain-language problem with a profile name, or null when it is fine. */
export function nameProblem(name: string, profiles: readonly Profile[], exceptId?: string): string | null {
  const cleaned = cleanName(name);
  if (!cleaned) return 'Give the profile a name.';
  if (cleaned.length > MAX_PROFILE_NAME) return `Use at most ${MAX_PROFILE_NAME} characters.`;
  if (profiles.some((p) => p.id !== exceptId && nameKey(p.name) === nameKey(cleaned))) return 'You already have a profile with this name.';
  return null;
}

export function addProfileTo(
  state: ProfilesState,
  input: { id: string; name: string; color: string },
  now: string,
): ProfileResult<{ state: ProfilesState; profile: Profile }> {
  if (state.profiles.length >= MAX_PROFILES) return { ok: false, error: `You can have up to ${MAX_PROFILES} profiles.` };
  if (!isProfileId(input.id) || state.profiles.some((p) => p.id === input.id)) return { ok: false, error: 'That profile could not be created. Try again.' };
  const problem = nameProblem(input.name, state.profiles);
  if (problem) return { ok: false, error: problem };
  const profile: Profile = { id: input.id, name: cleanName(input.name), color: HEX.test(input.color) ? input.color : PROFILE_COLORS[0].value, updatedAt: now };
  return { ok: true, state: { ...state, profiles: [...state.profiles, profile] }, profile };
}

export function updateProfileIn(
  state: ProfilesState,
  id: string,
  changes: { name?: string; color?: string },
  now: string,
): ProfileResult<{ state: ProfilesState; profile: Profile }> {
  const existing = state.profiles.find((p) => p.id === id);
  if (!existing) return { ok: false, error: 'This profile no longer exists.' };
  if (changes.name !== undefined) {
    const problem = nameProblem(changes.name, state.profiles, id);
    if (problem) return { ok: false, error: problem };
  }
  if (changes.color !== undefined && !HEX.test(changes.color)) return { ok: false, error: 'Pick one of the colours.' };
  const name = changes.name !== undefined ? cleanName(changes.name) : existing.name;
  const color = changes.color ?? existing.color;
  if (name === existing.name && color === existing.color) return { ok: true, state, profile: existing };
  const profile: Profile = { ...existing, name, color, updatedAt: now };
  return { ok: true, state: { ...state, profiles: state.profiles.map((p) => (p.id === id ? profile : p)) }, profile };
}

/** Removes one profile from the list (its data is removed separately). The last profile can't be removed. */
export function removeProfileFrom(state: ProfilesState, id: string): ProfileResult<{ state: ProfilesState }> {
  if (!state.profiles.some((p) => p.id === id)) return { ok: false, error: 'This profile no longer exists.' };
  if (state.profiles.length <= 1) return { ok: false, error: 'You need at least one profile.' };
  const profiles = state.profiles.filter((p) => p.id !== id);
  return { ok: true, state: { activeId: state.activeId === id ? profiles[0].id : state.activeId, profiles } };
}

// ---- Matching this device's profiles with the account's --------------------------------------

export interface CloudProfile {
  id: string;
  name: string;
  color: string;
  updatedAt: string;
}

export interface LabelPlan {
  /** In the account but not on this device: add them here */
  create: Profile[];
  /** On both, and the account's name/colour is newer: take it */
  applyLocally: Profile[];
  /** On both, and this device's name/colour is newer: send it */
  pushToCloud: Profile[];
}

/**
 * Decides, per profile, whose name and colour win: the newer change (a rename on a phone reaches the laptop, not the
 * other way round). Data is NOT decided here; each profile's data syncs on its own.
 *
 * Robustness / pitfalls guarded against:
 * - A profile that exists only on this device is left alone (it is uploaded with its first data sync); it is never
 *   treated as "deleted in the account".
 * - Creating profiles from the account stops at MAX_PROFILES, so a crowded account can't flood this device; the
 *   profiles that did not fit are counted in `skipped` so the caller can say the result is incomplete.
 * - Damaged cloud entries (bad id, name or colour) are ignored, never copied in.
 * - Equal or unreadable times change nothing (this device keeps its own), so two devices can't swap names back and forth.
 */
export function planLabelSync(local: readonly Profile[], cloud: readonly CloudProfile[]): LabelPlan & { skipped: number } {
  const plan: LabelPlan & { skipped: number } = { create: [], applyLocally: [], pushToCloud: [], skipped: 0 };
  const byId = new Map(local.map((p) => [p.id, p]));
  let room = Math.max(0, MAX_PROFILES - local.length);
  const takenNames = new Set(local.map((p) => nameKey(p.name)));
  for (const remote of cloud) {
    if (!isProfileId(remote.id)) continue;
    const name = cleanName(remote.name).slice(0, MAX_PROFILE_NAME);
    if (!name || !HEX.test(remote.color)) continue;
    const own = byId.get(remote.id);
    if (!own) {
      if (room <= 0) { plan.skipped += 1; continue; }
      room -= 1;
      // A different profile with the same name already exists here: keep both, tell them apart
      let unique = name;
      for (let n = 2; takenNames.has(nameKey(unique)) && n < 100; n++) unique = `${name.slice(0, MAX_PROFILE_NAME - 4)} (${n})`;
      takenNames.add(nameKey(unique));
      plan.create.push({ id: remote.id, name: unique, color: remote.color, updatedAt: remote.updatedAt });
      continue;
    }
    const cloudTime = Date.parse(remote.updatedAt);
    const localTime = Date.parse(own.updatedAt);
    if (Number.isNaN(cloudTime) || Number.isNaN(localTime) || cloudTime === localTime) continue;
    if (own.name === name && own.color === remote.color) continue;
    if (cloudTime > localTime) plan.applyLocally.push({ id: own.id, name, color: remote.color, updatedAt: remote.updatedAt });
    else plan.pushToCloud.push(own);
  }
  return plan;
}

// ---- Writing (storage) -----------------------------------------------------------------------

export type WriteResult = { ok: true } | { ok: false; reason: string };

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Saves the list and reads it back. A value that does not read back the same is a failure, never a silent success. */
export function saveProfiles(storage: KeyValueStorage, state: ProfilesState): WriteResult {
  const text = JSON.stringify(state);
  try {
    storage.setItem(PROFILES_KEY, text);
    if (storage.getItem(PROFILES_KEY) !== text) return { ok: false, reason: 'The profiles could not be saved (the browser did not keep them).' };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: `The profiles could not be saved (${describe(error)}).` };
  }
}

/**
 * Changes the list of profiles as it is in storage RIGHT NOW (read, change, write), not as this tab last saw it.
 *
 * Robustness / pitfalls guarded against:
 * - Another tab changed the list meanwhile: the change is applied to the fresh list, so a profile made in the other
 *   tab is not overwritten by this tab's older copy.
 * - The change is refused by `change` (duplicate name, limit, last profile): nothing is written.
 * - The write is read back; on failure the caller gets a reason and nothing is reported as done.
 */
export function mutateProfiles<T extends object>(
  storage: KeyValueStorage,
  change: (fresh: ProfilesState) => ProfileResult<{ state: ProfilesState } & T>,
): ProfileResult<{ state: ProfilesState } & T> {
  const fresh = loadProfiles(storage);
  const result = change(fresh);
  if (!result.ok) return result;
  if (result.state === fresh) return result;
  const saved = saveProfiles(storage, result.state);
  return saved.ok ? result : { ok: false, error: saved.reason };
}

/** Device settings that every profile shares */
export interface SharedSettings {
  themePreference: string;
  darkMode: boolean;
  rowDensity: string;
  sidebarCollapsed: boolean;
}

/**
 * Puts the shared device settings into a profile's saved data, so it opens looking the same as the one being left.
 * A profile that has no data yet gets a small starting file with just the settings.
 *
 * Robustness / pitfalls guarded against:
 * - Damaged saved data is left exactly as it is (the loader keeps its own copy and starts clean); nothing is overwritten.
 * - A failed write is reported but not fatal: the profile then opens with default settings instead of failing to open.
 */
export function carrySettings(storage: KeyValueStorage, profileId: string, settings: SharedSettings): WriteResult {
  const key = keysFor(profileId).data;
  try {
    const existing = storage.getItem(key);
    let base: Record<string, unknown> = {};
    if (existing !== null) {
      const parsed: unknown = JSON.parse(existing);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, reason: 'The profile data is not readable, so its settings were left as they are.' };
      base = parsed as Record<string, unknown>;
    }
    storage.setItem(key, JSON.stringify({ ...base, ...settings }));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: `The settings could not be carried over (${describe(error)}).` };
  }
}

/**
 * Makes `targetId` the profile that opens next (the caller reloads the page afterwards).
 *
 * Robustness / pitfalls guarded against:
 * - A profile that was deleted in the meantime (another tab): refused, nothing is written.
 * - The list is written LAST and read back, so a failure leaves the person where they are, never on a half-switched state.
 * - Settings that could not be carried over do not block the switch (see `carrySettings`).
 */
export function prepareSwitch(storage: KeyValueStorage, targetId: string, settings: SharedSettings): WriteResult {
  const fresh = loadProfiles(storage);
  if (!fresh.profiles.some((p) => p.id === targetId)) return { ok: false, reason: 'This profile no longer exists.' };
  carrySettings(storage, targetId, settings);
  if (fresh.activeId === targetId) return { ok: true };
  return saveProfiles(storage, { ...fresh, activeId: targetId });
}

/**
 * Removes all saved data of one profile (data, undo copy, damaged-data copy, sync memory, delivered reminders).
 *
 * Robustness / pitfalls guarded against:
 * - Every key is attempted even if one fails.
 * - Success is reported only after reading every key back as empty.
 * - Only that profile's keys are touched.
 */
export function deleteProfileData(storage: KeyValueStorage, profileId: string): WriteResult {
  const keys = Object.values(keysFor(profileId));
  const problems: string[] = [];
  for (const key of keys) {
    try { storage.removeItem(key); } catch (error) { problems.push(describe(error)); }
  }
  for (const key of keys) {
    try { if (storage.getItem(key) !== null) problems.push(key); } catch { problems.push(key); }
  }
  return problems.length === 0 ? { ok: true } : { ok: false, reason: 'Some of the profile data could not be removed from this browser.' };
}

/** The profile this tab starts with (read once when the app loads). */
export function readActiveProfileId(storage: KeyValueStorage | undefined): string {
  if (!storage) return DEFAULT_PROFILE_ID;
  try {
    return loadProfiles(storage).activeId;
  } catch {
    return DEFAULT_PROFILE_ID;
  }
}
