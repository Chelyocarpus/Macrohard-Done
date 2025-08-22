import { create } from 'zustand';
import type { Toast } from '../types/index.ts';
import { generateId } from '../utils/storage.ts';

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
}

const DEFAULT_DURATION = 5000; // 5 seconds
const ERROR_DURATION = 7000; // 7 seconds for errors

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
}));
