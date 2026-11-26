import { useToastStore } from '../../stores/toastStore.ts';
import { useTaskStore } from '../../stores/taskStore.ts';
import { useUiStore } from '../../stores/uiStore.ts';
import { useLayoutMode } from '../../hooks/useMediaQuery.ts';
import { contentInsets, toastBottom } from '../../utils/layout.ts';
import { ToastContainer } from './Toast.tsx';

/**
 * Messages sit at the bottom left of the page content: to the right of the sidebar on larger screens
 * (260px wide, 64px as icons) and at the left edge on phones, always above the "Add a task" bar
 * so neither covers the other. While the task details are a bottom sheet on a phone, they sit just above the
 * sheet's buttons (Duplicate, Pin, Complete, Move, Done) instead of covering them.
 */
export function ToastProvider() {
  const { toasts, removeToast } = useToastStore();
  const sidebarCollapsed = useTaskStore((state) => state.sidebarCollapsed);
  const layout = useLayoutMode();
  const sheetFooterHeight = useUiStore((state) => state.bottomSheetFooterHeight);

  // Left edge of the page content, plus a little space
  const left = `calc(${contentInsets(layout, sidebarCollapsed, false).left}px + 1rem)`;

  return (
    <ToastContainer
      toasts={toasts}
      onClose={removeToast}
      className="max-w-[calc(100vw-2rem)] w-96"
      style={{ left, bottom: toastBottom(sheetFooterHeight) }}
    />
  );
}
