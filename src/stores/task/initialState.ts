import type { Task, AppState, Category, ThemePreference } from '../../types/index.ts';
import { loadFromStorage } from '../../utils/storage.ts';
import { isDarkFor, resolveThemePreference } from '../../utils/theme.ts';
import { parseRowDensity } from '../../utils/density.ts';
import { deduplicateCategoryIds, normalizeCategoryName, normalizeRepeat, rollOverMyDay, defaultLists, prefersDarkTheme } from './helpers.ts';

/**
 * Reads the saved data and turns it into the state the store starts with (older saves are brought up to date on the way).
 * `myDayChangedOnLoad` is true when My Day was emptied of earlier days, so the caller can save that.
 */
export function loadInitialState(): { initialState: AppState; myDayChangedOnLoad: boolean } {
  // Load initial state from storage
  const savedState = loadFromStorage();

  // Migrate tasks to include order property and pinned properties if not present
  const migratedTasks = savedState?.tasks?.map((task: Partial<Task> & { id: string; title: string; completed: boolean; createdAt: Date; updatedAt: Date; listId: string }, index: number) => ({
    ...task,
    order: task.order !== undefined ? task.order : index,
    pinned: task.pinned !== undefined ? task.pinned : false,
    pinnedGlobally: task.pinnedGlobally !== undefined ? task.pinnedGlobally : false,
    categoryIds: Array.isArray(task.categoryIds) ? deduplicateCategoryIds(task.categoryIds) : [],
    steps: Array.isArray(task.steps) ? task.steps : [],
    repeat: normalizeRepeat(task.repeat),
  } as Task)) || [];

  // Empty My Day of earlier days right away, so stale tasks never flash on the first render.
  // (Persisted by the first save, or by the one-off write after the store is created.)
  const loadedTasks = rollOverMyDay(migratedTasks);
  const myDayChangedOnLoad = loadedTasks !== migratedTasks;

  // Migrate categories to remove near-duplicates
  const migratedCategories = (() => {
    if (!savedState?.categories) return [];
    
    const categories = savedState.categories as Category[];
    const deduplicatedCategories: Category[] = [];
    const seenNormalizedNames = new Set<string>();
    
    for (const category of categories) {
      const normalizedName = normalizeCategoryName(category.name);
      if (!seenNormalizedNames.has(normalizedName)) {
        // Trim the name to clean up any extra whitespace
        deduplicatedCategories.push({
          ...category,
          name: category.name.trim()
        });
        seenNormalizedNames.add(normalizedName);
      }
    }
    
    return deduplicatedCategories;
  })();
  
  // Theme: files saved before the "follow the device" choice existed only have the light/dark they showed, so that
  // is kept as an explicit choice (nobody's theme changes on update); no saved value at all means a first launch.
  const themePreference: ThemePreference = resolveThemePreference(savedState?.themePreference, savedState?.darkMode);

  // Pitfall guarded against: the migrated tasks/categories must be applied AFTER the saved state is
  // spread, otherwise the raw (un-migrated) saved values win and the migration is silently lost.
  const initialState: AppState = {
    lists: defaultLists,
    listGroups: [],
    currentListId: undefined,
    currentCategoryId: undefined,
    sidebarCollapsed: false,
    customTimePresets: [],
    disabledBuiltInPresets: [],
    ...savedState,
    tasks: loadedTasks,
    categories: migratedCategories,
    // A search is not kept between visits: the app opens on a normal view with an empty search box
    searchQuery: '',
    currentView: savedState?.currentView === 'search' || savedState?.currentView === 'settings' ? 'my-day' : (savedState?.currentView ?? 'my-day'),
    themePreference,
    darkMode: isDarkFor(themePreference, prefersDarkTheme()),
    rowDensity: parseRowDensity(savedState?.rowDensity),
  };

  return { initialState, myDayChangedOnLoad };
}

// What is written to storage. One function, so saving and importing can't drift apart.
export const toPersistedState = (state: AppState): AppState => ({
  tasks: state.tasks,
  lists: state.lists.filter(list => !list.isSystem).concat(defaultLists),
  listGroups: state.listGroups,
  categories: state.categories,
  // The Search and Settings views are not saved as the place to reopen on (the search words are not saved either)
  currentView: state.currentView === 'search' || state.currentView === 'settings' ? 'my-day' : state.currentView,
  currentListId: state.currentListId,
  currentCategoryId: state.currentCategoryId,
  searchQuery: '',
  darkMode: state.darkMode,
  themePreference: state.themePreference,
  rowDensity: state.rowDensity,
  sidebarCollapsed: state.sidebarCollapsed,
  customTimePresets: state.customTimePresets,
  disabledBuiltInPresets: state.disabledBuiltInPresets,
});
