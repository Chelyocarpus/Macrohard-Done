import { create } from 'zustand';

/** A picker the task details can open straight away (D, R and Ctrl+Shift+M open these). */
export type DetailPanel = 'due' | 'reminder' | 'list';

interface UiState {
  /** The task the keyboard acts on. Not saved: it only makes sense for the screen that is showing. */
  selectedTaskId: string | null;
  /** The task whose details panel is open, and which picker to show first. */
  openTask: { id: string; panel?: DetailPanel } | null;
  helpOpen: boolean;
  /** The "Profiles" dialog (add, rename, recolour, delete) */
  profilesOpen: boolean;
  /** How many permanent details panes (wide screens) are showing. Switching tasks swaps one for another, so a
   *  count (not a true/false flag) keeps the page from briefly closing and re-opening the space for it. */
  detailPaneCount: number;
  /** Height in px of the footer (Duplicate, Pin, Complete, Move, Done) of the task details when they are a bottom sheet
   *  on a phone, else 0. Messages sit above it instead of covering it. */
  bottomSheetFooterHeight: number;
  /** Show only tasks with this tag (a category id) in the current view; cleared when the view changes */
  tagFilter: string | null;
  /** Tasks ticked for a bulk action (Ctrl+click, Shift+click or arrow, X, Ctrl+A). Not saved. Separate from the one
   *  selected row, which is where the keyboard cursor is. While there are any, a click on a row ticks it. */
  checkedTaskIds: string[];
  /** Where a Shift+arrow range starts; null when no range is being extended */
  rangeAnchorId: string | null;
  toggleChecked: (id: string) => void;
  /** Replaces the ticked tasks. `anchorId` is where a range started (kept for the next Shift+arrow). */
  setChecked: (ids: string[], anchorId?: string | null) => void;
  clearChecked: () => void;
  /** Forgets ticked tasks that are not shown any more (another view, a filter, a deleted task) */
  retainChecked: (shownIds: readonly string[]) => void;
  selectTask: (id: string | null) => void;
  openTaskDetails: (id: string, panel?: DetailPanel) => void;
  /** Closes the panel, but only if it is still the one for `id` (a late close must not shut another task's panel). */
  closeTaskDetails: (id: string) => void;
  setHelpOpen: (open: boolean) => void;
  setProfilesOpen: (open: boolean) => void;
  /** Forget which task's details were open (when the view changes, so they don't pop up again later) */
  clearOpenTask: () => void;
  adjustDetailPaneCount: (delta: 1 | -1) => void;
  setBottomSheetFooterHeight: (height: number) => void;
  setTagFilter: (categoryId: string | null) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  selectedTaskId: null,
  openTask: null,
  helpOpen: false,
  profilesOpen: false,
  detailPaneCount: 0,
  bottomSheetFooterHeight: 0,
  tagFilter: null,
  checkedTaskIds: [],
  rangeAnchorId: null,
  toggleChecked: (id) => set((state) => ({
    checkedTaskIds: state.checkedTaskIds.includes(id) ? state.checkedTaskIds.filter((other) => other !== id) : [...state.checkedTaskIds, id],
    rangeAnchorId: null,
  })),
  setChecked: (ids, anchorId = null) => set((state) => {
    const unique = Array.from(new Set(ids));
    const same = unique.length === state.checkedTaskIds.length && unique.every((id, index) => id === state.checkedTaskIds[index]);
    return same && state.rangeAnchorId === anchorId ? state : { checkedTaskIds: unique, rangeAnchorId: anchorId };
  }),
  clearChecked: () => set((state) => (state.checkedTaskIds.length === 0 && state.rangeAnchorId === null ? state : { checkedTaskIds: [], rangeAnchorId: null })),
  retainChecked: (shownIds) => set((state) => {
    if (state.checkedTaskIds.length === 0) return state;
    const shown = new Set(shownIds);
    const kept = state.checkedTaskIds.filter((id) => shown.has(id));
    return kept.length === state.checkedTaskIds.length ? state : { checkedTaskIds: kept, rangeAnchorId: kept.length > 0 ? state.rangeAnchorId : null };
  }),
  selectTask: (id) => set((state) => (state.selectedTaskId === id ? state : { selectedTaskId: id })),
  openTaskDetails: (id, panel) => set({ selectedTaskId: id, openTask: { id, panel } }),
  closeTaskDetails: (id) => set((state) => (state.openTask?.id === id ? { openTask: null } : state)),
  setHelpOpen: (open) => set({ helpOpen: open }),
  setProfilesOpen: (open) => set({ profilesOpen: open }),
  clearOpenTask: () => set((state) => (state.openTask ? { openTask: null } : state)),
  adjustDetailPaneCount: (delta) => set((state) => ({ detailPaneCount: Math.max(0, state.detailPaneCount + delta) })),
  setBottomSheetFooterHeight: (height) => set((state) => {
    const next = Number.isFinite(height) && height > 0 ? Math.round(height) : 0;
    return state.bottomSheetFooterHeight === next ? state : { bottomSheetFooterHeight: next };
  }),
  setTagFilter: (categoryId) => set((state) => (state.tagFilter === categoryId ? state : { tagFilter: categoryId })),
}));
