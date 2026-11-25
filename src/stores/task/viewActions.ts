import type { ViewType, ThemePreference, RowDensity } from '../../types/index.ts';
import { isDarkFor } from '../../utils/theme.ts';
import { prefersDarkTheme } from './helpers.ts';
import type { StoreContext, TaskStore } from './types.ts';

/** View and appearance actions: current view, search words, theme, row density, sidebar, and writing a waiting save. */
export const createViewActions = ({ set, get, saveState, flushWrites }: StoreContext): Pick<TaskStore, 'setView' | 'setSearchQuery' | 'toggleDarkMode' | 'setThemePreference' | 'syncSystemTheme' | 'setRowDensity' | 'toggleSidebar' | 'flushPendingSave'> => ({
  setView: (view: ViewType, listId?: string, categoryId?: string) => {
    set({ 
      currentView: view, 
      currentListId: listId, 
      currentCategoryId: view === 'category' ? categoryId : undefined 
    });
    saveState();
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  // The quick switch: an explicit light or dark choice (the opposite of what is shown)
  toggleDarkMode: () => {
    const dark = !get().darkMode;
    set({ darkMode: dark, themePreference: dark ? 'dark' : 'light' });
    saveState();
  },

  setThemePreference: (preference: ThemePreference) => {
    set({ themePreference: preference, darkMode: isDarkFor(preference, prefersDarkTheme()) });
    saveState();
  },

  syncSystemTheme: () => {
    const { themePreference: current, darkMode: shown } = get();
    if (current !== 'system') return;
    const dark = prefersDarkTheme();
    if (dark !== shown) set({ darkMode: dark });
  },

  setRowDensity: (density: RowDensity) => {
    set({ rowDensity: density });
    saveState();
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
    saveState();
  },

  flushPendingSave: () => flushWrites(),
});
