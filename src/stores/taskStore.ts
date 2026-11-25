import { create } from 'zustand';
import { startOfDay } from 'date-fns';
import { saveToStorage } from '../utils/storage.ts';
import { createWriteScheduler } from '../utils/writeScheduler.ts';
import type { StoreContext, TaskStore } from './task/types.ts';
import { loadInitialState, toPersistedState } from './task/initialState.ts';
import { createTaskActions } from './task/taskActions.ts';
import { createTaskQueries } from './task/taskQueries.ts';
import { createListActions } from './task/listActions.ts';
import { createCategoryActions } from './task/categoryActions.ts';
import { createPresetActions } from './task/presetActions.ts';
import { createViewActions } from './task/viewActions.ts';
import { createBackupActions } from './task/backupActions.ts';

/**
 * The one store for everything the app keeps. The actions are written in the files of ./task, one per area:
 * tasks, task queries, lists and groups, tags, time presets, view and appearance, backups.
 * This file only loads the saved state, decides when saving happens, and joins the groups together.
 */
export const useTaskStore = create<TaskStore>()((set, get) => {
  const { initialState, myDayChangedOnLoad } = loadInitialState();

  // After "remove all data" or an undone import the page reloads from storage; until then nothing may be saved,
  // or the old data in memory would be written straight back.
  let persistenceFrozen = false;

  // Saves are collected: a burst of changes becomes one write (see utils/writeScheduler.ts). The frozen check is
  // repeated when the write runs, so a save requested before a freeze can never run after it.
  const writer = createWriteScheduler(() => {
    if (persistenceFrozen) return;
    saveToStorage(toPersistedState(get()));
  });

  // Save to storage soon after state changes
  const saveState = () => {
    if (persistenceFrozen) return;
    writer.schedule();
  };

  // Stop saving for good (until the page reloads) and drop any write still waiting
  const freezePersistence = () => {
    persistenceFrozen = true;
    writer.cancel();
  };

  const context: StoreContext = {
    set,
    get,
    saveState,
    flushWrites: () => writer.flush(),
    freezePersistence,
    toPersistedState,
  };

  const store = {
    ...initialState,
    ...createTaskActions(context),
    ...createTaskQueries(context),
    ...createListActions(context),
    ...createCategoryActions(context),
    ...createPresetActions(context),
    ...createViewActions(context),
    ...createBackupActions(context),
  };

  // Process repeating tasks on store initialization, then again whenever the calendar day changes
  // while the app stays open (checked once a minute; the pass is a no-op when nothing is due).
  setTimeout(() => {
    store.processRepeatingTasks();
    if (myDayChangedOnLoad) saveState(); // Persist the My Day reset that was applied while loading
  }, 0);

  if (typeof window !== 'undefined') {
    // A waiting save must not be lost when the tab is closed, hidden, or sent to the background on a phone
    window.addEventListener('pagehide', () => writer.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') writer.flush();
    });

    let lastProcessedDay = startOfDay(new Date()).getTime();
    const processDayChange = () => {
      const currentDay = startOfDay(new Date()).getTime();
      if (currentDay !== lastProcessedDay) {
        lastProcessedDay = currentDay;
        store.processRepeatingTasks();
        store.rolloverMyDay();
      }
    };
    window.setInterval(processDayChange, 60_000);
    // Timers are throttled or frozen while the tab is hidden or the phone is asleep, so also check
    // the moment the app comes back, otherwise yesterday's My Day would show until the next tick.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') processDayChange();
    });
  }

  return store;
});
