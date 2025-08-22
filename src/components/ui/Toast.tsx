import { useEffect, useState, useRef } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../utils/cn.ts';
import type { Toast } from '../../types/index.ts';

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const toastVariants = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400',
    titleColor: 'text-green-900 dark:text-green-100',
    descriptionColor: 'text-green-700 dark:text-green-300',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400',
    titleColor: 'text-red-900 dark:text-red-100',
    descriptionColor: 'text-red-700 dark:text-red-300',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    titleColor: 'text-yellow-900 dark:text-yellow-100',
    descriptionColor: 'text-yellow-700 dark:text-yellow-300',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
    titleColor: 'text-blue-900 dark:text-blue-100',
    descriptionColor: 'text-blue-700 dark:text-blue-300',
  },
};

export function Toast({ toast, onClose }: ToastProps) {
  const variant = toastVariants[toast.variant];
  const Icon = variant.icon;
  const [progress, setProgress] = useState(100);
  const isPausedRef = useRef(false);

  // Auto-dismiss functionality with visual progress
  useEffect(() => {
    if (!toast.duration) return;

    const startTime = Date.now();
    const duration = toast.duration;
    let pausedTime = 0;
    let animationFrame: number;
    let lastPauseStart = 0;

    const updateProgress = () => {
      const currentTime = Date.now();
      
      // If paused, track pause time but don't update progress
      if (isPausedRef.current) {
        if (lastPauseStart === 0) {
          lastPauseStart = currentTime;
        }
        animationFrame = requestAnimationFrame(updateProgress);
        return;
      }
      
      // If we just resumed from pause, add the pause duration
      if (lastPauseStart > 0) {
        pausedTime += currentTime - lastPauseStart;
        lastPauseStart = 0;
      }

      const elapsed = currentTime - startTime - pausedTime;
      const remaining = Math.max(0, duration - elapsed);
      const progressPercent = (remaining / duration) * 100;
      
      setProgress(progressPercent);

      if (remaining > 0) {
        animationFrame = requestAnimationFrame(updateProgress);
      } else {
        onClose(toast.id);
      }
    };

    animationFrame = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [toast.id, toast.duration, toast.title, onClose]);

  const handleMouseEnter = () => {
    isPausedRef.current = true;
  };

  const handleMouseLeave = () => {
    isPausedRef.current = false;
  };

  return (
    <div
      className={cn(
        'relative flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out overflow-hidden',
        'animate-slide-in-from-right',
        variant.bgColor,
        variant.borderColor
      )}
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Icon */}
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', variant.iconColor)} />
      
      {/* Content */}
      <div className="flex-1 space-y-1">
        <h4 className={cn('text-sm font-medium', variant.titleColor)}>
          {toast.title}
        </h4>
        {toast.description && (
          <p className={cn('text-sm', variant.descriptionColor)}>
            {toast.description}
          </p>
        )}
      </div>
      
      {/* Close button */}
      <button
        onClick={() => onClose(toast.id)}
        className={cn(
          'flex-shrink-0 rounded-md p-1 transition-colors',
          'hover:bg-gray-200 dark:hover:bg-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-gray-400'
        )}
        aria-label="Close notification"
      >
        <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </button>
      
      {/* Progress bar */}
      {toast.duration && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-100 ease-linear rounded-b-lg',
              {
                'bg-green-500': toast.variant === 'success',
                'bg-red-500': toast.variant === 'error',
                'bg-yellow-500': toast.variant === 'warning',
                'bg-blue-500': toast.variant === 'info',
              }
            )}
            style={{
              width: `${progress}%`,
              transition: isPausedRef.current ? 'none' : 'width 100ms linear'
            }}
          />
        </div>
      )}
    </div>
  );
}

// Toast container component
export function ToastContainer({ 
  toasts, 
  onClose 
}: { 
  toasts: Toast[]; 
  onClose: (id: string) => void; 
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none`}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}
