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
    bgColor: 'bg-canvas',
    borderColor: 'border-done/30',
    iconColor: 'text-done',
    titleColor: 'text-ink',
    descriptionColor: 'text-muted',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-canvas',
    borderColor: 'border-overdue/30',
    iconColor: 'text-overdue',
    titleColor: 'text-ink',
    descriptionColor: 'text-overdue',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-canvas',
    borderColor: 'border-important/30',
    iconColor: 'text-important',
    titleColor: 'text-ink',
    descriptionColor: 'text-muted',
  },
  info: {
    icon: Info,
    bgColor: 'bg-canvas',
    borderColor: 'border-accent/30',
    iconColor: 'text-accent',
    titleColor: 'text-ink',
    descriptionColor: 'text-accent',
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
        // Opaque card, one soft shadow, a short fade in (instant with reduced motion, see index.css)
        'relative flex w-full max-w-sm items-start gap-3 rounded-[10px] border p-4 shadow-lg overflow-hidden',
        'animate-toast-in',
        variant.bgColor,
        variant.borderColor
      )}
      role="status"
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

      {toast.action && (
        <button
          type="button"
          onClick={toast.action.onClick}
          className="flex-shrink-0 self-center rounded-md px-3 py-1.5 text-sm font-semibold text-accent hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
        >
          {toast.action.label}
        </button>
      )}
      
      {/* Close button */}
      <button
        onClick={() => onClose(toast.id)}
        className={cn(
          'flex-shrink-0 rounded-md p-1 transition-colors',
          'hover:bg-hover',
          'focus:outline-none focus:ring-2 focus:ring-accent'
        )}
        aria-label="Close notification"
      >
        <X className="h-4 w-4 text-muted" />
      </button>
      
      {/* Progress bar (only for a toast that closes by itself: a duration of 0 stays until it is closed, and must not print "0") */}
      {!!toast.duration && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-hover rounded-b-lg overflow-hidden">
          <div
            className={cn(
              // Scaled with a transform (not width) so the countdown doesn't trigger layout every frame
              'h-full w-full origin-left transition-transform duration-100 ease-linear',
              {
                'bg-done': toast.variant === 'success',
                'bg-overdue': toast.variant === 'error',
                'bg-important': toast.variant === 'warning',
                'bg-accent': toast.variant === 'info',
              }
            )}
            style={{
              transform: `scaleX(${progress / 100})`,
              transition: isPausedRef.current ? 'none' : 'transform 100ms linear'
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
  onClose,
  className,
  style,
}: {
  toasts: Toast[];
  onClose: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Always rendered, even when empty: a live region that appears together with its first message is often not announced
  return (
    <div
      className={cn('fixed z-50 flex flex-col gap-2 pointer-events-none', className)}
      style={style}
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
