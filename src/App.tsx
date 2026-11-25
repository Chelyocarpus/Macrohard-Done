import { useEffect, useRef, useState } from 'react';
import { useTaskStore } from './stores/taskStore.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { TaskView } from './components/TaskView.tsx';
import { ContextMenuProvider } from './components/ui/ContextMenu.tsx';
import { ToastProvider } from './components/ui/ToastProvider.tsx';
import { DragProvider } from './contexts/DragProvider.tsx';
import { cn } from './utils/cn.ts';
import { useLayoutMode } from './hooks/useMediaQuery.ts';
import { useUiStore } from './stores/uiStore.ts';
import { contentInsets } from './utils/layout.ts';
import { SIDEBAR_SEARCH_ID } from './components/SidebarSearch.tsx';
import { FOCUS_SEARCH_EVENT, useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.ts';
import { ShortcutsHelp } from './components/ShortcutsHelp.tsx';
import { ProfilesDialog } from './components/ProfilesDialog.tsx';
import { useActiveProfile, useProfileStore } from './stores/profileStore.ts';
import { useRouteSync } from './hooks/useRouteSync.ts';
import { routeFromState, routeTitle } from './utils/routes.ts';
import { getVisibleTaskIds, focusTaskRowSoon } from './utils/taskDom.ts';
import { useReminders } from './hooks/useReminders.ts';

const APP_NAME = 'Macrohard Done';

function App() {
  const profileName = useActiveProfile().name;
  const hasSeveralProfiles = useProfileStore((state) => state.profiles.length > 1);

  const darkMode = useTaskStore((state) => state.darkMode);
  const themePreference = useTaskStore((state) => state.themePreference);
  const rowDensity = useTaskStore((state) => state.rowDensity);
  const sidebarCollapsed = useTaskStore((state) => state.sidebarCollapsed);
  // Navigation state: on a phone, choosing a list moves from the Lists screen to the list
  const currentView = useTaskStore((state) => state.currentView);
  const currentListId = useTaskStore((state) => state.currentListId);
  const currentCategoryId = useTaskStore((state) => state.currentCategoryId);
  const lists = useTaskStore((state) => state.lists);
  const categories = useTaskStore((state) => state.categories);
  const layout = useLayoutMode();
  const isMobile = layout === 'narrow';
  const detailPaneOpen = useUiStore((state) => state.detailPaneCount > 0);
  // Phone only: the Lists screen is home. It shows until a list or view is chosen, and "Lists" in the header returns to it.
  const [phoneShowsLists, setPhoneShowsLists] = useState(true);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showAddListModal, setShowAddListModal] = useState(false);

  // The address and the browser's history follow where you are: Back and Forward walk through the places you visited
  // (on a phone, Back from a list is the Lists screen), and reloading or sharing the link opens the same place.
  const { goToLists } = useRouteSync({ isMobile, phoneShowsLists, setPhoneShowsLists });

  // The tab's title names the page ("Groceries · Macrohard Done"), and the profile once there is more than one, so the
  // tab, the window list and the browser's history say where each entry is
  const pageTitle = routeTitle(routeFromState({ currentView, currentListId, currentCategoryId }), { lists, categories });
  useEffect(() => {
    document.title = `${hasSeveralProfiles ? `${profileName} · ` : ''}${pageTitle} · ${APP_NAME}`;
  }, [profileName, hasSeveralProfiles, pageTitle]);

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Let the browser draw native parts (scrollbars, form controls, overscroll) and the
    // installed-app title bar in the matching theme.
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', darkMode ? '#1B1B1F' : '#ffffff'); // the canvas token in each theme
  }, [darkMode]);

  // "Follow the device": switch with the device between light and dark while the app is open
  useEffect(() => {
    if (themePreference !== 'system' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => useTaskStore.getState().syncSystemTheme();
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, [themePreference]);

  // Row height (Settings > Appearance); the stylesheet reads it from the page
  useEffect(() => {
    document.documentElement.dataset.density = rowDensity;
  }, [rowDensity]);

  // Choosing a list or view (also by search or a shortcut) leaves the Lists screen. The first value is the app
  // opening, which must stay on the Lists screen. (Compared by value, not "first run": in development React
  // runs effects twice on start, which would count as a second, real navigation.)
  const navigationKey = `${currentView}|${currentListId ?? ''}|${currentCategoryId ?? ''}`;
  const lastNavigationKey = useRef<string | null>(null);
  useEffect(() => {
    const previous = lastNavigationKey.current;
    lastNavigationKey.current = navigationKey;
    if (previous !== null && previous !== navigationKey) setPhoneShowsLists(false);
  }, [navigationKey]);

  // The details of a task belong to the view they were opened in: forget them when the view changes
  useEffect(() => {
    useUiStore.getState().clearOpenTask();
  }, [currentView, currentListId, currentCategoryId]);

  // Phone: when one screen replaces the other, keyboard and screen reader focus goes with you (to the page's title, or to
  // the open place in the Lists screen). Without this, focus stays on a button that has just been hidden and is lost.
  const previousPhoneShowsLists = useRef(phoneShowsLists);
  useEffect(() => {
    const changed = previousPhoneShowsLists.current !== phoneShowsLists;
    previousPhoneShowsLists.current = phoneShowsLists;
    if (!isMobile || !changed) return;
    const frame = window.requestAnimationFrame(() => {
      const target = phoneShowsLists
        ? document.querySelector<HTMLElement>('aside [aria-current="page"]') ?? document.querySelector<HTMLElement>('aside button')
        : document.getElementById('view-title');
      target?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [phoneShowsLists, isMobile]);

  // For keyboards: skip past the sidebar to the first task (or the page's title when there are none)
  const skipToTasks = () => {
    const [first] = getVisibleTaskIds();
    if (first) {
      useUiStore.getState().selectTask(first);
      focusTaskRowSoon(first, { force: true });
    } else {
      document.getElementById('view-title')?.focus();
    }
  };

  // The keyboard map (N, /, Space, S, M, ...). See utils/hotkeys.ts.
  useKeyboardShortcuts();

  // Alerts at the time of each task's reminder (a message in the app, or a system notification when turned on in Settings)
  useReminders();

  // F and Ctrl+F: put the cursor in the search box (the sidebar's on wide screens, else the Search view's own, which opens first).
  // Phones don't need the menu for this.
  useEffect(() => {
    let timer = 0;
    const onFocusSearch = () => {
      const store = useTaskStore.getState();
      const sidebarBox = document.getElementById(SIDEBAR_SEARCH_ID);
      if (sidebarBox instanceof HTMLInputElement) {
        // Focusing it shows the results of words already in it; with an empty box nothing opens yet
        sidebarBox.focus();
        sidebarBox.select();
        return;
      }
      if (store.currentView !== 'search') store.setView('search');
      window.clearTimeout(timer);
      // The box focuses itself when the view opens (autoFocus); this covers the case where it is already
      // open, and selects the old words so typing replaces them. Short wait: the view must be drawn first.
      timer = window.setTimeout(() => {
        const field = document.getElementById('search-input');
        if (field instanceof HTMLInputElement) {
          field.focus();
          field.select();
        }
      }, 16);
    };
    window.addEventListener(FOCUS_SEARCH_EVENT, onFocusSearch);
    return () => {
      window.removeEventListener(FOCUS_SEARCH_EVENT, onFocusSearch);
      window.clearTimeout(timer);
    };
  }, []);

  const insets = contentInsets(layout, sidebarCollapsed, detailPaneOpen);

  return (
    <DragProvider>
      <ContextMenuProvider>
        {/* h-screen is the fallback; where supported, dvh tracks the visible area as mobile browser bars show or hide.
            (A plain h-dvh class would lose to h-screen: Tailwind emits it earlier in the stylesheet.) */}
        <div className="flex h-screen supports-[height:100dvh]:h-dvh bg-canvas">
          {/* The first stop for Tab: visible only while it has focus */}
          {!isMobile && (
            <button
              type="button"
              onClick={skipToTasks}
              className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-canvas focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-lg focus:ring-2 focus:ring-accent"
            >
              Skip to tasks
            </button>
          )}
          <Sidebar
            showAddGroupModal={showAddGroupModal}
            setShowAddGroupModal={setShowAddGroupModal}
            showAddListModal={showAddListModal}
            setShowAddListModal={setShowAddListModal}
            layout={layout}
            mobileOpen={phoneShowsLists}
            onNavigate={() => setPhoneShowsLists(false)}
          />
          {/* The content leaves room for the sidebar, and on wide screens for the permanent details pane.
              On a phone it is a screen of its own, hidden (not unmounted) while the Lists screen shows. */}
          <main
            className={cn(
              'flex-1 flex flex-col min-w-0 relative transition-[margin] duration-200',
              isMobile && phoneShowsLists && 'hidden'
            )}
            style={{ marginLeft: insets.left, marginRight: insets.right }}
          >
            <TaskView onBack={goToLists} />
          </main>

          {/* Toast notifications */}
          <ToastProvider />

          {/* The "?" list of keyboard shortcuts */}
          <ShortcutsHelp />

          {/* Add, rename, recolour and delete profiles */}
          <ProfilesDialog />
        </div>
      </ContextMenuProvider>
    </DragProvider>
  );
}

export default App;
