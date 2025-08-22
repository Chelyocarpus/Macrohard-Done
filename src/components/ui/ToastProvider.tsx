import { useToastStore } from '../../stores/toastStore.ts';
import { ToastContainer } from './Toast.tsx';

export function ToastProvider() {
  const { toasts, removeToast } = useToastStore();

  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}
