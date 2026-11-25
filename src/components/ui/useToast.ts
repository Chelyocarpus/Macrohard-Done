import { useToastStore } from '../../stores/toastStore.ts';

export function useToast() {
  const {
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showUndo,
  } = useToastStore();

  return {
    // Core methods
    toast: addToast,
    dismiss: removeToast,
    dismissAll: clearAllToasts,
    
    // Convenience methods
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    undo: showUndo,
  };
}
