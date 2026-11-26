import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROFILE_ID, MAX_PROFILES, MAX_PROFILE_NAME, PROFILES_CORRUPT_KEY, PROFILES_KEY, PROFILE_COLORS,
  addProfileTo, carrySettings, defaultProfilesState, deleteProfileData, keysFor, loadProfiles, mutateProfiles,
  nameProblem, normalizeProfiles, planLabelSync, prepareSwitch, profileInitial, removeProfileFrom, saveProfiles, updateProfileIn,
  type CloudProfile, type KeyValueStorage, type Profile, type ProfilesState, type SharedSettings,
} from './profiles.ts';

class FakeStorage implements KeyValueStorage {
  data = new Map<string, string>();
  failWrites = false;
  failWriteKeys = new Set<string>();
  /** Writes are accepted but read back as something else */
  garble = false;
  getItem(key: string) {
    const value = this.data.get(key) ?? null;
    return this.garble && value !== null ? `${value}!` : value;
  }
  setItem(key: string, value: string) {
    if (this.failWrites || this.failWriteKeys.has(key)) throw new Error('quota exceeded');
    this.data.set(key, value);
  }
  removeItem(key: string) { this.data.delete(key); }
}

const NOW = '2026-11-23T10:00:00.000Z';
const LATER = '2026-11-23T12:00:00.000Z';
const EARLIER = '2026-11-23T08:00:00.000Z';
const settings: SharedSettings = { themePreference: 'dark', darkMode: true, rowDensity: 'comfortable', sidebarCollapsed: true };

const profile = (id: string, name: string, updatedAt = NOW, color = '#10b981'): Profile => ({ id, name, color, updatedAt });
const stateOf = (...profiles: Profile[]): ProfilesState => ({ activeId: profiles[0].id, profiles });

describe('keysFor', () => {
  it('keeps the original names for the default profile, so nothing has to be moved', () => {
    expect(keysFor(DEFAULT_PROFILE_ID)).toEqual({
      data: 'todo-clone-data',
      backup: 'todo-clone-data-before-import',
      corrupt: 'todo-clone-data-corrupt-backup',
      syncMeta: 'todo-clone-sync-meta',
      reminders: 'todo-clone-reminders-delivered',
    });
  });

  it('gives every other profile its own, different keys', () => {
    const a = keysFor('abc');
    const b = keysFor('xyz');
    const all = [...Object.values(a), ...Object.values(b), ...Object.values(keysFor(DEFAULT_PROFILE_ID))];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('profileInitial', () => {
  it('takes the first letter in capitals, ignoring leading spaces', () => {
    expect(profileInitial('  work')).toBe('W');
    expect(profileInitial('ärger')).toBe('Ä');
  });
  it('takes a whole emoji, not half of it, and has a fallback for an empty name', () => {
    expect(profileInitial('🏠 Home')).toBe('🏠');
    expect(profileInitial('   ')).toBe('?');
  });
});

describe('normalizeProfiles', () => {
  it('uses the default profile for anything that is not a list', () => {
    for (const raw of [null, undefined, 'x', 5, [], {}]) {
      expect(normalizeProfiles(raw, NOW)).toEqual(defaultProfilesState(NOW));
    }
  });

  it('repairs damaged entries one by one and keeps the good ones', () => {
    const result = normalizeProfiles({
      activeId: 'work',
      profiles: [
        { id: 'work', name: '  Work  ', color: 'not-a-colour', updatedAt: 'nope' },
        { id: 'work', name: 'Duplicate id', color: '#ff0000' },
        { id: 'bad id!', name: 'Bad id', color: '#ff0000' },
        { id: 'noname', name: '   ', color: '#ff0000' },
        null,
        { id: 'home', name: 'Home', color: '#ff0000', updatedAt: EARLIER },
      ],
    }, NOW);
    expect(result.profiles).toEqual([
      { id: 'work', name: 'Work', color: PROFILE_COLORS[0].value, updatedAt: NOW },
      { id: 'home', name: 'Home', color: '#ff0000', updatedAt: EARLIER },
    ]);
    expect(result.activeId).toBe('work');
  });

  it('falls back to the first profile when the active one is gone', () => {
    const result = normalizeProfiles({ activeId: 'deleted', profiles: [{ id: 'a', name: 'A', color: '#ff0000' }] }, NOW);
    expect(result.activeId).toBe('a');
  });

  it('never drops profiles that already exist because there are many', () => {
    const many = Array.from({ length: MAX_PROFILES + 3 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, color: '#ff0000' }));
    expect(normalizeProfiles({ activeId: 'p0', profiles: many }, NOW).profiles).toHaveLength(MAX_PROFILES + 3);
  });
});

describe('loadProfiles', () => {
  it('returns the default profile when nothing is saved, without writing anything', () => {
    const storage = new FakeStorage();
    expect(loadProfiles(storage).profiles).toHaveLength(1);
    expect(storage.data.size).toBe(0);
  });

  it('keeps a copy of a damaged list before falling back', () => {
    const storage = new FakeStorage();
    storage.data.set(PROFILES_KEY, '{"profiles": [');
    expect(loadProfiles(storage).activeId).toBe(DEFAULT_PROFILE_ID);
    expect(storage.data.get(PROFILES_CORRUPT_KEY)).toBe('{"profiles": [');
  });

  it('does not throw when the storage itself fails', () => {
    const broken: KeyValueStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
    expect(loadProfiles(broken).activeId).toBe(DEFAULT_PROFILE_ID);
  });
});

describe('nameProblem', () => {
  const list = [profile('a', 'Work'), profile('b', 'Home')];
  it('accepts a normal name', () => expect(nameProblem('Side project', list)).toBeNull());
  it('refuses empty and blank names', () => {
    expect(nameProblem('', list)).not.toBeNull();
    expect(nameProblem('   ', list)).not.toBeNull();
  });
  it('refuses a name one character over the limit and accepts exactly the limit', () => {
    expect(nameProblem('x'.repeat(MAX_PROFILE_NAME), list)).toBeNull();
    expect(nameProblem('x'.repeat(MAX_PROFILE_NAME + 1), list)).not.toBeNull();
  });
  it('refuses a duplicate regardless of case and spacing, but not the profile\'s own name', () => {
    expect(nameProblem('  work ', list)).not.toBeNull();
    expect(nameProblem('Wo  rk', list)).toBeNull();
    expect(nameProblem('WORK', list, 'a')).toBeNull();
  });
});

describe('adding, renaming and removing', () => {
  it('adds a profile at the end', () => {
    const result = addProfileTo(defaultProfilesState(NOW), { id: 'w1', name: ' Work ', color: '#ef4444' }, LATER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.profiles.map((p) => p.name)).toEqual(['Personal', 'Work']);
    expect(result.profile.updatedAt).toBe(LATER);
  });

  it('stops at the limit: the profile that would be one too many is refused', () => {
    let state = defaultProfilesState(NOW);
    for (let i = 1; i < MAX_PROFILES; i++) {
      const added = addProfileTo(state, { id: `p${i}`, name: `P${i}`, color: '#ef4444' }, NOW);
      expect(added.ok).toBe(true);
      if (added.ok) state = added.state;
    }
    expect(state.profiles).toHaveLength(MAX_PROFILES);
    const over = addProfileTo(state, { id: 'extra', name: 'Extra', color: '#ef4444' }, NOW);
    expect(over.ok).toBe(false);
  });

  it('refuses a duplicate name, a reused id and a bad id', () => {
    const state = defaultProfilesState(NOW);
    expect(addProfileTo(state, { id: 'n', name: 'personal', color: '#ef4444' }, NOW).ok).toBe(false);
    expect(addProfileTo(state, { id: DEFAULT_PROFILE_ID, name: 'Other', color: '#ef4444' }, NOW).ok).toBe(false);
    expect(addProfileTo(state, { id: 'a/b', name: 'Other', color: '#ef4444' }, NOW).ok).toBe(false);
  });

  it('replaces a bad colour with the first one instead of storing it', () => {
    const result = addProfileTo(defaultProfilesState(NOW), { id: 'w', name: 'Work', color: 'red' }, NOW);
    expect(result.ok && result.profile.color).toBe(PROFILE_COLORS[0].value);
  });

  it('renames and stamps the change; an unchanged update is a no-op (same state object, same time)', () => {
    const state = stateOf(profile('a', 'Work', NOW));
    const renamed = updateProfileIn(state, 'a', { name: 'Job' }, LATER);
    expect(renamed.ok && renamed.profile).toMatchObject({ name: 'Job', updatedAt: LATER });
    const same = updateProfileIn(state, 'a', { name: 'Work', color: '#10b981' }, LATER);
    expect(same.ok && same.state).toBe(state);
  });

  it('refuses to rename a missing profile or to a taken name', () => {
    const state = stateOf(profile('a', 'Work'), profile('b', 'Home'));
    expect(updateProfileIn(state, 'zzz', { name: 'X' }, NOW).ok).toBe(false);
    expect(updateProfileIn(state, 'a', { name: 'home' }, NOW).ok).toBe(false);
    expect(updateProfileIn(state, 'a', { color: 'blue' }, NOW).ok).toBe(false);
  });

  it('never removes the last profile', () => {
    expect(removeProfileFrom(stateOf(profile('a', 'Work')), 'a').ok).toBe(false);
  });

  it('moves the active profile to another one when it is removed', () => {
    const state: ProfilesState = { activeId: 'b', profiles: [profile('a', 'Work'), profile('b', 'Home')] };
    const result = removeProfileFrom(state, 'b');
    expect(result.ok && result.state).toEqual({ activeId: 'a', profiles: [profile('a', 'Work')] });
    expect(removeProfileFrom(state, 'nope').ok).toBe(false);
  });
});

describe('saveProfiles and mutateProfiles', () => {
  it('saves and reads back', () => {
    const storage = new FakeStorage();
    expect(saveProfiles(storage, defaultProfilesState(NOW)).ok).toBe(true);
    expect(loadProfiles(storage).profiles[0].name).toBe('Personal');
  });

  it('reports a failed write and a value that does not read back', () => {
    const full = new FakeStorage();
    full.failWrites = true;
    expect(saveProfiles(full, defaultProfilesState(NOW)).ok).toBe(false);
    const garbled = new FakeStorage();
    garbled.garble = true;
    expect(saveProfiles(garbled, defaultProfilesState(NOW)).ok).toBe(false);
  });

  it('applies a change to the list as it is in storage now, so another tab\'s profile is not lost', () => {
    const storage = new FakeStorage();
    // This tab last saw only "Personal"; another tab has since added "Work"
    saveProfiles(storage, { activeId: DEFAULT_PROFILE_ID, profiles: [profile(DEFAULT_PROFILE_ID, 'Personal'), profile('work', 'Work')] });
    const result = mutateProfiles(storage, (fresh) => addProfileTo(fresh, { id: 'home', name: 'Home', color: '#ef4444' }, NOW));
    expect(result.ok).toBe(true);
    expect(loadProfiles(storage).profiles.map((p) => p.name)).toEqual(['Personal', 'Work', 'Home']);
  });

  it('writes nothing when the change is refused', () => {
    const storage = new FakeStorage();
    const result = mutateProfiles(storage, (fresh) => removeProfileFrom(fresh, DEFAULT_PROFILE_ID));
    expect(result.ok).toBe(false);
    expect(storage.data.has(PROFILES_KEY)).toBe(false);
  });

  it('reports a failed save as not done', () => {
    const storage = new FakeStorage();
    storage.failWrites = true;
    const result = mutateProfiles(storage, (fresh) => addProfileTo(fresh, { id: 'w', name: 'Work', color: '#ef4444' }, NOW));
    expect(result.ok).toBe(false);
  });
});

describe('carrySettings and prepareSwitch', () => {
  it('puts the shared settings into the data of the profile being opened and keeps the rest', () => {
    const storage = new FakeStorage();
    storage.data.set(keysFor('work').data, JSON.stringify({ tasks: [{ id: '1' }], themePreference: 'light', rowDensity: 'compact' }));
    expect(carrySettings(storage, 'work', settings).ok).toBe(true);
    expect(JSON.parse(storage.data.get(keysFor('work').data) as string)).toEqual({ tasks: [{ id: '1' }], ...settings });
  });

  it('gives a profile without data a small starting file with just the settings', () => {
    const storage = new FakeStorage();
    expect(carrySettings(storage, 'new', settings).ok).toBe(true);
    expect(JSON.parse(storage.data.get(keysFor('new').data) as string)).toEqual(settings);
  });

  it('leaves damaged data exactly as it is', () => {
    const storage = new FakeStorage();
    storage.data.set(keysFor('work').data, '{broken');
    expect(carrySettings(storage, 'work', settings).ok).toBe(false);
    expect(storage.data.get(keysFor('work').data)).toBe('{broken');
    storage.data.set(keysFor('work').data, '[1,2]');
    expect(carrySettings(storage, 'work', settings).ok).toBe(false);
    expect(storage.data.get(keysFor('work').data)).toBe('[1,2]');
  });

  it('switches: settings carried, then the list says which profile opens next', () => {
    const storage = new FakeStorage();
    saveProfiles(storage, { activeId: DEFAULT_PROFILE_ID, profiles: [profile(DEFAULT_PROFILE_ID, 'Personal'), profile('work', 'Work')] });
    expect(prepareSwitch(storage, 'work', settings).ok).toBe(true);
    expect(loadProfiles(storage).activeId).toBe('work');
    expect(JSON.parse(storage.data.get(keysFor('work').data) as string).themePreference).toBe('dark');
  });

  it('refuses a profile that no longer exists and writes nothing', () => {
    const storage = new FakeStorage();
    saveProfiles(storage, defaultProfilesState(NOW));
    const before = storage.data.get(PROFILES_KEY);
    expect(prepareSwitch(storage, 'ghost', settings).ok).toBe(false);
    expect(storage.data.get(PROFILES_KEY)).toBe(before);
    expect(storage.data.has(keysFor('ghost').data)).toBe(false);
  });

  it('does not report a switch when the list could not be saved', () => {
    const storage = new FakeStorage();
    saveProfiles(storage, { activeId: DEFAULT_PROFILE_ID, profiles: [profile(DEFAULT_PROFILE_ID, 'Personal'), profile('work', 'Work')] });
    storage.failWriteKeys.add(PROFILES_KEY);
    const result = prepareSwitch(storage, 'work', settings);
    expect(result.ok).toBe(false);
    expect(loadProfiles(storage).activeId).toBe(DEFAULT_PROFILE_ID);
  });

  it('still switches when the settings could not be carried over', () => {
    const storage = new FakeStorage();
    saveProfiles(storage, { activeId: DEFAULT_PROFILE_ID, profiles: [profile(DEFAULT_PROFILE_ID, 'Personal'), profile('work', 'Work')] });
    storage.data.set(keysFor('work').data, '{broken');
    expect(prepareSwitch(storage, 'work', settings).ok).toBe(true);
    expect(loadProfiles(storage).activeId).toBe('work');
  });
});

describe('deleteProfileData', () => {
  it('removes every key of that profile and nothing else', () => {
    const storage = new FakeStorage();
    for (const key of Object.values(keysFor('work'))) storage.data.set(key, 'x');
    for (const key of Object.values(keysFor(DEFAULT_PROFILE_ID))) storage.data.set(key, 'keep');
    expect(deleteProfileData(storage, 'work').ok).toBe(true);
    expect([...storage.data.keys()].sort()).toEqual(Object.values(keysFor(DEFAULT_PROFILE_ID)).sort());
  });

  it('reports failure when a key is still there afterwards', () => {
    const storage = new FakeStorage();
    storage.data.set(keysFor('work').data, 'x');
    storage.removeItem = () => { /* silently does nothing */ };
    expect(deleteProfileData(storage, 'work').ok).toBe(false);
  });

  it('still tries the other keys when one removal throws', () => {
    const storage = new FakeStorage();
    for (const key of Object.values(keysFor('work'))) storage.data.set(key, 'x');
    const remove = storage.removeItem.bind(storage);
    storage.removeItem = (key: string) => { if (key === keysFor('work').data) throw new Error('locked'); remove(key); };
    expect(deleteProfileData(storage, 'work').ok).toBe(false);
    expect(storage.data.has(keysFor('work').backup)).toBe(false);
    expect(storage.data.has(keysFor('work').syncMeta)).toBe(false);
  });
});

describe('planLabelSync', () => {
  const cloud = (id: string, name: string, updatedAt: string, color = '#10b981'): CloudProfile => ({ id, name, color, updatedAt });

  it('adds profiles that exist only in the account', () => {
    const plan = planLabelSync([profile('a', 'Personal')], [cloud('w', 'Work', NOW)]);
    expect(plan.create).toEqual([{ id: 'w', name: 'Work', color: '#10b981', updatedAt: NOW }]);
  });

  it('takes the newer name from the account and sends the newer name from this device', () => {
    const plan = planLabelSync(
      [profile('a', 'Old name', EARLIER), profile('b', 'Newer here', LATER)],
      [cloud('a', 'Newer in account', NOW), cloud('b', 'Older there', NOW)],
    );
    expect(plan.applyLocally.map((p) => p.name)).toEqual(['Newer in account']);
    expect(plan.pushToCloud.map((p) => p.name)).toEqual(['Newer here']);
  });

  it('changes nothing when the times are equal, unreadable or the labels already match', () => {
    const plan = planLabelSync(
      [profile('a', 'A', NOW), profile('b', 'B', 'garbage'), profile('c', 'C', EARLIER)],
      [cloud('a', 'Different', NOW), cloud('b', 'Different', NOW), cloud('c', 'C', LATER)],
    );
    expect(plan).toEqual({ create: [], applyLocally: [], pushToCloud: [], skipped: 0 });
  });

  it('leaves a profile that exists only here alone', () => {
    const plan = planLabelSync([profile('a', 'A'), profile('only-here', 'Only here')], [cloud('a', 'A', NOW)]);
    expect(plan.create).toHaveLength(0);
    expect(plan.pushToCloud).toHaveLength(0);
  });

  it('stops creating at the limit and counts what did not fit', () => {
    const local = Array.from({ length: MAX_PROFILES - 1 }, (_, i) => profile(`l${i}`, `L${i}`));
    const plan = planLabelSync(local, [cloud('x1', 'X1', NOW), cloud('x2', 'X2', NOW), cloud('x3', 'X3', NOW)]);
    expect(plan.create).toHaveLength(1);
    expect(plan.skipped).toBe(2);
  });

  it('ignores damaged cloud entries', () => {
    const plan = planLabelSync([profile('a', 'A')], [cloud('bad id!', 'X', NOW), cloud('ok', '', NOW), cloud('ok2', 'Name', NOW, 'red')]);
    expect(plan.create).toHaveLength(0);
  });

  it('keeps both when an account profile has the same name as a different local one', () => {
    const plan = planLabelSync([profile('a', 'Work')], [cloud('z', 'work', NOW)]);
    expect(plan.create[0].name).toBe('work (2)');
  });
});
