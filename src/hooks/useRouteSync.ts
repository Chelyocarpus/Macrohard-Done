import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useTaskStore } from '../stores/taskStore.ts';
import { layerDepth, withLayerDepth } from '../utils/backStack.ts';
import { hashToRoute, isRouteHash, resolveRoute, routeFromState, routeToHash, sameRoute, type Route } from '../utils/routes.ts';

interface RouteSyncOptions {
  /** Phone layout: the Lists screen is a place of its own, with the empty address */
  isMobile: boolean;
  phoneShowsLists: boolean;
  setPhoneShowsLists: (show: boolean) => void;
}

const baseUrl = () => window.location.pathname + window.location.search;

function showRoute(route: Route) {
  useTaskStore.getState().setView(route.view, route.listId, route.categoryId);
}

/**
 * Keeps the browser's address and history in step with where you are in the app, in both directions.
 *
 * - Moving to another list, tag or view adds a history entry (`#/list/<id>`), so Back and Forward walk through the
 *   places you visited, a phone's back gesture goes from a list to the Lists screen instead of leaving the app, and a
 *   reload or a shared link opens the same place.
 * - On a phone the Lists screen is a place too (the empty address), so Back from a list returns to it.
 *
 * Robustness / pitfalls guarded against:
 * - Back and Forward change the address first; the store follows. The write below compares the wanted address with the
 *   real one, so a place reached by Back is never pushed again (no loops, no doubled entries).
 * - A link to a list or tag that does not exist (deleted, or from another profile) is ignored at start-up (the app opens
 *   where it normally would) and falls back to My Day when it is reached later; a place that disappears while it is
 *   open (its list is deleted) also moves to My Day, replacing its entry rather than adding one.
 * - The first address, a change of layout (rotating a phone) and a place that no longer exists replace the current
 *   entry instead of adding one, so none of them costs a Back press.
 * - A panel's history entry (see utils/backStack.ts) sitting on top when the place changes is replaced by the new place,
 *   not left behind as an entry that does nothing.
 * - Someone else's use of the hash (a sign-in redirect) is left alone at start-up; only `#/...` is ours.
 * - The Lists screen's "back" arrow uses real Back when that is where you came from, so going to a list and back does
 *   not pile up entries.
 */
export function useRouteSync({ isMobile, phoneShowsLists, setPhoneShowsLists }: RouteSyncOptions): { goToLists: () => void } {
  const currentView = useTaskStore((state) => state.currentView);
  const currentListId = useTaskStore((state) => state.currentListId);
  const currentCategoryId = useTaskStore((state) => state.currentCategoryId);
  const lists = useTaskStore((state) => state.lists);
  const categories = useTaskStore((state) => state.categories);

  const route = routeFromState({ currentView, currentListId, currentCategoryId });
  const desiredHash = isMobile && phoneShowsLists ? '' : routeToHash(route);

  // The latest values for the listener that is added once
  const latest = useRef({ isMobile, setPhoneShowsLists });
  useEffect(() => {
    latest.current = { isMobile, setPhoneShowsLists };
  });

  // At start-up: open the place the address names (before the first paint, so the saved place never flashes).
  // Until the page has been drawn with that place, the first render's own idea of the address (the saved place) is stale
  // and must not be written over it.
  const startRoutePending = useRef(false);
  useLayoutEffect(() => {
    const wanted = hashToRoute(window.location.hash);
    if (!wanted) return;
    const state = useTaskStore.getState();
    if (!sameRoute(resolveRoute(wanted, state), wanted)) return; // points at something that is gone: open as usual
    startRoutePending.current = true;
    if (!sameRoute(wanted, routeFromState(state))) showRoute(wanted);
    setPhoneShowsLists(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, at start
  }, []);

  // The store to the address
  const started = useRef(false);
  const lastIsMobile = useRef(isMobile);
  const replaceNext = useRef(false);
  useEffect(() => {
    const current = window.location.hash;
    if (startRoutePending.current) {
      if (current !== desiredHash) return; // still the first render's stale value
      startRoutePending.current = false;
    }

    const first = !started.current;
    started.current = true;
    const layoutChanged = lastIsMobile.current !== isMobile;
    lastIsMobile.current = isMobile;

    if (current === desiredHash) return;
    if (first && current !== '' && !isRouteHash(current)) return; // not ours (a sign-in redirect): leave it

    const state = window.history.state;
    const url = baseUrl() + desiredHash;
    // A panel's entry is replaced by the new place; the panel closes with the change
    if (first || layoutChanged || replaceNext.current || layerDepth(state) > 0) {
      window.history.replaceState(layerDepth(state) > 0 ? withLayerDepth(state, 0) : state, '', url);
    } else {
      window.history.pushState({ layers: 0, fromHome: isMobile && current === '' }, '', url);
    }
    replaceNext.current = false;
  }, [desiredHash, isMobile]);

  // A place that is gone (its list was deleted): move to My Day, in place of its entry
  useEffect(() => {
    const resolved = resolveRoute(route, { lists, categories });
    if (sameRoute(resolved, route)) return;
    replaceNext.current = true;
    showRoute(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `route` is rebuilt every render; its parts are the dependencies
  }, [currentView, currentListId, currentCategoryId, lists, categories]);

  // The address to the store: Back, Forward, a typed or pasted address
  useEffect(() => {
    const onPopState = () => {
      const hash = window.location.hash;
      const wanted = hashToRoute(hash);
      const { isMobile: mobile, setPhoneShowsLists: setLists } = latest.current;
      if (!wanted) {
        if (hash === '' && mobile) setLists(true); // back to the Lists screen
        else if (isRouteHash(hash)) window.history.replaceState(window.history.state, '', baseUrl() + routeToHash(routeFromState(useTaskStore.getState()))); // `#/nonsense`: stay where we are
        return;
      }
      const state = useTaskStore.getState();
      const resolved = resolveRoute(wanted, state);
      if (!sameRoute(resolved, wanted)) window.history.replaceState(window.history.state, '', baseUrl() + routeToHash(resolved)); // a deleted list: My Day instead
      if (!sameRoute(resolved, routeFromState(state))) showRoute(resolved);
      setLists(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  /** The phone's arrow back to the Lists screen: real Back when we came from there, otherwise a step to it */
  const goToLists = useCallback(() => {
    const state = window.history.state as { fromHome?: boolean } | null;
    if (state?.fromHome) window.history.back();
    else latest.current.setPhoneShowsLists(true);
  }, []);

  return { goToLists };
}
