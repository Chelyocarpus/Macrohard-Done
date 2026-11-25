import type { AppState } from '../../types/index.ts';
import { STORAGE_KEYS } from '../../utils/storage.ts';
import { isDarkFor } from '../../utils/theme.ts';
import { clearAllStoredData, commitReplacement, createBackup, restoreBackup, type BackupData, type CommitResult } from '../../utils/backup.ts';
import { rollOverMyDay, defaultLists, prefersDarkTheme } from './helpers.ts';
import type { StoreContext, TaskStore } from './types.ts';

/** Backup, import, restore and "remove all data". These read and write storage directly. */
export const createBackupActions = ({ set, get, flushWrites, freezePersistence, toPersistedState }: StoreContext): Pick<TaskStore, 'exportBackup' | 'importBackup' | 'restorePreviousData' | 'hasPreviousData' | 'removeAllData'> => ({
  exportBackup: () => {
    const state = get();
    return createBackup({
      tasks: state.tasks,
      lists: state.lists,
      listGroups: state.listGroups,
      categories: state.categories,
      customTimePresets: state.customTimePresets,
      disabledBuiltInPresets: state.disabledBuiltInPresets,
      themePreference: state.themePreference,
      rowDensity: state.rowDensity,
      sidebarCollapsed: state.sidebarCollapsed,
    });
  },

  /**
   * Replaces everything with the (already checked) data of a backup.
   *
   * Robustness / pitfalls guarded against:
   * - Nothing in memory changes unless the data reached storage ('ok') or may have ('unknown'). On 'failed' the
   *   app keeps showing, and keeps saving, exactly what it had.
   * - A save still waiting (saves are delayed a moment) is written first, so the undo copy has the latest edits.
   * - The old data is copied aside first and the new data is written in ONE storage write
   *   (see `commitReplacement`), so a crash or a full disk can't leave half of each.
   * - 'unknown' (the write could not be confirmed) still shows the imported data, because that is what the
   *   person asked for and what a later save will write; the caller must tell them the outcome is not certain.
   * - My Day is rolled over to today's date on the way in, like on a normal start, so an old backup can't bring
   *   yesterday's My Day back.
   * - The view is reset to My Day (or stays on Settings, where the result is shown) with no selected list or tag,
   *   because ids in the old view may not exist any more.
   */
  importBackup: (data: BackupData, options: { saveUndoCopy?: boolean } = {}): CommitResult => {
    // The "undo import" copy is taken from storage, so any waiting save must reach it first
    flushWrites();
    const current = get();
    const themePreference = data.settings?.themePreference ?? current.themePreference;
    const next: Partial<AppState> = {
      tasks: rollOverMyDay(data.tasks),
      lists: [...data.lists, ...defaultLists],
      listGroups: data.listGroups,
      categories: data.categories,
      customTimePresets: data.customTimePresets,
      disabledBuiltInPresets: data.disabledBuiltInPresets,
      themePreference,
      darkMode: isDarkFor(themePreference, prefersDarkTheme()),
      rowDensity: data.settings?.rowDensity ?? current.rowDensity,
      sidebarCollapsed: data.settings?.sidebarCollapsed ?? current.sidebarCollapsed,
      // Stay on Settings (where the result is shown); anywhere else start from My Day
      currentView: current.currentView === 'settings' ? 'settings' : 'my-day',
      currentListId: undefined,
      currentCategoryId: undefined,
      searchQuery: '',
    };
    const payload = JSON.stringify(toPersistedState({ ...current, ...next } as AppState));
    const result = commitReplacement(localStorage, STORAGE_KEYS, payload, { saveUndoCopy: options.saveUndoCopy });
    if (result.status !== 'failed') set(next);
    return result;
  },

  /**
   * Robustness / pitfalls guarded against:
   * - Saving is frozen only once the earlier data is safely back in storage, so a failed restore leaves the
   *   app working normally.
   * - The page is reloaded by the caller so the whole app starts from what is in storage, instead of
   *   patching memory by hand.
   */
  restorePreviousData: (): CommitResult => {
    const result = restoreBackup(localStorage, STORAGE_KEYS);
    if (result.status !== 'failed') freezePersistence();
    return result;
  },

  hasPreviousData: () => {
    try {
      return localStorage.getItem(STORAGE_KEYS.backup) !== null;
    } catch {
      return false;
    }
  },

  /**
   * Robustness / pitfalls guarded against:
   * - Nothing is frozen or cleared in memory unless storage was really emptied (`clearAllStoredData` reads every
   *   key back), so "removed" is never reported while data is still there.
   * - Saving is frozen right after, so no stray action can write the old data back before the reload.
   * - The undo copy and the corrupt-data copy are removed too: "remove all data" means all of it.
   */
  removeAllData: (): CommitResult => {
    const result = clearAllStoredData(localStorage, STORAGE_KEYS);
    if (result.status === 'ok') freezePersistence();
    return result;
  },
});
