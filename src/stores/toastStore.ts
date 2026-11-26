import { create } from 'zustand';
import { generateId } from '../utils/id.ts';
import type { Toast } from '../types/index.ts';

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  // Convenience methods for common toast types
  showSuccess: (title: string, description?: string, duration?: number) => void;
  showError: (title: string, description?: string, duration?: number) => void;
  showWarning: (title: string, description?: string, duration?: number) => void;
  showInfo: (title: string, description?: string, duration?: number) => void;
  /** A toast with an "Undo" button. Pressing it runs `onUndo` once and closes the toast. */
  showUndo: (title: string, description: string, onUndo: () => void, duration?: number) => void;
  /** Presses the newest visible "Undo" button (Ctrl/Cmd+Z). Returns false when there is nothing to undo. */
  undoLatest: () => boolean;
}

// How long messages stay at the "Normal" setting (Settings > Appearance can make them longer, or keep them until closed).
// 6 seconds was too short for someone who reads slowly, so: 8 seconds, errors 10, and 15 for a message with an Undo
// button, because Undo is the one a person must not miss.
export const DEFAULT_DURATION = 8000;
export const ERROR_DURATION = 10000;
export const UNDO_DURATION = 15000;

export const useToastStore = create<ToastStore>()((set, get) => ({
  toasts: [],

  addToast: (toastData) => {
    const toast: Toast = {
      id: generateId(),
      createdAt: new Date(),
      duration: toastData.duration ?? (toastData.variant === 'error' ? ERROR_DURATION : DEFAULT_DURATION),
      ...toastData,
    };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  clearAllToasts: () => {
    set({ toasts: [] });
  },

  // Convenience methods
  showSuccess: (title, description, duration) => {
    get().addToast({
      title,
      description,
      variant: 'success',
      duration: duration ?? DEFAULT_DURATION,
    });
  },

  showError: (title, description, duration) => {
    get().addToast({
      title,
      description,
      variant: 'error',
      duration: duration ?? ERROR_DURATION,
    });
  },

  showWarning: (title, description, duration) => {
    get().addToast({
      title,
      description,
      variant: 'warning',
      duration: duration ?? DEFAULT_DURATION,
    });
  },

  showInfo: (title, description, duration) => {
    get().addToast({
      title,
      description,
      variant: 'info',
      duration: duration ?? DEFAULT_DURATION,
    });
  },

  showUndo: (title, description, onUndo, duration) => {
    const id = generateId();
    let used = false;
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id,
          createdAt: new Date(),
          title,
          description,
          variant: 'info',
          duration: duration ?? UNDO_DURATION,
          action: {
            label: 'Undo',
            // A double click must not run the undo twice
            onClick: () => {
              if (used) return;
              used = true;
              get().removeToast(id);
              onUndo();
            },
          },
        },
      ],
    }));
  },

  /**
   * Robustness / pitfalls guarded against:
   * - Nothing to undo (the Undo message already closed): returns false and changes nothing, so the key
   *   press can fall through to the browser.
   * - Pressed twice quickly: the button's own once-only guard in `showUndo` makes the second press a
   *   no-op, and the toast is removed with the first.
   * - Only a toast whose button is labelled "Undo" counts, so another kind of toast action is never run.
   * - The newest undo wins, matching the order a person expects from Ctrl+Z.
   */
  undoLatest: () => {
    const latest = [...get().toasts].reverse().find((toast) => toast.action?.label === 'Undo');
    if (!latest?.action) return false;
    latest.action.onClick();
    return true;
  },
}));
