import { useEffect, useState, useRef } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../utils/cn.ts';
import type { Toast } from '../../types/index.ts';
import { useDisplayPrefsStore } from '../../stores/displayPrefsStore.ts';
import { messageDuration } from '../../utils/displayPrefs.ts';
import { useModalOpen } from '../../hooks/useModalOpen.ts';

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
  // "How long messages stay" in Settings: normal, 30 seconds, or until the person closes them
  const messageTime = useDisplayPrefsStore((state) => state.messageTime);
  const effectiveDuration = messageDuration(toast.duration, messageTime);

  // A message with a button (Undo) is frozen while a dialog is open: behind the dialog it could not be seen, yet a screen
  // reader or the keyboard could still reach the button and change the data under the dialog. It is switched off
  // (`inert`: not clickable, not focusable, not read out), dimmed, and its countdown waits, so the Undo is still there
  // when the dialog closes. Plain messages stay as they are, so a dialog can still tell you "Saved".
  const modalOpen = useModalOpen();
  const frozen = modalOpen && !!toast.action;
  const frozenRef = useRef(false);
  useEffect(() => {
    frozenRef.current = frozen;
  }, [frozen]);

  // Auto-dismiss functionality with visual progress
  useEffect(() => {
    if (!effectiveDuration) return;

    const startTime = Date.now();
    const duration = effectiveDuration;
    let pausedTime = 0;
    let animationFrame: number;
    let lastPauseStart = 0;

    const updateProgress = () => {
      const currentTime = Date.now();
      
      // If paused, track pause time but don't update progress
      if (isPausedRef.current || frozenRef.current) {
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
  }, [toast.id, effectiveDuration, toast.title, onClose]);

  // The countdown holds while the message is pointed at, touched (a phone has no hover, so a finger held on the
  // message pauses it) or has keyboard focus, and goes on when that stops.
  const pause = () => {
    isPausedRef.current = true;
  };
  const resume = () => {
    isPausedRef.current = false;
  };
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    // Focus moving to the Undo or close button inside the message is not leaving it
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) resume();
  };

  return (
    <div
      className={cn(
        // Opaque card, one soft shadow, a short fade in (instant with reduced motion, see index.css)
        // Wraps: with large text the Undo button drops under the words instead of pushing the close button off the card
        'relative flex w-full max-w-sm flex-wrap items-start gap-x-3 gap-y-2 rounded-[10px] border p-4 pr-12 shadow-lg overflow-hidden',
        'animate-toast-in',
        frozen && 'opacity-60',
        variant.bgColor,
        variant.borderColor
      )}
      role="status"
      inert={frozen}
      data-frozen={frozen ? 'true' : undefined}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onTouchStart={pause}
      onTouchEnd={resume}
      onTouchCancel={resume}
      onFocus={pause}
      onBlur={handleBlur}
    >
      {/* Icon */}
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', variant.iconColor)} aria-hidden="true" />
      
      {/* Content */}
      <div className="min-w-[7rem] flex-1 basis-0 space-y-1">
        <h4 className={cn('text-base font-medium', variant.titleColor)}>
          {toast.title}
        </h4>
        {toast.description && (
          <p className={cn('text-sm leading-snug', variant.descriptionColor)}>
            {toast.description}
          </p>
        )}
      </div>

      {toast.action && (
        <button
          type="button"
          onClick={toast.action.onClick}
          className="ml-auto flex-shrink-0 self-center rounded-md px-4 py-2 min-h-11 text-base font-semibold text-accent hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
        >
          {toast.action.label}
        </button>
      )}
      
      {/* Close button */}
      <button
        onClick={() => onClose(toast.id)}
        className={cn(
          // In the top right corner whatever the text size. 36px to see; .hit-area makes it 32px (mouse) or 44px (touch) to hit
          'hit-area absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-md transition-colors',
          'hover:bg-hover',
          'focus:outline-none focus:ring-2 focus:ring-accent'
        )}
        aria-label="Close notification"
      >
        <X className="h-5 w-5 text-muted" aria-hidden="true" />
      </button>
      
      {/* Progress bar (only for a toast that closes by itself: a duration of 0 stays until it is closed, and must not print "0") */}
      {!!effectiveDuration && (
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
