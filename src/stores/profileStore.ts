import { create } from 'zustand';
import { useTaskStore } from './taskStore.ts';
import { ACTIVE_PROFILE_ID, generateId } from '../utils/storage.ts';
import {
  PROFILES_KEY, addProfileTo, carrySettings, defaultProfilesState, deleteProfileData, loadProfiles, mutateProfiles, prepareSwitch,
  removeProfileFrom, updateProfileIn, type LabelPlan, type Profile, type SharedSettings,
} from '../utils/profiles.ts';

/**
 * What the cloud layer lends to profile actions (set by stores/syncStore.ts; kept as hooks so the two stores do not
 * import each other). Every hook is optional: with no account, nothing here talks to a server.
 */
export interface ProfileHooks {
  /** Before leaving a profile: upload its unsynced changes if that is quick (it never blocks for long) */
  beforeSwitch?: () => Promise<void>;
  /** Before deleting a profile: remove its cloud copy. Throws when that could not be done. */
  removeCloud?: (profileId: string) => Promise<void>;
  /** After a rename or recolour: send it to the account (best effort) */
  labelChanged?: (profile: Profile) => void;
}

let hooks: ProfileHooks = {};
export function setProfileHooks(next: ProfileHooks): void {
  hooks = next;
}

type Outcome = { ok: true } | { ok: false; error: string };

interface ProfileStore {
  profiles: Profile[];
  /** The profile this tab is working in. It never changes while the page is open: switching reloads the page. */
  activeId: string;
  busy: boolean;
  init: () => void;
  create: (name: string, color: string) => Outcome & { profile?: Profile };
  update: (id: string, changes: { name?: string; color?: string }) => Outcome;
  remove: (id: string) => Promise<Outcome & { warning?: string }>;
  /** Opens another profile (reloads the page). Resolves with a reason when it could not switch. */
  switchTo: (id: string) => Promise<string | null>;
  /** Applies what `planLabelSync` decided about names and colours from the account */
  applyLabelPlan: (plan: Pick<LabelPlan, 'create' | 'applyLocally'>) => void;
}

function readSharedSettings(): SharedSettings {
  const { themePreference, darkMode, rowDensity, sidebarCollapsed } = useTaskStore.getState();
  return { themePreference, darkMode, rowDensity, sidebarCollapsed };
}

const storage = (): Storage | null => {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
};

export const useProfileStore = create<ProfileStore>()((set, get) => {
  const initial = (() => {
    const s = storage();
    return s ? loadProfiles(s).profiles : [];
  })();
  let initialised = false;

  return {
    profiles: initial,
    activeId: ACTIVE_PROFILE_ID,
    busy: false,

    /**
     * Another tab changed the profiles: show the new list. If THIS tab's profile was deleted there, reload so the page
     * opens on one that still exists (otherwise this tab would keep saving into data that was deleted).
     */
    init: () => {
      const s = storage();
      if (initialised || !s || typeof window === 'undefined') return;
      initialised = true;
      window.addEventListener('storage', (event) => {
        if (event.key !== PROFILES_KEY && event.key !== null) return;
        const fresh = loadProfiles(s);
        set({ profiles: fresh.profiles });
        if (!fresh.profiles.some((p) => p.id === get().activeId)) window.location.reload();
      });
    },

    /**
     * Robustness / pitfalls guarded against: the list is changed as it is in storage now (see `mutateProfiles`), so
     * profiles made in another tab survive; the limit, duplicate names and bad colours are refused with a reason
     * and nothing is written; the new profile starts with this device's theme and layout settings.
     */
    create: (name, color) => {
      const s = storage();
      if (!s) return { ok: false, error: 'Your browser does not allow this app to save profiles.' };
      const result = mutateProfiles(s, (fresh) => addProfileTo(fresh, { id: generateId(), name, color }, new Date().toISOString()));
      if (!result.ok) return { ok: false, error: result.error };
      carrySettings(s, result.profile.id, readSharedSettings()); // best effort; the profile opens with defaults otherwise
      set({ profiles: result.state.profiles });
      return { ok: true, profile: result.profile };
    },

    update: (id, changes) => {
      const s = storage();
      if (!s) return { ok: false, error: 'Your browser does not allow this app to save profiles.' };
      const result = mutateProfiles(s, (fresh) => updateProfileIn(fresh, id, changes, new Date().toISOString()));
      if (!result.ok) return { ok: false, error: result.error };
      set({ profiles: result.state.profiles });
      hooks.labelChanged?.(result.profile);
      return { ok: true };
    },

    /**
     * Deletes a profile and everything in it.
     *
     * Robustness / pitfalls guarded against:
     * - The profile this tab is in can't be deleted (it would keep saving into data that was just removed): the person
     *   switches first.
     * - The account's copy goes first. If that fails, nothing is deleted at all, so the profile can't come back from the
     *   account later as a surprise. While signed out there is no account copy to remove (the dialog says so).
     * - The list is changed before the data is removed, so a failure in between leaves unused data behind (reported as a
     *   warning), never a listed profile with its data gone.
     * - The last profile can't be deleted (see `removeProfileFrom`).
     */
    remove: async (id) => {
      const s = storage();
      if (!s) return { ok: false, error: 'Your browser does not allow this app to save profiles.' };
      if (id === get().activeId) return { ok: false, error: 'Switch to another profile first, then delete this one.' };
      if (get().busy) return { ok: false, error: 'Wait for the current action to finish.' };
      set({ busy: true });
      try {
        if (!loadProfiles(s).profiles.some((p) => p.id === id)) return { ok: false, error: 'This profile no longer exists.' };
        if (loadProfiles(s).profiles.length <= 1) return { ok: false, error: 'You need at least one profile.' };
        try {
          await hooks.removeCloud?.(id);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          return { ok: false, error: `It could not be removed from your account (${reason}), so nothing was deleted.` };
        }
        const result = mutateProfiles(s, (fresh) => removeProfileFrom(fresh, id));
        if (!result.ok) return { ok: false, error: result.error };
        set({ profiles: result.state.profiles });
        const cleared = deleteProfileData(s, id);
        return cleared.ok ? { ok: true } : { ok: true, warning: cleared.reason };
      } finally {
        set({ busy: false });
      }
    },

    /**
     * Robustness / pitfalls guarded against:
     * - Unsynced changes are uploaded first when that is quick (bounded by the hook), so the other profile's device
     *   copy doesn't wait for the next visit; a slow or failing upload never blocks switching (the data is safe here).
     * - A save still waiting in the task store is written before the reload, so the last edits stay in this profile.
     * - Nothing switches unless the change was saved and read back (`prepareSwitch`); otherwise the reason is returned.
     * - A reload (not an in-place swap) makes every store, the sync engine and the open panels start fresh from the
     *   new profile, so nothing of the old profile can leak into the new one or be saved into it.
     */
    switchTo: async (id) => {
      const s = storage();
      if (!s) return 'Your browser does not allow this app to save profiles.';
      if (id === get().activeId || get().busy) return null;
      set({ busy: true });
      try {
        try { await hooks.beforeSwitch?.(); } catch { /* the data is saved on this device either way */ }
        // Saves are delayed a moment; write the last edits before the page leaves this profile
        useTaskStore.getState().flushPendingSave();
        const result = prepareSwitch(s, id, readSharedSettings());
        if (!result.ok) return result.reason;
        // The address names a list or tag of the profile being left; the new profile opens where it was last
        try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch { /* a locked-down browser: the new profile ignores a link to a place it does not have */ }
        window.location.reload();
        return null;
      } finally {
        set({ busy: false });
      }
    },

    applyLabelPlan: (plan) => {
      const s = storage();
      if (!s || (plan.create.length === 0 && plan.applyLocally.length === 0)) return;
      const result = mutateProfiles(s, (fresh) => {
        let state = fresh;
        for (const profile of plan.create) {
          const added = addProfileTo(state, { id: profile.id, name: profile.name, color: profile.color }, profile.updatedAt);
          if (added.ok) state = added.state;
        }
        for (const profile of plan.applyLocally) {
          const updated = updateProfileIn(state, profile.id, { name: profile.name, color: profile.color }, profile.updatedAt);
          if (updated.ok) state = updated.state;
        }
        return { ok: true as const, state };
      });
      if (result.ok) set({ profiles: result.state.profiles });
    },
  };
});

/** Shown only if the browser blocks storage entirely, so the app still has a profile to name */
const FALLBACK_PROFILE: Profile = defaultProfilesState().profiles[0];

/** The profile this tab is working in */
export function useActiveProfile(): Profile {
  return useProfileStore((state) => state.profiles.find((p) => p.id === state.activeId) ?? state.profiles[0] ?? FALLBACK_PROFILE);
}

/** The same, for code outside React */
export function getActiveProfile(): Profile {
  const { profiles, activeId } = useProfileStore.getState();
  return profiles.find((p) => p.id === activeId) ?? profiles[0] ?? FALLBACK_PROFILE;
}
